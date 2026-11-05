<script lang="ts">
/**
 * M3E SearchBar — 导航栏折叠式胶囊搜索条分子。
 * 折叠时为 40px 图标按钮，点击后展开为
 * w-48 胶囊输入条，失焦延迟自动折叠。value / expanded 可双向绑定，
 * 展开折叠交互细节全部内聚在此，Search 有机体只负责搜索与结果面板。
 */
import Icon from "@iconify/svelte";
import { onDestroy, tick } from "svelte";

let {
	value = $bindable(""),
	expanded = $bindable(false),
	id = "search-input",
	name = "search",
	placeholder = "",
	onfocus = () => {},
	onquerychange = () => {},
	oncollapse = () => {},
}: {
	value?: string;
	expanded?: boolean;
	id?: string;
	name?: string;
	placeholder?: string;
	onfocus?: () => void;
	onquerychange?: (query: string) => void;
	oncollapse?: () => void;
} = $props();

let blurTimer: ReturnType<typeof setTimeout>;
let input: HTMLInputElement;

const expand = async (): Promise<void> => {
	expanded = true;
	await tick();
	input?.focus();
};

onDestroy(() => clearTimeout(blurTimer));

// 失焦后延迟折叠，允许搜索结果点击先执行
const handleBlur = (): void => {
	blurTimer = setTimeout(() => {
		expanded = false;
		oncollapse();
	}, 200);
};

const handleFocus = (): void => {
	clearTimeout(blurTimer);
	onfocus();
};
</script>

<div class="hidden lg:block relative w-10 h-10 shrink-0">
    <div
        class="absolute right-0 top-0 flex items-center overflow-hidden rounded-full h-10 top-app-bar__search-shell
               {expanded ? 'top-app-bar__search-shell--expanded w-48 bg-(--surface-container-high)' : 'w-10 bg-transparent'}"
        style="transition: width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), background-color var(--m3e-duration-short) var(--m3e-easing-standard);"
    >
        {#if expanded}
            <Icon icon="material-symbols:search" class="pointer-events-none shrink-0 ml-3 text-[1.25rem] text-[var(--on-surface-variant)]" />
        {:else}
            <button
                id={`${id}-toggle`}
                type="button"
                aria-label={placeholder || name}
                aria-controls={id}
                aria-expanded="false"
                class="m3-state-layer relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-[1.25rem] text-[var(--on-surface)] focus-visible:!outline-offset-[-2px]"
                onclick={expand}
            >
                <Icon icon="material-symbols:search" />
            </button>
        {/if}
        <input
            bind:this={input}
            {id}
            {name}
            {placeholder}
            aria-label={placeholder || name}
            bind:value
            disabled={!expanded}
            oninput={(event) => onquerychange(event.currentTarget.value)}
            onfocus={handleFocus}
            onblur={handleBlur}
            class="h-full bg-transparent outline-0 text-(--on-surface) caret-(--primary) transition-opacity duration-[var(--m3e-duration-short)]
                   {expanded ? 'w-32 pl-2 opacity-100' : 'w-0 opacity-0'}"
        />
    </div>
</div>
