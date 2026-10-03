/** SSR-only helpers: no browser requests, file paths or visitor identifiers. */
import astroPackage from "astro/package.json";
import themePackage from "../../package.json";

// The module is evaluated once during the build. Never label render time as an update date.
export const sidebarBuildInfo = {
	astro: astroPackage.version,
	theme: themePackage.version,
	node: process.version,
	builtAt: new Date(),
};
