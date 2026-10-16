import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = "/personal_site";
for (const theme of ["light", "dark"]) {
  test(`RSS subscription guides and copy, ${theme}`, async ({page, request}) => {
    await page.addInitScript(theme => { localStorage.setItem("theme", theme); Object.defineProperty(navigator, "clipboard", {configurable:true,value: {writeText: async (text: string) => { (window as any).__copiedFeed = text; }}}); }, theme);
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.goto(`${base}/`);
    const entry=page.getByRole("link",{name:"订阅文章更新",exact:true});
    await expect(entry).toHaveAttribute("href",`${base}/rss/`);
    await entry.click();
    await expect(page.locator(".feed-guide h1")).toContainText("RSS");
    await page.locator("[data-feed-copy-btn]").click();
    expect(await page.evaluate(()=>(window as any).__copiedFeed)).toBe("https://hutaao.github.io/personal_site/rss.xml");
    const xml=await request.get(`${base}/rss.xml`);expect(xml.ok()).toBe(true);expect(await xml.text()).toContain("<rss");
    await page.route(/\/api\/comment(?:\?|$)/,route=>route.fulfill({json:{errno:0,data:{page:1,totalPages:1,count:0,data:[]}}}));
    await page.goto(`${base}/guestbook/`);
    await page.locator(".shirone-waline").scrollIntoViewIfNeeded();
    await expect(page.locator(".wl-editor")).toBeVisible();
    await expect(page.locator(".wl-power .wl-rss")).toHaveCount(0);
    await page.getByRole("link",{name:"订阅本页评论",exact:true}).click();
    await expect(page.locator("[data-comment-feed-guide] h1")).toHaveText("订阅评论更新");
    await expect(page).toHaveURL(/path=page%3Aguestbook/);
    const pageFeed=page.locator('[data-comment-feed-scope="page"]');
    const wanted="https://hutaao-waline.vercel.app/api/comment/rss?path=page%3Aguestbook";
    await expect(pageFeed.locator("input")).toHaveValue(wanted);
    await pageFeed.getByRole("button",{name:"复制订阅地址"}).click();
    expect(await page.evaluate(()=>(window as any).__copiedFeed)).toBe(wanted);
    await expect(pageFeed.getByRole("status")).toContainText("已复制");
    await expect(pageFeed.getByRole("link",{name:"查看原始 XML"})).toHaveAttribute("href",wanted);
    await expect(page.locator("html")).toHaveClass(theme==="dark"?/dark/:/^(?!.*\bdark\b)/);
    await page.locator("[data-comment-feed-guide]").screenshot({path:`.blog-local/rss-guide-${theme}.png`});
    expect((await new AxeBuilder({page}).include("[data-comment-feed-guide]").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze()).violations).toEqual([]);
    await page.goto(`${base}/rss/comments/`);
    await expect(pageFeed).toBeHidden();
    const all=page.locator('[data-comment-feed-scope="site"]');
    await expect(all.locator("input")).toHaveValue("https://hutaao-waline.vercel.app/api/comment/rss");
    await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("denied")}}}));
    await all.getByRole("button",{name:"复制订阅地址"}).click();
    await expect(all.getByRole("status")).toContainText("地址已选中");
  });
}
test("comment RSS deep link loads lazy comments and locates target",async({page})=>{
  await page.route(/\/api\/comment(?:\?|$)/,async route=>{await new Promise(resolve=>setTimeout(resolve,300));return route.fulfill({json:{errno:0,data:{page:1,totalPages:1,count:1,data:[{objectId:3,nick:"测试",comment:"<p>RSS 链接测试</p>",time:1792108800000,children:[]}]}}})});
  await page.goto(`${base}/guestbook/#3`);
  await expect(page.locator('.shirone-waline [id="3"]')).toBeInViewport();
});
