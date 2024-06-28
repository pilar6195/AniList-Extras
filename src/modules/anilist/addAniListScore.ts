import { $, $$, waitFor, createElement, removeElements } from '@/utils/Helpers';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

registerModule.anilist({
	id: 'addAnilistScore',
	name: 'AniList Score',
	description: 'Adds the average AniList score above the sidebar on anime/manga pages.',
	tags: [
		ModuleTags.Media,
		ModuleTags.Metadata,
	],
	toggleable: true,

	validate({ currentPage }) {
		return /^\/(anime|manga)\/\d+/.test(currentPage.pathname);
	},

	validateUnload({ currentPage, previousPage }) {
		const match1 = (/\/((anime|manga)\/\d+)/i.exec(currentPage.pathname))?.[1];
		const match2 = (/\/((anime|manga)\/\d+)/i.exec(previousPage.pathname))?.[1];
		return match1 !== match2;
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
		if (await waitFor('.rankings .ranking', 100)) {
			const attrEl = $('.rankings .ranking');
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
