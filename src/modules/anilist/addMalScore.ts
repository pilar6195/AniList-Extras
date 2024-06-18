import { $, $$, waitFor, createElement, removeElements, malApi, ONE_HOUR } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addMalScore',
	name: 'MyAnimeList Score',
	description: 'Add the MyAnimeList score to the sidebar on anime/manga pages.',
	togglable: true,

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+/.test(currentPage.pathname);
	},

	validateUnload({ currentPage, previousPage }) {
		const match1 = (/\/((anime|manga)\/\d+)/i.exec(currentPage.pathname))?.[1];
		const match2 = (/\/((anime|manga)\/\d+)/i.exec(previousPage.pathname))?.[1];
		return match1 !== match2;
	},

	async load({ media }) {
		const targetLoaded = await waitFor('.sidebar .data-set');

		// If the target element or mal id is not found, return.
		if (!targetLoaded || !media.malId) return;

		// Fetch MAL data.
		const { data: malData } = await malApi(`${media.type}/${media.malId}`, ONE_HOUR) as MalAnimeResponse;

		const attrName = $('.data-set')!.attributes[0].name;

		const container = createElement('div', {
			attributes: {
				[attrName]: '',
				class: 'data-set alextras--mal-score',
			},
			children: [
				createElement('div', {
					attributes: {
						[attrName]: '',
						class: 'type',
					},
					textContent: 'MyAnimeList Score',
				}),
				createElement('div', {
					attributes: {
						[attrName]: '',
						class: 'value',
					},
					textContent: `${malData.score ?? 'N/A'}`,
				}),
			],
		});

		const targetNode = $$('.data-set').find(el => /popularity/i.test(el.textContent!));

		if (targetNode) {
			targetNode.before(container);
		} else {
			$('.data')!.append(container);
		}
	},

	unload() {
		removeElements('.data-set.alextras--mal-score');
	},
});
