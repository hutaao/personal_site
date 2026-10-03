/** SSR-only helpers: no browser requests, file paths or visitor identifiers. */
import astroPackage from "astro/package.json";
import themePackage from "../../package.json";

// Evaluated once per build: the site's last generated version, not an article's modification date.
export const sidebarBuildInfo = {
	astro: astroPackage.version,
	theme: themePackage.version,
	node: process.version,
	builtAt: new Date(),
};
