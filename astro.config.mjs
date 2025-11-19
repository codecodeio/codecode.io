import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";
import compress from "@playform/compress";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import AutoImport from "astro-auto-import";
import icon from "astro-icon";

// ...existing code...
const baseUrl = "https://www.codecode.io";

// https://astro.build/config
export default defineConfig({
	site: baseUrl,
	trailingSlash: 'always',
	adapter: netlify({
		imageCDN: false,
	}),
	redirects: {
		"/admin": "/keystatic",
	},
	// i18n configuration must match src/config/translations.json.ts
	i18n: {
		defaultLocale: "en",
		locales: ["en"],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	markdown: {
		shikiConfig: {
			// Shiki Themes: https://shiki.style/themes
			theme: "css-variables",
			wrap: true,
		},
	},
	integrations: [
		// example auto import component into blog post mdx files
		AutoImport({
			imports: [
				// https://github.com/delucis/astro-auto-import
				"@components/admonition/Admonition.astro",
			],
		}),
		mdx(),
		react(),
		icon(),
		keystatic(),
		sitemap({
			filter: (page) => {
			const excludedPaths = [
			"/contact",
			"/elements",
			"/overview",
			"/projects"
,			"/resume",
			"/tools",
			"/privacy-policy",
			"coming-soon",
			];
			// Remove baseUrl from page for comparison
			const path = page.replace(baseUrl, "");
			if (
			excludedPaths.includes(path) ||
			path.startsWith("/projects/")
			) {
			return false;
			}
			return true;
		},
		}),
		compress({
			HTML: true,
			JavaScript: true,
			CSS: false, // enabling this can cause issues
			Image: false, // astro:assets handles this. Enabling this can dramatically increase build times
			SVG: false, // astro-icon handles this
		}),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
