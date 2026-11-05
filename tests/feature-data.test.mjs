import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	filterByDisabledKeys,
	resolveDevicesData,
	resolveProjectsData,
	resolveSkillsData,
	resolveTimelineData,
} from "../src/utils/feature-data.ts";

describe("Feature Data & Resolver Tests", () => {
	it("filterByDisabledKeys correctly filters items by key/id/name/title", () => {
		const items = [
			{ key: "item-1", name: "One" },
			{ key: "item-2", name: "Two" },
			{ key: "item-3", name: "Three" },
		];

		const filtered = filterByDisabledKeys(items, ["item-2"]);
		assert.equal(filtered.length, 2);
		assert.deepEqual(
			filtered.map((i) => i.key),
			["item-1", "item-3"],
		);
	});

	it("resolveProjectsData applies disabledKeys correctly", () => {
		const project = {
			title: "Fixture project",
			summary: "A project for the resolver test",
			category: "tools",
			phase: "building",
			technologies: [],
		};
		const config = {
			enable: true,
			categories: [],
			disabledKeys: ["disabled"],
			items: [
				{ ...project, key: "keep" },
				{ ...project, key: "disabled" },
				{ ...project, key: "hidden", enable: false },
			],
		};
		const resolved = resolveProjectsData(config);
		assert.deepEqual(resolved.map((item) => item.key), ["keep"]);
	});

	it("resolveSkillsData applies disabledNames correctly", () => {
		const config = {
			enable: true,
			categories: [],
			disabledNames: ["PHP"],
			items: [
				{ name: "TypeScript", category: "languages", level: "intermediate" },
				{ name: "PHP", category: "languages", level: "beginner" },
			],
		};
		const resolved = resolveSkillsData(config);
		assert.deepEqual(resolved.map((item) => item.name), ["TypeScript"]);
	});

	it("resolveTimelineData applies disabledTitles and order correctly", () => {
		const config = {
			enable: true,
			categories: [],
			order: "asc",
			disabledTitles: ["Hidden milestone"],
			items: [
				{ title: "Recent milestone", date: "2024.10" },
				{ title: "Hidden milestone", date: "2020.01" },
				{ title: "Early milestone", date: "2021.05" },
			],
		};
		const resolved = resolveTimelineData(config);
		assert.deepEqual(resolved.map((item) => item.title), [
			"Early milestone",
			"Recent milestone",
		]);
	});

	it("resolveTimelineData sorts correctly by date in desc and asc order", () => {
		const customItems = [
			{ title: "Old", date: "2021.05" },
			{ title: "Recent", date: "2024.10" },
			{ title: "Present", date: "2025.01 - Present" },
			{ title: "Middle", date: "2023.01" },
		];
		const descRes = resolveTimelineData({ order: "desc" }, customItems);
		assert.deepEqual(
			descRes.map((i) => i.title),
			["Present", "Recent", "Middle", "Old"],
		);

		const ascRes = resolveTimelineData({ order: "asc" }, customItems);
		assert.deepEqual(
			ascRes.map((i) => i.title),
			["Old", "Middle", "Recent", "Present"],
		);
	});

	it("resolveDevicesData applies disabledIds correctly", () => {
		const device = {
			brand: "Fixture brand",
			category: "tools",
			status: "active",
			specs: "Fixture specs",
			description: "A device for the resolver test",
		};
		const config = {
			enable: true,
			categories: [],
			disabledIds: ["old-phone"],
			items: [
				{ ...device, id: "laptop", name: "Laptop" },
				{ ...device, id: "old-phone", name: "Phone" },
			],
		};
		const resolved = resolveDevicesData(config);
		assert.deepEqual(resolved.map((item) => item.id), ["laptop"]);
	});
});
