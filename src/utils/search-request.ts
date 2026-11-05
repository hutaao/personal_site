import type { SearchResult } from "../global";

type SearchOutcome = { results: SearchResult[] } | { error: unknown };

export function createSearchRequest(
	search: (query: string, isCurrent: () => boolean) => Promise<SearchResult[]>,
) {
	let sequence = 0;

	return {
		cancel() {
			sequence++;
		},
		async run(keyword: string, publish: (outcome: SearchOutcome) => void) {
			const request = ++sequence;
			const query = keyword.trim();
			if (!query) return;

			const isCurrent = () => request === sequence;
			let outcome: SearchOutcome;
			try {
				outcome = { results: await search(query, isCurrent) };
			} catch (error) {
				outcome = { error };
			}
			if (isCurrent()) publish(outcome);
		},
	};
}
