<script lang="ts">
import type { MusicSnapshot, MusicRuntime, PlaybackMode } from "@/types/musicConfig";
import type { LyricLine } from "@utils/music/lyrics";

interface Props {
	snapshot: MusicSnapshot;
	lyricLines: LyricLine[];
	lyricIndex: number;
	runtime: MusicRuntime | null;
	playerEnabled: boolean;
	lyricsEnabled: boolean;
	onClosePlayer: () => void;
	onCloseLyrics: () => void;
}
let { snapshot, lyricLines, lyricIndex, runtime, playerEnabled, lyricsEnabled, onClosePlayer, onCloseLyrics }: Props = $props();
let expanded = $state(false);
let hovered = $state(false);
let focused = $state(false);
let tab = $state<"playlist" | "lyrics">("playlist");
let lyricList = $state<HTMLDivElement | null>(null);
const playing = $derived(snapshot.status === "playing");
const panelOpen = $derived(expanded || hovered || focused);
const lyricText = $derived(lyricLines[lyricIndex]?.text ?? "");
const modes: PlaybackMode[] = ["sequence", "repeat-one", "shuffle"];
const modeNames: Record<PlaybackMode, string> = { sequence: "顺序播放", "repeat-one": "单曲循环", shuffle: "随机播放" };
const paths: Record<string, string> = {
	play: "M8 5v14l11-7z", pause: "M6 5h4v14H6zm8 0h4v14h-4z",
	previous: "M6 5h2v14H6zm12 0v14L8 12z", next: "M16 5h2v14h-2zM6 5l10 7-10 7z",
	close: "m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z",
	music: "M12 3v12.2a4 4 0 1 0 2 3.5V7h5V3z",
	volume: "M3 9v6h4l5 4V5L7 9zm12-1v8a5 5 0 0 0 0-8zm0-4v2a7 7 0 0 1 0 12v2a9 9 0 0 0 0-16z",
	mute: "M3 9v6h4l5 4V5L7 9zm12-1 2 4-2 4 2 1 2-3 2 3 2-1-2-4 2-4-2-1-2 3-2-3z",
	sequence: "M4 4h12l-3-3 1.4-1.4L20 5l-5.6 5.4L13 9l3-3H6v4H4zm16 10v6H8l3 3-1.4 1.4L4 19l5.6-5.4L11 15l-3 3h10v-4z",
	shuffle: "M3 4h3l12 14h3v-3l4 4-4 4v-3h-4L5 6H3zm0 14h3l4-4 1.4 1.5L7 20H3zm10-9 4-5h4V1l4 4-4 4V6h-3l-3.6 4.5z",
	expand: "M4 4h16v16H4zm2 2v12h12V6zm2 2h8v2H8zm0 4h8v2H8z",
};
function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return { destroy() { node.remove(); } };
}
function format(seconds: number) {
	const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
	return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
function cycleMode() {
	runtime?.setMode(modes[(modes.indexOf(snapshot.mode) + 1) % modes.length]);
}
function closePanel() { expanded = false; hovered = false; focused = false; }
$effect(() => {
	if (!playerEnabled) closePanel();
});
$effect(() => {
	if (tab !== "lyrics" || !panelOpen || !lyricList) return;
	const active = lyricList.querySelector<HTMLElement>(`[data-line="${lyricIndex}"]`);
	if (active) lyricList.scrollTop = Math.max(0, active.offsetTop - lyricList.offsetTop - lyricList.clientHeight / 2 + active.clientHeight / 2);
});
</script>

{#snippet icon(name: string)}
	<svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name] ?? paths.music} /></svg>
{/snippet}

<svelte:window onkeydown={(event) => { if (event.key === "Escape" && panelOpen) closePanel(); }} />

<div class="floating-music-root" use:portal>
	{#if playerEnabled || expanded}
		<section class="floating-music-dock" data-floating-player aria-label="悬浮音乐播放器"
			onpointerenter={() => hovered = true} onpointerleave={() => hovered = false}
			onfocusin={() => focused = true}
			onfocusout={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focused = false; }}>
			{#if playerEnabled}
				<div class="disc-controls">
					<button class="floating-disc" data-floating-disc class:playing onclick={() => void runtime?.toggle()} aria-label={playing ? "暂停音乐" : "播放音乐"} disabled={!runtime}>
						{#if snapshot.currentTrack?.cover}<img src={snapshot.currentTrack.cover} alt="" />{:else}<span class="cover-fallback">{@render icon("music")}</span>{/if}
						<span class="disc-overlay">{@render icon(playing ? "pause" : "play")}</span>
					</button>
					<button class="disc-close small" aria-label="关闭悬浮播放器" onclick={() => { closePanel(); onClosePlayer(); }}>{@render icon("close")}</button>
					<button class="disc-expand small" aria-label="展开悬浮播放器" aria-expanded={panelOpen} onclick={() => expanded = !expanded}>{@render icon("expand")}</button>
				</div>
			{/if}
			{#if panelOpen}
				<div class="floating-panel" data-floating-panel>
					<header><span>音乐播放器</span><button class="small" aria-label="收起音乐控制" onclick={closePanel}>{@render icon("close")}</button></header>
					<div class="track-summary">
						{#if snapshot.currentTrack?.cover}<img src={snapshot.currentTrack.cover} alt="" />{:else}<span class="panel-fallback">{@render icon("music")}</span>{/if}
						<div><strong>{snapshot.currentTrack?.title ?? "暂无歌曲"}</strong><span>{snapshot.currentTrack?.artist ?? ""}</span></div>
					</div>
					<label class="progress"><span class="sr-only">播放进度</span><input aria-label="播放进度" type="range" min="0" max={snapshot.duration || 1} step="0.1" value={snapshot.currentTime} disabled={!runtime || !snapshot.duration} oninput={(event) => runtime?.seek(Number(event.currentTarget.value))} /></label>
					<div class="times"><span>{format(snapshot.currentTime)}</span><span>{format(snapshot.duration)}</span></div>
					<div class="play-controls">
						<button aria-label={modeNames[snapshot.mode]} title={modeNames[snapshot.mode]} onclick={cycleMode} disabled={!runtime}>{@render icon(snapshot.mode === "shuffle" ? "shuffle" : "sequence")}{#if snapshot.mode === "repeat-one"}<sup>1</sup>{/if}</button>
						<button aria-label="上一首" onclick={() => void runtime?.previous()} disabled={!runtime}>{@render icon("previous")}</button>
						<button class="primary-play" aria-label={playing ? "暂停音乐" : "播放音乐"} onclick={() => void runtime?.toggle()} disabled={!runtime}>{@render icon(playing ? "pause" : "play")}</button>
						<button aria-label="下一首" onclick={() => void runtime?.next()} disabled={!runtime}>{@render icon("next")}</button>
						<button aria-label={snapshot.muted ? "取消静音" : "静音"} onclick={() => runtime?.setMuted(!snapshot.muted)} disabled={!runtime}>{@render icon(snapshot.muted ? "mute" : "volume")}</button>
					</div>
					<label class="volume"><span>音量</span><input type="range" min="0" max="1" step="0.01" value={snapshot.volume} disabled={!runtime} oninput={(event) => runtime?.setVolume(Number(event.currentTarget.value))} /></label>
					<div class="tabs"><button class:active={tab === "playlist"} aria-pressed={tab === "playlist"} onclick={() => tab = "playlist"}>播放列表</button><button class:active={tab === "lyrics"} aria-pressed={tab === "lyrics"} onclick={() => tab = "lyrics"}>歌词</button></div>
					{#if tab === "playlist"}
						<div class="content-list" aria-label="歌曲列表">{#each snapshot.playlist as track, index}<button class:current={index === snapshot.currentIndex} aria-current={index === snapshot.currentIndex ? "true" : undefined} onclick={() => void runtime?.select(index)}>{index + 1}. {track.title}<small>{track.artist ?? ""}</small></button>{/each}{#if !snapshot.playlist.length}<p>暂无歌曲</p>{/if}</div>
					{:else}
						<div class="content-list lyric-list" bind:this={lyricList} aria-label="同步歌词">{#each lyricLines as line, index}<button data-line={index} class:current={index === lyricIndex} onclick={() => runtime?.seek(line.time)}>{line.text || "♪"}</button>{/each}{#if !lyricLines.length}<p>暂无歌词</p>{/if}</div>
					{/if}
				</div>
			{/if}
		</section>
	{/if}
	{#if lyricsEnabled && playing && lyricText}
		<div class="floating-lyrics" data-floating-lyrics><button class="lyric-text" data-floating-lyric-current aria-label="打开完整歌词" onclick={() => { tab = "lyrics"; expanded = true; }}>{lyricText}</button><button class="lyric-close" aria-label="关闭悬浮歌词" onclick={onCloseLyrics}>{@render icon("close")}</button></div>
	{/if}
</div>

<style>
.floating-music-root{position:fixed;inset:0;z-index:80;pointer-events:none;font-family:inherit;color:var(--on-surface)}
.floating-music-dock{position:absolute;left:18px;bottom:24px;pointer-events:auto;padding-top:12px}
button{font:inherit;cursor:pointer;border:0;color:inherit;background:transparent;display:inline-flex;align-items:center;justify-content:center;position:relative}
button:disabled{opacity:.45;cursor:default}button:focus-visible{outline:3px solid var(--primary);outline-offset:3px}svg{width:22px;height:22px;fill:currentColor;flex-shrink:0}
.disc-controls{position:relative;width:74px;height:74px}.floating-disc{width:74px;height:74px;border-radius:50%;padding:0;border:3px solid var(--surface-container-lowest);overflow:hidden;box-shadow:0 3px 14px #0004;background:var(--primary-container);color:var(--on-primary-container)}
.floating-disc img,.cover-fallback{width:100%;height:100%;object-fit:cover;animation:disc-spin 20s linear infinite;animation-play-state:paused}.floating-disc.playing img,.floating-disc.playing .cover-fallback{animation-play-state:running}.cover-fallback{display:grid;place-items:center}.disc-overlay{position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:#0003}.disc-overlay svg{filter:drop-shadow(0 1px 2px #0008);width:25px;height:25px}
.small{width:30px;height:30px;border-radius:50%;background:var(--surface-container-high);color:var(--on-surface)}.small svg{width:17px;height:17px}.disc-close{position:absolute;right:-7px;top:-10px;opacity:0;transition:opacity .18s}.disc-expand{position:absolute;right:-9px;bottom:-6px;box-shadow:0 1px 5px #0003}.disc-controls:hover .disc-close,.disc-controls:focus-within .disc-close{opacity:1}
.floating-panel{position:absolute;left:0;bottom:86px;width:326px;max-width:calc(100vw - 36px);max-height:calc(100dvh - 132px);overflow-y:auto;padding:18px;border-radius:24px;background:var(--surface-container-low);box-shadow:0 8px 32px #0003;border:1px solid var(--outline-variant);box-sizing:border-box;animation:panel-in .18s ease-out}
header{display:flex;justify-content:space-between;align-items:center;font-weight:600;margin-bottom:12px}.track-summary{display:flex;gap:12px;align-items:center;min-width:0}.track-summary img,.panel-fallback{width:56px;height:56px;object-fit:cover;border-radius:14px;flex-shrink:0}.panel-fallback{display:grid;place-items:center;background:var(--secondary-container)}.track-summary>div{display:flex;flex-direction:column;gap:5px;min-width:0}.track-summary strong{font-size:15px;overflow-wrap:anywhere}.track-summary span{font-size:12px;color:var(--on-surface-variant)}
input{width:100%;accent-color:var(--primary);cursor:pointer;margin:0;min-width:0}.progress{display:block;margin-top:15px}.times{display:flex;justify-content:space-between;font-size:11px;color:var(--on-surface-variant);margin-top:4px}.play-controls{display:flex;justify-content:space-between;align-items:center;margin:10px 0}.play-controls button{width:40px;height:40px;border-radius:50%}.play-controls button:hover{background:var(--surface-container-highest)}.play-controls .primary-play{width:50px;height:50px;background:var(--primary);color:var(--on-primary)}sup{position:absolute;font-size:9px;right:7px;bottom:8px}.volume{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--on-surface-variant)}.volume span{white-space:nowrap}.tabs{display:flex;gap:6px;margin-top:16px;padding:4px;border-radius:14px;background:var(--surface-container)}.tabs button{flex:1;padding:8px;border-radius:10px;font-size:13px}.tabs .active{background:var(--secondary-container);color:var(--on-secondary-container)}.content-list{margin-top:8px;max-height:180px;overflow-y:auto;position:relative;overscroll-behavior:contain}.content-list button{display:flex;width:100%;justify-content:flex-start;text-align:left;padding:10px 8px;border-radius:10px;font-size:13px;gap:5px;flex-wrap:wrap;overflow-wrap:anywhere}.content-list button:hover{background:var(--surface-container-highest)}.content-list .current{background:var(--secondary-container);color:var(--on-secondary-container);font-weight:600}.content-list small{color:var(--on-surface-variant);font-weight:400}.content-list p{font-size:13px;text-align:center;color:var(--on-surface-variant)}.lyric-list button{justify-content:center;text-align:center;line-height:1.65}
.floating-lyrics{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 210px);pointer-events:auto;display:flex;align-items:center;gap:6px}.lyric-text{font-size:clamp(16px,2vw,23px);font-weight:700;line-height:1.6;text-align:center;color:white;text-shadow:0 2px 5px #000,1px 0 #333,-1px 0 #333,0 1px #333,0 -1px #333;overflow-wrap:anywhere;padding:5px 8px}.lyric-close{color:#fff;background:#0008;width:24px;height:24px;border-radius:50%;flex-shrink:0;opacity:0;transition:opacity .18s}.lyric-close svg{width:16px;height:16px}.floating-lyrics:hover .lyric-close,.floating-lyrics:focus-within .lyric-close{opacity:1}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@keyframes disc-spin{to{transform:rotate(360deg)}}@keyframes panel-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:600px){.floating-music-dock{left:12px;bottom:18px}.disc-controls,.floating-disc{width:60px;height:60px}.floating-panel{bottom:72px;max-width:calc(100vw - 24px)}.disc-close{opacity:1}.floating-lyrics{bottom:22px;left:90px;right:12px;transform:none;max-width:none;justify-content:center}.lyric-text{font-size:16px}.lyric-close{opacity:1}}
@media(prefers-reduced-motion:reduce){.floating-disc img,.cover-fallback{animation:none}.floating-panel{animation:none}.disc-close,.lyric-close{transition:none}}
</style>


