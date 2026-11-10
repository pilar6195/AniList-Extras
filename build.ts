import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import chokidar from 'chokidar';
import { ZipArchive } from 'archiver';
import { compile as compileSass } from 'sass';
import packageJson from './package.json';

const createAnsiColor = (code: string) => (text: string): string => Bun.enableANSIColors ? `\u001B[${code}m${text}\u001B[39m` : text;
const cyan = createAnsiColor('36');
const gray = createAnsiColor('90');
const green = createAnsiColor('32');
const red = createAnsiColor('31');

const { values: cliFlags } = parseArgs({
	args: process.argv.slice(2),
	options: {
		watch: { type: 'boolean', default: false },
		serve: { type: 'boolean', default: false },
		'serve-port': { type: 'string' },
		sourcemap: { type: 'boolean', default: false },
	},
});

/**
 * Parses the `--serve-port` flag value. Port 0 lets the OS pick a random free port.
 */
const parseServePort = (portFlag: string | undefined): number => {
	if (portFlag === undefined) {
		return 0;
	}

	if (!/^\d+$/.test(portFlag) || Number(portFlag) > 65535) {
		throw new RangeError(`Invalid --serve-port "${portFlag}". Expected an integer between 0 and 65535.`);
	}

	return Number(portFlag);
};

const watchFlag = cliFlags.watch;
const serveFlag = cliFlags.serve;
const includeSourceMaps = cliFlags.sourcemap;
const servePort = parseServePort(cliFlags['serve-port']);

const header = (env: 'extension' | 'userscript' = 'userscript'): string => `
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
// @connect      api.tenrai.org
// @connect      raw.githubusercontent.com
// @grant        GM.xmlHttpRequest
// @run-at       document-end
// ==/UserScript==
const ALEXTRAS_VERSION = '${packageJson.version}';
const ALEXTRAS_DEV = ${watchFlag};
const ALEXTRAS_ENV = '${env}';
`;

async function bundle(env: 'extension' | 'userscript' = 'userscript'): Promise<string> {
	const modulesToExclude: string[] = [];

	const result = await Bun.build({
		entrypoints: ['./src/anilist-extras.user.ts'],
		target: 'browser',
		sourcemap: (includeSourceMaps || watchFlag) ? 'external' : 'none',
		minify: watchFlag ? false : {
			whitespace: true,
			syntax: true,
		},
		plugins: [
			{
				name: 'styles-loader',
				setup(build) {
					build.onLoad({ filter: /\.css$/ }, async args => {
						const cssFile = Bun.file(args.path);
						return {
							contents: await cssFile.text(),
							loader: 'text',
						};
					});
					build.onLoad({ filter: /\.scss$/ }, args => {
						return {
							contents: compileSass(args.path, {
								style: watchFlag ? 'expanded' : 'compressed',
							}).css,
							loader: 'text',
						};
					});
				},
			},
			{
				name: 'remove-polyfill',
				setup(build) {
					// Don't include the polyfill in the userscript build.
					if (env === 'extension') {
						return;
					}

					build.onLoad({ filter: /Polyfill\.ts$/ }, () => ({
						contents: '',
						loader: 'ts',
					}));
				},
			},
			{
				name: 'exclude-modules',
				setup(build) {
					if (!modulesToExclude.length) {
						return;
					}

					build.onLoad({
						filter: new RegExp(modulesToExclude.map(module => {
							const modulePath = path.normalize(`modules/${module}`).replaceAll(/[.\\]/g, '\\$&');
							return `(${modulePath}$)`;
						}).join('|')),
					}, () => ({
						contents: '',
						loader: 'ts',
					}));
				},
			},
		],
	});

	/* Prepend userscript header to output */

	const content = await result.outputs[0].text();
	let output = header(env) + content;

	/* Fix sourcemap offset */
	// We have to do this if we want the sourcemap to work correctly due to the header we added.
	if (result.outputs[0].sourcemap) {
		const sourceMap: SourceMap = await result.outputs[0].sourcemap.json();
		const offset = header(env).split('\n').length - 1;
		const updatedSourceMap = offsetSourceMapLines(sourceMap, offset);
		const b64encoded = Buffer.from(JSON.stringify(updatedSourceMap)).toString('base64');
		output += `//# sourceMappingURL=data:application/json;base64,${b64encoded}`;
	}

	return output;
}

/**
 * Build userscript version.
 */
async function buildUserscript(): Promise<void> {
	const output = await bundle('userscript');

	/* Write userscript to dist directory */

	await Bun.write('./dist/anilist-extras.user.js', output);

	// Watch mode shows the output paths in its status block instead.
	if (!watchFlag) {
		console.log(gray(`[${new Date().toISOString()}]`), `Userscript built. Output written to ${cyan('./dist/anilist-extras.user.js')}`);
	}
}

/**
 * Build browser extension version.
 */
async function buildExtension(): Promise<void> {
	const output = await bundle('extension');

	/* Write extension to .build directory */

	// Full path is needed here due to a bun 1.3.x -> 1.4.x regression where Windows paths are not being normalized.
	await fsAsync.rm(path.join(import.meta.dir, '.build'), { recursive: true, force: true });

	await Bun.write('./.build/anilist-extras.user.js', output);

	// Import and update manifest file
	const manifestFile = Bun.file('./src/manifest.json');
	const manifest = await manifestFile.json();
	manifest.version = packageJson.version;

	// Write manifest file to .build directory
	await Bun.write('./.build/manifest.json', JSON.stringify(manifest));

	// Copy extension icon
	const iconFile = Bun.file('./src/images/icon128.png');
	await Bun.write('./.build/icon128.png', iconFile);

	// Watch mode shows the output paths in its status block instead, and we don't want to zip the extension on every rebuild.
	if (!watchFlag) {
		console.log(gray(`[${new Date().toISOString()}]`), `Extension built. Output written to ${cyan('./.build')} directory.`);

		// Zip extension
		const filePath = `./dist/anilist-extras.browser-${packageJson.version}.zip`;
		const archive = new ZipArchive({
			zlib: { level: 9 },
		}).directory('./.build', false);

		archive.pipe(fs.createWriteStream(filePath));

		await archive.finalize();

		console.log(gray(`[${new Date().toISOString()}]`), `Extension packaged into ${cyan(filePath)}`);
	}
}

/**
 * Build both userscript and browser extension versions.
 */
async function buildAll(): Promise<void> {
	await buildUserscript();
	await buildExtension();
}

type SourceMap = {
	mappings: string;
	[key: string]: unknown;
};

/**
 * Shifts a source map down by the given number of lines.
 */
function offsetSourceMapLines(sourceMap: SourceMap, lineOffset: number): SourceMap {
	return {
		...sourceMap,
		mappings: ';'.repeat(lineOffset) + sourceMap.mappings,
	};
}

/**
 * Formats the block shown at the top of the terminal in watch mode.
 */
function formatWatchStatus(userscriptUrl: string | undefined): string {
	// The userscript URL only exists when serving.
	const mode = userscriptUrl ? 'watch mode, serving' : 'watch mode';

	return [
		`AniList Extras (${mode})`,
		`  Userscript: ${cyan(userscriptUrl ?? './dist/anilist-extras.user.js')}`,
		`  Extension:  ${cyan('./.build')} ${gray('(load unpacked)')}`,
		'',
	].join('\n');
}

/**
 * Describes what started a build, based on the files that changed.
 */
function describeBuildTrigger(changedPaths: string[]): string {
	if (changedPaths.length === 0) {
		return 'Initial build';
	}

	if (changedPaths.length === 1) {
		return `${cyan(changedPaths[0])} changed`;
	}

	return `${changedPaths.length} files changed`;
}

/**
 * Formats the one-line result of a watch mode build.
 */
function formatBuildSummary({ changedPaths, succeeded, durationMs }: {
	changedPaths: string[];
	succeeded: boolean;
	durationMs: number;
}): string {
	const result = succeeded ? green(`Built in ${durationMs}ms.`) : red(`Build failed after ${durationMs}ms.`);
	return `${gray(`[${new Date().toLocaleTimeString()}]`)} ${describeBuildTrigger(changedPaths)}. ${result}`;
}

// Watch for changes and rebuild
if (watchFlag) {
	const rebuildDebounceMs = 100;
	let userscriptUrl: string | undefined;

	// Serve userscript for easy development with Violentmonkey
	// Also only serving if --watch is enabled. No point in serving if not watching.
	// Started before the first build so the status block can show the URL.
	if (serveFlag) {
		const server = Bun.serve({
			port: servePort,
			routes: {
				'/anilist-extras.user.js': {
					GET: () => new Response(Bun.file('./dist/anilist-extras.user.js')),
				},
			},
		});

		userscriptUrl = `${server.url}anilist-extras.user.js`;
	}

	// Files changed while a build is running are collected here and picked up by the next build.
	const pendingChangedPaths = new Set<string>();
	let isBuilding = false;
	let rebuildTimer: ReturnType<typeof setTimeout> | undefined;

	const runWatchBuild = async () => {
		if (isBuilding) {
			return;
		}

		isBuilding = true;
		clearTimeout(rebuildTimer);
		const changedPaths = [...pendingChangedPaths];
		pendingChangedPaths.clear();

		// Only clear when the terminal is interactive so piped logs stay intact.
		if (process.stdout.isTTY) {
			console.clear();
		}

		console.log(formatWatchStatus(userscriptUrl));

		const startTime = performance.now();
		let succeeded = false;

		try {
			await buildAll();
			succeeded = true;
		} catch (error) {
			// Build errors and anything unexpected, like file system errors, end up here so watching continues.
			console.error(error);
		}

		const durationMs = Math.round(performance.now() - startTime);
		console.log(formatBuildSummary({ changedPaths, succeeded, durationMs }));
		console.log(gray('Watching for changes...'));

		// eslint-disable-next-line require-atomic-updates -- Only one runWatchBuild call gets past the guard at a time.
		isBuilding = false;

		// Pick up files that changed while this build was running.
		if (pendingChangedPaths.size > 0) {
			void runWatchBuild();
		}
	};

	// Debounced so saving several files at once only triggers one build.
	const scheduleRebuild = (changedPath: string) => {
		pendingChangedPaths.add(changedPath);
		clearTimeout(rebuildTimer);
		rebuildTimer = setTimeout(() => void runWatchBuild(), rebuildDebounceMs);
	};

	chokidar.watch('./src/', {
		ignoreInitial: true,
	})
		.on('add', scheduleRebuild)
		.on('change', scheduleRebuild)
		.on('unlink', scheduleRebuild);

	await runWatchBuild();
// Build once and exit
} else {
	await buildAll();
}
