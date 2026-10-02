<script lang="ts">
import PanelStack from "@components/atoms/display/PanelStack.svelte";
import SegmentedButton from "@components/atoms/selection/SegmentedButton.svelte";
import Slider from "@components/atoms/selection/Slider.svelte";
import Switch from "@components/atoms/selection/Switch.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@components/atoms/display/Icon.svelte";
import { applyDisplayPreferences, displayDefaults, getDisplayPreferences } from "@utils/hybrid-display-settings";
import {
	defaultMode,
	flipToMode,
	getStoredMode,
	LAYOUT_MODE_CHANGE_EVENT,
	storeMode,
} from "@utils/layout-mode";
import {
	MC_SPECS,
	MC_STYLES,
	type McSpec,
	type McStyle,
	resolveScheme,
} from "@utils/mc-utils";
import {
	getDefaultHue,
	getDefaultTextureOpacity,
	getDefaultTexturePreset,
	getHue,
	getMotionPreference,
	getStoredTextureOpacity,
	getStoredTexturePreset,
	setHue,
	setMotionPreference,
	setTextureOpacity,
	setTexturePreset,
} from "@utils/setting-utils";
import { getSpec, getStyle, setSpec, setStyle } from "@utils/theme-utils";
import { onMount } from "svelte";
import {
	getDefaultSpec,
	getDefaultStyle,
	resolveDisplaySettings,
} from "@/config";
import type { PostListMode } from "@/types/postListConfig";
import type { TexturePreset } from "@/types/textureConfig";

let { class: className = "" }: { class?: string } = $props();

const displayConfig = resolveDisplaySettings();

const defaultHue = getDefaultHue();
const defaultStyle = getDefaultStyle() as McStyle;
const defaultSpec = getDefaultSpec() as McSpec;
let hue = $state(getHue());
let style = $state<McStyle>(getStyle());
let spec = $state<McSpec>(getSpec());
let dark = $state(
	typeof document !== "undefined" &&
		document.documentElement.classList.contains("dark"),
);

let motionReduced = $state(false);

// 文章列表布局（list/grid）：初始值取访客偏好，变化时存储 + FLIP 重排
const defaultLayoutMode = defaultMode();
let postListMode = $state<PostListMode>(getStoredMode());
let lastAppliedMode = postListMode;
let prefs = $state(getDisplayPreferences());
let mounted = $state(false);
let SakuraComponent = $state<typeof import("@components/organisms/ReferenceSakura.svelte").default>();
$effect(() => {
 if (mounted && prefs.sakura && !motionReduced && !SakuraComponent) {
  void import("@components/organisms/ReferenceSakura.svelte").then(module => SakuraComponent = module.default);
 }
});
let activeTab = $state("appearance");
let collapsed = $state<Record<string,boolean>>({});
let previousWallpaperMode = prefs.mode;
const tabs = [
 {value:"appearance", key:I18nKey.settingsAppearance, icon:"material-symbols:palette"},
 {value:"wallpaper", key:I18nKey.settingsWallpaper, icon:"material-symbols:wallpaper-rounded"},
 {value:"effects", key:I18nKey.settingsEffects, icon:""},
];
const wallpaperOptions = [
 {value:"banner", key:I18nKey.wallpaperModeBanner, icon:"material-symbols:image-outline"},
 {value:"fullscreen", key:I18nKey.wallpaperFullscreen, icon:"material-symbols:wallpaper"},
 {value:"overlay", key:I18nKey.wallpaperOverlay, icon:"material-symbols:full-coverage-outline-rounded"},
 {value:"none", key:I18nKey.wallpaperModeNone, icon:"material-symbols:hide-image-outline"},
] as const;
function tabKey(event: KeyboardEvent) {
 const index = tabs.findIndex(t=>t.value === activeTab);
 let next = index;
 if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
 else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
 else if (event.key === "Home") next = 0;
 else if (event.key === "End") next = tabs.length - 1;
 else return;
 event.preventDefault();
 activeTab = tabs[next].value;
 document.getElementById("display-tab-" + activeTab)?.focus();
}
$effect(() => {
 const snapshot = {...prefs};
 if (mounted) applyDisplayPreferences(snapshot);
});

// 背景纹理预设与浓度
const defaultTexturePreset = getDefaultTexturePreset();
const defaultTextureOpacity = getDefaultTextureOpacity();
let texturePreset = $state<TexturePreset>(getStoredTexturePreset());
let lastAppliedTexturePreset = texturePreset;
let textureOpacity = $state<number>(getStoredTextureOpacity());

const textureOptions: {
	value: TexturePreset;
	labelKey: I18nKey;
	icon: string;
}[] = [
	{
		value: "none",
		labelKey: I18nKey.texturePresetNone,
		icon: "material-symbols:block-rounded",
	},
	{
		value: "starlight",
		labelKey: I18nKey.texturePresetStarlight,
		icon: "material-symbols:auto-awesome-outline-rounded",
	},
	{
		value: "cyber-dots",
		labelKey: I18nKey.texturePresetCyberDots,
		icon: "material-symbols:grid-view-rounded",
	},
	{
		value: "topography",
		labelKey: I18nKey.texturePresetTopography,
		icon: "material-symbols:waves-rounded",
	},
	{
		value: "geometric",
		labelKey: I18nKey.texturePresetGeometric,
		icon: "material-symbols:category-outline-rounded",
	},
	{
		value: "sakura",
		labelKey: I18nKey.texturePresetSakura,
		icon: "material-symbols:local-florist-outline-rounded",
	},
];

// 明暗切换时重算色卡（LightDarkSwitch 改 <html> 的 class）
onMount(() => {
	prefs = getDisplayPreferences();
	mounted = true;
	if (prefs.mode === "fullscreen" || prefs.mode === "overlay") activeTab = "wallpaper";
	const observer = new MutationObserver(() => {
		dark = document.documentElement.classList.contains("dark");
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	motionReduced = getMotionPreference();
	return () => observer.disconnect();
});

/** 完整重置：色相 / 配色风格 / Color Spec / 列表布局 / 背景纹理 全部还原为站点默认（点击即生效，无确认弹窗） */
function confirmReset() {
	hue = defaultHue;
	style = defaultStyle;
	spec = defaultSpec;
	postListMode = defaultLayoutMode;
	texturePreset = defaultTexturePreset;
	textureOpacity = defaultTextureOpacity;
	prefs = {...displayDefaults};
}

/** 是否有可重置的偏离（控制 Reset 按钮可见性） */
const isDirty = $derived(
	hue !== defaultHue ||
		style !== defaultStyle ||
		spec !== defaultSpec ||
		postListMode !== defaultLayoutMode ||
		texturePreset !== defaultTexturePreset ||
		textureOpacity !== defaultTextureOpacity || Object.entries(displayDefaults).some(([key,value]) => prefs[key as keyof typeof prefs] !== value),
);

$effect(() => {
	if (hue || hue === 0) setHue(hue);
});
$effect(() => {
	setStyle(style);
});
$effect(() => {
	setSpec(spec);
});
$effect(() => {
	if (mounted) setMotionPreference(motionReduced);
});
$effect(() => {
 const mode = prefs.mode;
 if (mode !== previousWallpaperMode) {
  previousWallpaperMode = mode;
  if (mode === "fullscreen" || mode === "overlay") activeTab = "wallpaper";
 }
});
$effect(() => {
	if (texturePreset === lastAppliedTexturePreset) return;
	lastAppliedTexturePreset = texturePreset;
	setTexturePreset(texturePreset);
});
$effect(() => {
	setTextureOpacity(textureOpacity);
});
$effect(() => {
	if (postListMode === lastAppliedMode) return;
	lastAppliedMode = postListMode;
	storeMode(postListMode);
	// 全局广播：番剧页等其它消费方（.anime-list）跟随切换并各自 FLIP
	window.dispatchEvent(
		new CustomEvent(LAYOUT_MODE_CHANGE_EVENT, {
			detail: { layout: postListMode },
		}),
	);
	// 首页才有 #post-list；其它页面仅存储偏好 + 事件同步，下次进首页生效
	const container = document.getElementById("post-list");
	if (container) flipToMode(container, postListMode);
});

function styleKey(s: McStyle): I18nKey {
	switch (s) {
		case "tonalSpot":
			return I18nKey.styleTonalSpot;
		case "vibrant":
			return I18nKey.styleVibrant;
		case "content":
			return I18nKey.styleContent;
		case "expressive":
			return I18nKey.styleExpressive;
		case "rainbow":
			return I18nKey.styleRainbow;
		case "fruitSalad":
			return I18nKey.styleFruitSalad;
		case "monochrome":
			return I18nKey.styleMonochrome;
		case "neutral":
			return I18nKey.styleNeutral;
		case "fidelity":
			return I18nKey.styleFidelity;
	}
}

/** 某个风格在当前色相/明暗/规范下的 primary/secondary/tertiary */
function styleColors(s: McStyle, h: number, d: boolean, sp: McSpec) {
	const scheme = resolveScheme(h, d, s, sp);
	return {
		primary: scheme.primary ?? "#888",
		secondary: scheme.secondary ?? "#888",
		tertiary: scheme.tertiary ?? "#888",
	};
}

/** 当前主色（标题右侧预览圆点） */


/** 9 个风格的色卡预览（3×3 网格） */
const stylePreviews = $derived(
	MC_STYLES.map((s) => ({
		style: s,
		label: i18n(styleKey(s)),
		colors: styleColors(s, hue, dark, spec),
	})),
);
function resetTransparency() { prefs.opacity=displayDefaults.opacity; prefs.blur=displayDefaults.blur; prefs.cardOpacity=displayDefaults.cardOpacity; }
function resetWallpaperOptions() { prefs.title=displayDefaults.title; prefs.waves=displayDefaults.waves; prefs.gradient=displayDefaults.gradient; }
const transparencyDirty = $derived(prefs.opacity !== displayDefaults.opacity || prefs.blur !== displayDefaults.blur || prefs.cardOpacity !== displayDefaults.cardOpacity);
const wallpaperOptionsDirty = $derived(prefs.title !== displayDefaults.title || prefs.waves !== displayDefaults.waves || prefs.gradient !== displayDefaults.gradient);
</script>
{#snippet resetButton(reset: () => void, dirty: boolean)}
    <button type="button" aria-label={i18n(I18nKey.settingsReset)}
        class="float-control w-7 h-7 rounded-md active:scale-90 will-change-transform flex items-center justify-center"
        class:opacity-0={!dirty} class:pointer-events-none={!dirty} tabindex={dirty ? 0 : -1} onclick={reset}>
        <Icon icon="fa6-solid:arrow-rotate-left" class="text-[0.75rem]" />
    </button>
{/snippet}
{#snippet sectionHeader(key: I18nKey, section: string)}
    <button type="button" class="settings-section__header" aria-expanded={!collapsed[section]}
        aria-controls={"settings-section-" + section} onclick={() => collapsed[section] = !collapsed[section]}>
        <span class="text-sm font-bold text-[var(--on-surface-variant)] ml-1">{i18n(key)}</span>
        <span class="settings-section__chevron" class:settings-section__chevron--collapsed={collapsed[section]}>
            <Icon icon="material-symbols:keyboard-arrow-down" />
        </span>
    </button>
{/snippet}
<div id="display-setting" class="float-panel float-panel-closed absolute transition-all w-80 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain m3-scroll-contain {className}">
    <PanelStack>
        <div class="p-1.5 pb-0">
            <div class="display-tabs" role="tablist" aria-label={i18n(I18nKey.settingsAppearance)} onkeydown={tabKey}>
                {#each tabs as tab}
                    <button id={"display-tab-" + tab.value} type="button" role="tab"
                        aria-selected={activeTab === tab.value} aria-controls="display-settings-content"
                        tabindex={activeTab === tab.value ? 0 : -1} class="display-tab m3-state-layer"
                        class:selected={activeTab === tab.value} onclick={() => activeTab = tab.value}>
                        {#if tab.icon}<Icon icon={tab.icon} class="text-[1.25rem]" />{/if}<span>{i18n(tab.key)}</span>
                    </button>
                {/each}
            </div>
        </div>
        {#if activeTab === "appearance"}
            <div class="p-4 flex flex-col gap-3" role="tabpanel" id="display-settings-content" aria-labelledby="display-tab-appearance">
                <div class="settings-section flex flex-col gap-2" class:settings-section--collapsed={collapsed.hue}>
                    <div class="flex flex-row gap-2 items-center justify-between">
                        <div class="flex items-center gap-1">
                            {@render sectionHeader(I18nKey.themeColor,"hue")}
                            {@render resetButton(confirmReset,isDirty)}
                        </div>
                        <div class="h-7 min-w-16 px-1 rounded-(--shape-corner-m) flex items-center justify-center bg-(--surface-container) text-sm font-bold text-(--on-surface)">{hue}</div>
                    </div>
                    <div class="settings-section__clip" id="settings-section-hue" inert={collapsed.hue}>
                        <div class="settings-section__body"><Slider bind:value={hue} min={0} max={360} step={5} label={i18n(I18nKey.themeColor)} /></div>
                    </div>
                </div>
                {#if displayConfig.colorStyle}
                    <div class="settings-section flex flex-col gap-2 pt-1" class:settings-section--collapsed={collapsed.style}>
                        {@render sectionHeader(I18nKey.colorStyle,"style")}
                        <div class="settings-section__clip" id="settings-section-style" inert={collapsed.style}>
                            <div class="settings-section__body">
                                <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={i18n(I18nKey.colorStyle)}>
                                    {#each stylePreviews as preview}
                                        <button type="button" role="radio" aria-checked={style === preview.style} title={preview.label} aria-label={preview.label}
                                            class="m3-style-cell" class:selected={style === preview.style} onclick={() => style = preview.style}>
                                            <span class="m3-style-cell__dots">
                                                <span class="m3-style-cell__dot" style={"background:" + preview.colors.primary}></span>
                                                <span class="m3-style-cell__dot" style={"background:" + preview.colors.secondary}></span>
                                                <span class="m3-style-cell__dot" style={"background:" + preview.colors.tertiary}></span>
                                            </span>
                                            <span class="m3-style-cell__name">{preview.label}</span>
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
                {#if displayConfig.colorSpec}
                    <div class="settings-section flex flex-col gap-1.5 pt-1" class:settings-section--collapsed={collapsed.spec}>
                        {@render sectionHeader(I18nKey.colorSpec,"spec")}
                        <div class="settings-section__clip" id="settings-section-spec" inert={collapsed.spec}><div class="settings-section__body">
                            <SegmentedButton options={MC_SPECS.map(s=>({value:s,label:i18n(s === "2021" ? I18nKey.spec2021 : I18nKey.spec2025)}))}
                                bind:value={spec} label={i18n(I18nKey.colorSpec)} />
                        </div></div>
                    </div>
                {/if}
                {#if displayConfig.layoutMode}
                    <div class="settings-section flex flex-col gap-1.5 pt-1" class:settings-section--collapsed={collapsed.list}>
                        {@render sectionHeader(I18nKey.layoutMode,"list")}
                        <div class="settings-section__clip" id="settings-section-list" inert={collapsed.list}><div class="settings-section__body">
                            <SegmentedButton options={[{value:"list",label:i18n(I18nKey.layoutList)},{value:"grid",label:i18n(I18nKey.layoutGrid)}]}
                                bind:value={postListMode} label={i18n(I18nKey.layoutMode)} />
                        </div></div>
                    </div>
                {/if}
                {#if displayConfig.texture}
                    <div class="settings-section flex flex-col gap-2 pt-1" class:settings-section--collapsed={collapsed.texture}>
                        {@render sectionHeader(I18nKey.texturePreset,"texture")}
                        <div class="settings-section__clip" id="settings-section-texture" inert={collapsed.texture}><div class="settings-section__body">
                            <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={i18n(I18nKey.texturePreset)}>
                                {#each textureOptions as option}
                                    <button type="button" role="radio" aria-checked={texturePreset === option.value} title={i18n(option.labelKey)} aria-label={i18n(option.labelKey)}
                                        class="m3-style-cell" class:selected={texturePreset === option.value} onclick={() => texturePreset = option.value}>
                                        <Icon icon={option.icon} class="text-lg" /><span class="m3-style-cell__name">{i18n(option.labelKey)}</span>
                                    </button>
                                {/each}
                            </div>
                        </div></div>
                    </div>
                {/if}
            </div>
        {:else if activeTab === "wallpaper"}
            <div class="p-4 flex flex-col gap-3" role="tabpanel" id="display-settings-content" aria-labelledby="display-tab-wallpaper">
                <div class="flex flex-col gap-2">
                    <div class="settings-heading"><span>{i18n(I18nKey.wallpaperMode)}</span>
                        {@render resetButton(()=>prefs.mode = displayDefaults.mode,prefs.mode !== displayDefaults.mode)}
                    </div>
                    <div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label={i18n(I18nKey.wallpaperMode)}>
                        {#each wallpaperOptions as option}
                            <button type="button" role="radio" aria-checked={prefs.mode === option.value} title={i18n(option.key)} aria-label={i18n(option.key)}
                                class="m3-mode-cell" class:selected={prefs.mode === option.value} onclick={() => prefs.mode = option.value}>
                                <Icon icon={option.icon} class="text-[1.25rem]" /><span class="m3-mode-cell__name">{i18n(option.key)}</span>
                            </button>
                        {/each}
                    </div>
                </div>
                {#if prefs.mode === "fullscreen"}
                    <div class="flex flex-col gap-1.5">
                        <div class="settings-heading"><span>{i18n(I18nKey.wallpaperLayout)}</span>
                            {@render resetButton(()=>prefs.layout = displayDefaults.layout,prefs.layout !== displayDefaults.layout)}
                        </div>
                        <SegmentedButton options={[{value:"classic",label:i18n(I18nKey.wallpaperClassic)},{value:"hero",label:i18n(I18nKey.wallpaperHero)}]}
                            bind:value={prefs.layout} label={i18n(I18nKey.wallpaperLayout)} />
                    </div>
                {/if}
                {#if prefs.mode === "overlay" || (prefs.mode === "fullscreen" && prefs.layout === "hero")}
                    <div class="flex flex-col gap-2 pt-1">
                        <div class="settings-heading"><span>{i18n(I18nKey.wallpaperTransparency)}</span>
                            {@render resetButton(resetTransparency,transparencyDirty)}
                        </div>
                        {#if prefs.mode === "overlay"}
                            <div class="m3-slider-row">
                                <div class="flex items-center justify-between"><span class="text-xs font-bold text-[var(--on-surface-variant)]">{i18n(I18nKey.wallpaperOpacity)}</span><span class="text-xs text-[var(--on-surface-variant)]">{prefs.opacity}%</span></div>
                                <Slider bind:value={prefs.opacity} min={20} max={100} step={1} label={i18n(I18nKey.wallpaperOpacity)} />
                            </div>
                        {/if}
                        <div class="m3-slider-row">
                            <div class="flex items-center justify-between"><span class="text-xs font-bold text-[var(--on-surface-variant)]">{i18n(I18nKey.wallpaperBlur)}</span><span class="text-xs text-[var(--on-surface-variant)]">{prefs.blur.toFixed(1)}px</span></div>
                            <Slider bind:value={prefs.blur} min={0} max={20} step={0.5} label={i18n(I18nKey.wallpaperBlur)} />
                        </div>
                        <div class="m3-slider-row">
                            <div class="flex items-center justify-between"><span class="text-xs font-bold text-[var(--on-surface-variant)]">{i18n(I18nKey.wallpaperCardOpacity)}</span><span class="text-xs text-[var(--on-surface-variant)]">{prefs.cardOpacity}%</span></div>
                            <Slider bind:value={prefs.cardOpacity} min={20} max={100} step={1} label={i18n(I18nKey.wallpaperCardOpacity)} />
                        </div>
                    </div>
                {/if}
                {#if prefs.mode === "banner" || prefs.mode === "fullscreen"}
                    <div class="flex flex-col gap-2 pt-1">
                        <div class="settings-heading"><span>{i18n(I18nKey.wallpaperOptions)}</span>
                            {@render resetButton(resetWallpaperOptions,wallpaperOptionsDirty)}
                        </div>
                        <div class="m3-toggle-row"><Icon icon="material-symbols:titlecase-rounded" class="text-lg text-[var(--primary)]" /><span class="text-sm font-bold text-[var(--on-surface)] flex-1">{i18n(I18nKey.wallpaperTitle)}</span>
                            <Switch bind:checked={prefs.title} label={i18n(I18nKey.wallpaperTitle)} icons /></div>
                        {#if prefs.mode === "banner"}
                            <div class="m3-toggle-row"><Icon icon="material-symbols:airwave-rounded" class="text-lg text-[var(--primary)]" /><span class="text-sm font-bold text-[var(--on-surface)] flex-1">{i18n(I18nKey.wallpaperWaves)}</span>
                                <Switch bind:checked={prefs.waves} label={i18n(I18nKey.wallpaperWaves)} icons /></div>
                            <div class="m3-toggle-row"><Icon icon="material-symbols:gradient" class="text-lg text-[var(--primary)]" /><span class="text-sm font-bold text-[var(--on-surface)] flex-1">{i18n(I18nKey.wallpaperGradient)}</span>
                                <Switch bind:checked={prefs.gradient} label={i18n(I18nKey.wallpaperGradient)} icons /></div>
                        {/if}
                    </div>
                {/if}
            </div>
        {:else}
            <div class="p-4 flex flex-col gap-2" role="tabpanel" id="display-settings-content" aria-labelledby="display-tab-effects">
                <div class="m3-toggle-row"><Icon icon="material-symbols:motion-photos-off" class="text-lg text-[var(--primary)]" /><span class="text-sm font-bold text-[var(--on-surface)] flex-1">{i18n(I18nKey.reduceMotion)}</span>
                    <Switch bind:checked={motionReduced} label={i18n(I18nKey.reduceMotion)} icons /></div>
                <div class="m3-toggle-row"><span class="text-sm font-bold text-[var(--on-surface)] flex-1">{i18n(I18nKey.effectsSakura)}</span>
                    <Switch bind:checked={prefs.sakura} label={i18n(I18nKey.effectsSakura)} icons /></div>
            </div>
        {/if}
    </PanelStack>
</div>
{#if mounted && prefs.sakura && !motionReduced && SakuraComponent}
    <SakuraComponent enabled={prefs.sakura} reduced={motionReduced} />
{/if}

<style lang="stylus">
.display-tabs
    display: flex
    width: 100%
    box-sizing: border-box
    height: 2.25rem
    gap: 2px
    padding: 2px
    border-radius: var(--shape-corner-m)
    background: var(--surface-container)
    overflow: hidden
.display-tab
    flex: 1 1 0
    min-width: 0
    display: flex
    align-items: center
    justify-content: center
    gap: var(--m3e-space-2)
    padding: 0 var(--m3e-space-3)
    border-radius: var(--shape-corner-s)
    color: var(--on-surface-variant)
    font: var(--m3e-type-label-medium)
    cursor: pointer
    --m3e-state-color: var(--on-surface)
    &.selected
        color: var(--on-secondary-container)
        background: var(--secondary-container)
        box-shadow: var(--m3e-elevation-1)
.settings-heading
    display: flex
    justify-content: space-between
    align-items: center
    gap: var(--m3e-space-2)
    > span
        font: var(--m3e-type-label-large)
        font-weight: 700
        color: var(--on-surface)
        margin-left: var(--m3e-space-1)
.settings-section__header
    display: flex
    align-items: center
    gap: 0.125rem
    width: fit-content
    padding: 0
    border: none
    background: none
    cursor: pointer
    text-align: left
.settings-section__chevron
    display: flex
    transition: transform var(--m3e-duration-medium) var(--m3e-easing-standard)
.settings-section__chevron--collapsed
    transform: rotate(-90deg)
.settings-section__clip
    display: grid
    grid-template-rows: 1fr
    transition: grid-template-rows var(--m3e-duration-medium) var(--m3e-easing-standard)
.settings-section--collapsed .settings-section__clip
    grid-template-rows: 0fr
.settings-section__body
    min-height: 0
    overflow: hidden
.m3-style-cell
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center
    gap: 0.375rem
    padding: var(--m3e-space-2) var(--m3e-space-1)
    border: none
    border-radius: var(--shape-corner-s)
    background: transparent
    color: var(--on-surface-variant)
    font: var(--m3e-type-label-small)
    cursor: pointer
    user-select: none
    --m3e-state-color: var(--on-surface)
    transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard)
    &:hover
        background: unquote("color-mix(in oklab, var(--on-surface) 6%, transparent)")
    &.selected
        background: var(--secondary-container)
        color: var(--on-secondary-container)
    &__dots
        display: flex
        gap: var(--m3e-space-1)
    &__dot
        width: 0.625rem
        height: 0.625rem
        border-radius: var(--shape-corner-full)
        box-shadow: unquote("inset 0 0 0 1px color-mix(in oklab, var(--on-surface) 20%, transparent)")
    &__name
        max-width: 100%
        overflow: hidden
        text-overflow: ellipsis
        white-space: nowrap
.m3-mode-cell
    display: flex
    align-items: center
    justify-content: center
    gap: var(--m3e-space-2)
    padding: 0.625rem var(--m3e-space-2)
    border: none
    border-radius: var(--shape-corner-m)
    background: var(--btn-regular-bg)
    color: var(--btn-content)
    font: var(--m3e-type-label-medium)
    cursor: pointer
    user-select: none
    --m3e-state-color: var(--on-surface)
    transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard)
    &:hover
        background: var(--btn-regular-bg-hover)
    &.selected
        background: var(--secondary-container)
        color: var(--on-secondary-container)
    &__name
        min-width: 0
        overflow: hidden
        text-overflow: ellipsis
        white-space: nowrap
.m3-slider-row
    display: flex
    flex-direction: column
    gap: var(--m3e-space-1)
    padding: 0.625rem var(--m3e-space-3)
    border-radius: var(--shape-corner-m)
    background: var(--btn-regular-bg)
.m3-toggle-row
    display: flex
    align-items: center
    gap: 0.625rem
    padding: 0.625rem var(--m3e-space-3)
    border-radius: var(--shape-corner-m)
    background: var(--btn-regular-bg)
@media (prefers-reduced-motion: reduce)
    .settings-section__clip, .settings-section__chevron
        transition: none
:global(html.motion-reduced) .settings-section__clip,
:global(html.motion-reduced) .settings-section__chevron
    transition: none
:global(#display-setting.m3-scroll-contain)
    scrollbar-width: thin
    scrollbar-color: var(--scrollbar-bg) transparent
</style>
