import '@/utils/Polyfill';
import '@/utils/Logs';
import { observe, addStyles, getMalId } from './utils/Helpers';
import { anilistModules, malModules } from './utils/ModuleLoader';

/* Anilist Modules */
import '@/modules/anilist/addABLink';
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
import '@/modules/anilist/addClearCacheButton';

/* Mal Modules */
import '@/modules/mal/addAniListLink';

// Add global styles.
addStyles(`
	.alextras--hide {
		display: none !important;
	}

	/* -------------- */
	/* View Switchers */
	/* -------------- */

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
	observe(document.body, async () => {
		if (location.href !== currentPage?.href) {
			const previousPage = currentPage;
			currentPage = new URL(location.href); // Basically cloning the window.location object.

			console.log('Navigated:', currentPage.href);

			// Media data to send to the modules when available.
			const media: ModuleLoadParams['media'] = {
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

				if (typeof module.unload === 'function' && previousPage && module.validate(previousPage)) {
					module.unload({ currentPage, previousPage });
					console.log('Unloaded:', module.id);
				}

				if (module.validate(currentPage)) {
					const startTime = performance.now();
					module.load({ currentPage, media })
						.then(() => {
							const endTime = performance.now();
							console.log(`Loaded: "${module.id}" in ${(endTime - startTime).toFixed(2)}ms`);
						})
						.catch(error => console.error('Module load error:', module.id, error));
				}
			}
		}
	});
}

if (location.host === 'myanimelist.net') {
	currentPage = new URL(location.href);

	console.log('Navigated:', currentPage.href);

	for (const module of malModules) {
		if (module.disabled) continue;

		if (module.validate(currentPage)) {
			const startTime = performance.now();
			module.load({})
				.then(() => {
					const endTime = performance.now();
					console.log(`Loaded: "${module.id}" in ${(endTime - startTime).toFixed(2)}ms`);
				})
				.catch(error => console.error('Module load error:', module.id, error));
		}
	}
}
