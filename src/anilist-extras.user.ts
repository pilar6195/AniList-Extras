import '@/utils/Polyfill';
import '@/utils/Logs';
import { observe, addStyles, getMalId } from './utils/Helpers';
import { anilistModules, malModules, activeModules, ModuleEmitter, ModuleEvents } from './utils/ModuleLoader';

/* Anilist Modules */
import '@/modules/anilist/settingsPage';
import '@/modules/anilist/addMalLink';
import '@/modules/anilist/addMalScore';
import '@/modules/anilist/addAniListScore';
import '@/modules/anilist/addMalScoreAndLink';
import '@/modules/anilist/addViewToggles';
import '@/modules/anilist/addMalCharacters';
import '@/modules/anilist/addOpEdSongs';
import '@/modules/anilist/addSocialsFollowsCount';
import '@/modules/anilist/addSocialsForumsCount';
import '@/modules/anilist/addReviewRatings';
import '@/modules/anilist/addSeasonLink';

/* Mal Modules */
import '@/modules/mal/addAniListLink';

// Add global styles.
addStyles(`
	.alextras--hide {
		display: none !important;
	}

	/* View Switchers */

	.alextras--view-switch-toggle {
		float: right;
	}

	.alextras--view-switch-toggle span:hover {
		cursor: pointer;
	}

	.alextras--view-switch-toggle span.alextras--active {
		color: rgb(var(--color-blue))
	}
`);

/* eslint-disable promise/prefer-await-to-then */

let currentPage: URL;

if (location.host === 'anilist.co') {
	let contextId: string;

	observe(document.body, async () => {
		if (location.href !== currentPage?.href) {
			contextId = crypto.randomUUID();
			const previousPage = currentPage;
			currentPage = new URL(location.href); // Basically cloning the window.location object.

			console.log('Navigated:', currentPage.href);

			// Media data to send to the modules when available.
			const media: AnilistModuleLoadParams['media'] = {
				type: (/^\/(anime|manga)\/\d+/.exec(location.pathname))?.[1],
				id: (/^\/(?:anime|manga)\/(\d+)/.exec(location.pathname))?.[1],
				malId: false,
			};

			// Prefetch common data for media entries.
			// Doing this here to prevent duplicate requests
			// in the case that more than 1 module needs it.
			if (media.id && media.type) {
				media.malId = await getMalId(media.id, media.type as 'anime' | 'manga'); // Mal Id
			}

			for (const module of anilistModules) {
				if (module.disabled) continue;

				// This is inside a iife so modules don't delay each other.
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				(async (media, currentContextId) => {
					try {
						if (typeof module.unload === 'function' && activeModules.has(module.id)) {
							const unloadStartTime = performance.now();
							let shouldUnload = true;

							if (typeof module.validateUnload === 'function') {
								shouldUnload = await module.validateUnload({ currentPage, previousPage });
							}

							if (shouldUnload) {
								await module.unload({ currentPage, previousPage });
								const unloadEndTime = performance.now();
								console.log(`Unloaded module: ${module.id} [${(unloadEndTime - unloadStartTime).toFixed(2)}ms]`);
								activeModules.delete(module.id);
								ModuleEmitter.emit(ModuleEvents.Unload, module.id);
							}
						} else if (activeModules.has(module.id)) {
							// If there is no unload function, just remove it from
							// the activeModules set so it can be reloaded.
							activeModules.delete(module.id);
						}
					} catch (error: any) {
						console.error('Module unload error:', module.id, error);
						activeModules.delete(module.id);
						ModuleEmitter.emit(ModuleEvents.UnloadError, module.id, error);
					}

					if (activeModules.has(module.id)) return;

					const loadStartTime = performance.now();

					try {
						const shouldLoad = await module.validate({ currentPage, previousPage, media });
						if (!shouldLoad) return;
						ModuleEmitter.emit(ModuleEvents.Validate, module.id);
					} catch (error: any) {
						console.error('Module validation error:', module.id, error);
						ModuleEmitter.emit(ModuleEvents.ValidateError, module.id, error);
						return;
					}

					// If the contextId has changed, it means the user navigated.
					if (currentContextId !== contextId) return;

					try {
						await module.load({ currentPage, previousPage, media });
						const loadEndTime = performance.now();
						console.log(`Loaded module: ${module.id} [${(loadEndTime - loadStartTime).toFixed(2)}ms]`);
						activeModules.add(module.id);
						ModuleEmitter.emit(ModuleEvents.Load, module.id);
					} catch (error: any) {
						console.error('Module error:', module.id, error);
						activeModules.add(module.id); // Consider it loaded even if it errored.
						ModuleEmitter.emit(ModuleEvents.LoadError, module.id, error);
					}
				})(media, contextId);
			}
		}
	});
}

if (location.host === 'myanimelist.net') {
	currentPage = new URL(location.href);

	console.log('Navigated:', currentPage.href);

	for (const module of malModules) {
		if (module.disabled) continue;

		// eslint-disable-next-line @typescript-eslint/no-loop-func
		(async () => {
			const startTime = performance.now();

			try {
				const shouldLoad = await module.validate(currentPage);
				if (!shouldLoad) return;
				ModuleEmitter.emit(ModuleEvents.Validate, module.id);
			} catch (error: any) {
				console.error('Module validation error:', module.id, error);
				ModuleEmitter.emit(ModuleEvents.ValidateError, module.id, error);
				return;
			}

			try {
				await module.load();
				const endTime = performance.now();
				console.log(`Loaded module: ${module.id} in ${(endTime - startTime).toFixed(2)}ms`);
				activeModules.add(module.id);
				ModuleEmitter.emit(ModuleEvents.Load, module.id);
			} catch (error: any) {
				console.error('Module error:', module.id, error);
				activeModules.add(module.id);
				ModuleEmitter.emit(ModuleEvents.LoadError, module.id, error);
			}
		})();
	}
}
