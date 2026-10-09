let active: { owner: object; pause: () => void } | null = null;

/** The latest play request owns playback, including media that is still loading. */
export function claimMediaPlayback(owner: object, pause: () => void): void {
	const previous = active;
	active = { owner, pause };
	if (previous && previous.owner !== owner) previous.pause();
}

export function releaseMediaPlayback(owner: object): void {
	if (active?.owner === owner) active = null;
}
