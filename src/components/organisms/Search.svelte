<script lang="ts">
import IconButton from "@components/atoms/action/IconButton.svelte";
import SearchPanel from "@components/atoms/blog/SearchPanel.svelte";
import SearchBar from "@components/molecules/SearchBar.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { createSearchRequest } from "@utils/search-request";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let panelOpen = false;
let searchFailed = false;
let activeDesktop = false;

$: panelResults = result.map((r) => ({
	url: r.url,
	title: r.meta.title,
	excerpt: r.excerpt,
}));

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

const request = createSearchRequest(async (query, isCurrent) => {
	if (import.meta.env.DEV && !window.pagefind && !window.__loadPagefind) {
		return fakeResult;
	}
	const pagefind = window.pagefind ?? (await window.__loadPagefind?.());
	if (!isCurrent()) return [];
	if (!pagefind) throw new Error("Pagefind is unavailable.");

	const response = await pagefind.search(query);
	if (!isCurrent()) return [];
	return Promise.all(response.results.map((item) => item.data()));
});

function closePanel(): void {
	request.cancel();
	panelOpen = false;
	result = [];
	searchFailed = false;
}

function togglePanel(): void {
	if (panelOpen) {
		closePanel();
	} else {
		panelOpen = true;
		search(keywordMobile, false);
	}
}

function search(keyword: string, isDesktop: boolean): void {
	activeDesktop = isDesktop;
	result = [];
	searchFailed = false;
	if (isDesktop) panelOpen = false;

	void request.run(keyword, (outcome) => {
		if ("error" in outcome) {
			console.error("Search error:", outcome.error);
			searchFailed = true;
		} else {
			result = outcome.results;
		}
		if (isDesktop) panelOpen = searchFailed || result.length > 0;
	});
}

onMount(() => {
	const closeOnOutsideClick = (event: MouseEvent) => {
		if (
			event.target instanceof Element &&
			event.target.closest("#search-panel, #search-bar, #search-switch, [data-firefly-action='search']")
		) return;
		closePanel();
	};
	const closeOnPanelBlur = (event: FocusEvent) => {
		const panel = document.getElementById("search-panel");
		if (
			panel?.contains(event.target as Node) &&
			!panel.contains(event.relatedTarget as Node | null)
		) closePanel();
	};
	document.addEventListener("click", closeOnOutsideClick);
	document.addEventListener("focusout", closeOnPanelBlur);
	return () => {
		request.cancel();
		document.removeEventListener("click", closeOnOutsideClick);
		document.removeEventListener("focusout", closeOnPanelBlur);
	};
});
</script>

<!-- 桌面搜索：点击或键盘激活图标按钮后展开输入框 -->
<div id="search-bar" class="contents">
    <SearchBar
        bind:value={keywordDesktop}
        id="search-input-desktop"
        name="search-desktop"
        placeholder={i18n(I18nKey.search)}
        onfocus={() => search(keywordDesktop, true)}
        onquerychange={(query) => search(query, true)}
        oncollapse={() => {
            if (activeDesktop && !document.getElementById("search-panel")?.contains(document.activeElement)) {
                closePanel();
            }
        }}
    />
</div>

<!-- toggle btn for phone/tablet view -->
<IconButton
    icon="material-symbols:search"
    label="Search Panel"
    id="search-switch"
    ariaExpanded={panelOpen}
    ariaControls="search-panel"
    size="small"
    shape="round"
    onclick={togglePanel}
    class="lg:!hidden !w-10 !h-10 !text-[1.25rem]"
/>

<!-- 桌面和移动端共用结果面板 -->
<SearchPanel
    id="search-panel"
    class="float-panel absolute md:w-[30rem] top-20 left-4 md:left-[unset] right-4 {panelOpen ? '' : 'float-panel-closed'}"
    bind:query={keywordMobile}
    onquerychange={(query) => search(query, false)}
    status={searchFailed ? i18n(I18nKey.searchUnavailable) : ""}
    inert={!panelOpen}
    results={panelResults}
    placeholder={i18n(I18nKey.search)}
    hideInputOnDesktop
/>
