import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import chokidar from 'chokidar';
import archiver from 'archiver';
import packageJson from './package.json';

const header = `
// ==UserScript==
// @name         AniList Extras (Unofficial)
// @namespace    https://github.com/pilar6195
// @version      ${packageJson.version}
// @description  Adds a few additional features to AniList.
// @author       pilar6195
// @downloadURL  https://github.com/pilar6195/AniList-Extras/releases/latest/download/anilist-extras.user.js
// @updateURL    https://github.com/pilar6195/AniList-Extras/releases/latest/download/anilist-extras.user.js
// @source       https://github.com/pilar6195/AniList-Extras
// @match        https://anilist.co/*
// @match        https://myanimelist.net/*
// @connect      graphql.anilist.co
// @connect      api.jikan.moe
// @grant        GM.xmlHttpRequest
// @run-at       document-end
// ==/UserScript==
const ALEXTRAS_VERSION = '${packageJson.version}';
`;

async function build() {
	const result = await Bun.build({
		entrypoints: ['./src/anilist-extras.user.ts'],
		target: 'browser',
	});

	if (!result.success) {
		console.error('Build failed with errors:');
		console.log('');
		for (const log of result.logs) {
			console.error(log);
		}

		if (process.argv.includes('--watch')) {
			return;
		} else {
			process.exit(1);
		}
	}

	/* Prepend userscript header to output */

	const content = await result.outputs[0].text();
	const output = header + content;

	/* Write userscript to dist directory */

	await Bun.write('./dist/anilist-extras.user.js', output);
	console.log(`[${new Date().toISOString()}]`, 'Userscript built. Output written to "./dist/anilist-extras.user.js"');

	/* Write extension to dist directory */

	await fsAsync.rm('./.build', { recursive: true });

	await Bun.write('./.build/anilist-extras.user.js', output);

	// Import and update manifest file
	const manifestFile = Bun.file('./src/manifest.json');
	const manifest = await manifestFile.json();
	manifest.version = packageJson.version;

	// Write manifest file to dist directory
	await Bun.write('./.build/manifest.json', JSON.stringify(manifest));

	// Copy extension icon
	const iconFile = Bun.file('./src/images/icon128.png');
	await Bun.write('./.build/icon128.png', iconFile);

	console.log(`[${new Date().toISOString()}]`, 'Extension built. Output written to "./.build" directory. It can be loaded as an unpacked extension in your browser.');

	// If we're watching for changes, we don't want to zip the extension every time we build.
	if (!process.argv.includes('--watch')) {
		// Zip extension
		const filePath = `./dist/anilist-extras.browser-${packageJson.version}.zip`;
		const archive = archiver('zip', {
			zlib: { level: 9 },
		}).directory('./.build', false);

		archive.pipe(fs.createWriteStream(filePath));

		await archive.finalize();

		console.log(`[${new Date().toISOString()}]`, `Extension packaged into "${filePath}"`);
	}
}

// Watch for changes and rebuild
if (process.argv.includes('--watch')) {
	chokidar.watch('src/**/*', {
		ignoreInitial: true,
	})
		.on('add', () => void build())
		.on('change', () => void build())
		.on('unlink', () => void build());

	await build();

	console.log('Watching for changes...');

	// Serve userscript for easy development with Violentmonkey
	// Also only serving if --watch is enabled. No point in serving if not watching.
	if (process.argv.includes('--serve')) {
		const server = Bun.serve({
			fetch(request) {
				const url = new URL(request.url);

				if (request.method === 'GET' && url.pathname === '/anilist-extras.user.js') {
					return new Response(Bun.file('dist/anilist-extras.user.js'));
				}

				return new Response('Not Found', { status: 404 });
			},
		});

		console.log(`Serving userscript at ${server.url}anilist-extras.user.js`);
	}
// Build once and exit
} else {
	void build();
}
