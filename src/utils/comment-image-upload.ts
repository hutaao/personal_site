// Compression runs before either inline insertion or cloud upload. The cloud
// endpoint separately validates uploads; client limits alone are not security.
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 300 * 1024;
const MAX_EDGE = 1600;
const MAX_PIXELS = 24_000_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function toDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败，请重新选择。"));
    reader.readAsDataURL(blob);
  });
}

async function isAnimated(file: File): Promise<boolean> {
  if (file.type === "image/gif") return true;
  const bytes = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  const view = new DataView(bytes.buffer);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (file.type === "image/webp") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      if (tag(offset) === "ANIM") return true;
      const length = view.getUint32(offset + 4, true);
      offset += 8 + length + (length % 2);
    }
  } else if (file.type === "image/png") {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const chunk = tag(offset + 4);
      if (chunk === "acTL") return true;
      if (chunk === "IDAT") return false;
      offset += 12 + view.getUint32(offset);
    }
  }
  return false;
}

export async function prepareCommentImageBlob(file: File): Promise<Blob> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("请选择 JPG、PNG、WebP 或 GIF 图片。暂不支持 SVG。 ");
  if (file.size > MAX_INPUT_BYTES) throw new Error("原图不能超过 5 MB，请先缩小图片。 ");
  if (file.size === 0) throw new Error("图片为空，请重新选择。 ");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("无法读取这张图片，请选择有效的图片文件。 ");
  }
  try {
    if (bitmap.width * bitmap.height > MAX_PIXELS) throw new Error("图片像素过多，请先缩小到 2400 万像素以内。 ");
    const animated = await isAnimated(file);
    const tooWide = Math.max(bitmap.width, bitmap.height) > MAX_EDGE;
    if (!tooWide && file.size <= MAX_OUTPUT_BYTES) return file;
    if (animated) throw new Error("动图请缩小到 300 KB 以内，且长边不超过 1600 像素；不会自动转成静态图。 ");
    let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("浏览器无法处理图片，请先手动缩小。 ");
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of [0.85, 0.72, 0.6]) {
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
          if (blob && blob.size <= MAX_OUTPUT_BYTES) return blob;
        }
        scale *= 0.75;
      }
      throw new Error("压缩后仍超过 300 KB，请裁剪图片或分开发送。 ");
    } finally {
      canvas.width = canvas.height = 0;
    }
  } finally {
    bitmap.close();
  }
}

export async function prepareCommentImage(file: File): Promise<string> {
  return toDataURL(await prepareCommentImageBlob(file));
}

export async function uploadCommentImage(file: File, serverURL: string): Promise<string> {
  const image = await prepareCommentImageBlob(file);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${serverURL.replace(/\/$/, "")}/api/image-upload`, {
      method: "POST", mode: "cors", credentials: "omit",
      headers: { "Content-Type": image.type }, body: image, signal: controller.signal,
    });
    const result: { url?: unknown; error?: unknown } = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof result.error === "string" ? result.error : "图片上传失败，请稍后重试。 ");
    }
    if (typeof result.url !== "string") throw new Error("图片服务未返回有效链接，请稍后重试。 ");
    let url: URL;
    try { url = new URL(result.url); }
    catch { throw new Error("图片服务返回了无效的图片地址。 "); }
    if (url.protocol !== "https:" || !url.hostname.endsWith(".public.blob.vercel-storage.com") || url.username || url.password) {
      throw new Error("图片服务返回了无效的图片地址。 ");
    }
    return url.href;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("图片上传超时，请稍后重试。 ");
    if (error instanceof TypeError) throw new Error("无法连接图片服务，请稍后重试。 ");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
