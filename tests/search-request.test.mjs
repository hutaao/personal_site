import assert from "node:assert/strict";
import test from "node:test";
import { createPagefindLoader } from "../src/utils/pagefind-loader.ts";
import { createSearchRequest } from "../src/utils/search-request.ts";

test("Pagefind load retries after failure and coalesces concurrent calls", async () => {
	const urls = [];
	const pagefind = {
		search: async () => ({ results: [] }),
		options: async (options) => assert.deepEqual(options, { excerptLength: 20 }),
	};
	const load = createPagefindLoader(
		new URL("https://example.test/personal_site/pagefind/pagefind.js"),
		async (url) => {
			urls.push(url);
			if (urls.length === 1) throw new Error("offline");
			return pagefind;
		},
	);

	const initial = load();
	assert.equal(load(), initial);
	await assert.rejects(initial, /offline/);

	const retry = load();
	assert.equal(load(), retry);
	assert.equal(await retry, pagefind);
	assert.equal(load(), retry);
	assert.deepEqual(urls, [
		"https://example.test/personal_site/pagefind/pagefind.js",
		"https://example.test/personal_site/pagefind/pagefind.js?retry=1",
	]);
});

test("an older search outcome cannot overwrite a newer one", async () => {
	const old = Promise.withResolvers();
	const newResults = [{ url: "/new/", meta: { title: "New" }, excerpt: "" }];
	const request = createSearchRequest((query) =>
		query === "old" ? old.promise : Promise.resolve(newResults),
	);
	const outcomes = [];
	const publish = (outcome) => outcomes.push(outcome);

	const pending = request.run("old", publish);
	await request.run("new", publish);
	old.resolve([{ url: "/old/", meta: { title: "Old" }, excerpt: "" }]);
	await pending;

	assert.deepEqual(outcomes, [{ results: newResults }]);
});

test("clearing the query or closing the panel suppresses pending results and errors", async () => {
	const cleared = Promise.withResolvers();
	const closed = Promise.withResolvers();
	const queries = [];
	const outcomes = [];
	const request = createSearchRequest((query) => {
		queries.push(query);
		return query === "cleared" ? cleared.promise : closed.promise;
	});
	const publish = (outcome) => outcomes.push(outcome);

	const pendingClear = request.run("cleared", publish);
	await request.run("  ", publish);
	cleared.resolve([]);
	await pendingClear;

	const pendingClose = request.run("closed", publish);
	request.cancel();
	closed.reject(new Error("offline"));
	await pendingClose;

	assert.deepEqual(queries, ["cleared", "closed"]);
	assert.deepEqual(outcomes, []);
});
