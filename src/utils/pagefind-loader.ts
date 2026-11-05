import type { Pagefind } from "../global";

type PagefindModule = Pagefind & {
	options: (options: { excerptLength: number }) => Promise<unknown>;
};

export function createPagefindLoader(
	scriptUrl: URL,
	loadModule: (url: string) => Promise<PagefindModule>,
): () => Promise<Pagefind> {
	let loading: Promise<Pagefind> | undefined;
	let attempt = 0;

	return () => {
		if (loading) return loading;

		const url = new URL(scriptUrl);
		// A failed dynamic import can stay cached for the lifetime of the page.
		if (attempt > 0) url.searchParams.set("retry", String(attempt));
		attempt++;
		loading = Promise.resolve()
			.then(() => loadModule(url.href))
			.then(async (pagefind) => {
				await pagefind.options({ excerptLength: 20 });
				return pagefind;
			})
			.catch((error) => {
				loading = undefined;
				throw error;
			});
		return loading;
	};
}
