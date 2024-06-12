import { $, $$, waitFor, createElement, removeElements, getMalData } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addMalScore',

	validate({ pathname }) {
		return /^\/(anime|manga)\/\d+/.test(pathname);
	},

	async load({ media }) {
		const targetLoaded = await waitFor('.sidebar .data-set');

		// If the target element or mal id is not found, return.
		if (!targetLoaded || !media?.malId) return;

		// Fetch MAL data.
		const malData = await getMalData(media.malId, media.type as 'anime' | 'manga');

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
		removeElements('.alextras--mal-score');
	},
});
