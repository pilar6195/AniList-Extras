import { $, $$, waitFor, createElement, removeElements } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addAnilistScoreRanking',

	validate({ pathname }) {
		return /^\/(anime|manga)\/\d+/.test(pathname);
	},

	async load() {
		const targetLoaded = await waitFor(() => {
			return Boolean($('.sidebar .rankings')) && Boolean($('.sidebar .data-set'));
		});

		// If the target element is not found, return.
		if (!targetLoaded) return;

		// Fetch Anilist score.
		const scoreElement = $$('.sidebar .data-set').find(el => /average score/i.test(el.textContent!));
		const anilistScore = scoreElement?.querySelector('.value')?.textContent;

		let attrName: string;

		// In some cases this element may exist. We will wait/check to see if it
		// does and if not we will create it ourselves.
		if (await waitFor('a.ranking', 500)) {
			const attrEl = $('a.ranking');
			attrName = attrEl!.attributes[0].name;
		} else {
			// Setting the "data-v-" attribute manually is not ideal as
			// this could change in the future but it'll do for now.
			attrName = 'data-v-a6e466b2';
		}

		const container = createElement('div', {
			attributes: {
				[attrName]: '',
				class: 'ranking alextras--anilist-score',
				target: '_blank',
			},
			styles: {
				'margin-bottom': '16px',
			},
			children: [
				createElement('span', {
					attributes: {
						[attrName]: '',
						class: 'rank-text',
					},
					styles: {
						'text-align': 'center',
						width: '100%',
					},
					textContent: `Average Score: ${anilistScore ?? 'N/A'}`,
				}),
			],
		});

		// Ensure the element is inserted in the order we want.
		if ($('.ranking.alextras--mal-score')) {
			$('.ranking.alextras--mal-score')!.before(container);
		} else {
			$('div.rankings')!.append(container);
		}
	},

	unload() {
		removeElements('.alextras--anilist-score');
	},
});