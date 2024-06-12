import { $, createElement, getAnilistId } from '@/utils/Helpers';
import { registerModule } from '@/utils/ModuleLoader';

registerModule.mal({
	id: 'addAniListLink',

	validate({ pathname }) {
		return /^\/(anime|manga)/.test(pathname);
	},

	async load() {
		if ($('.mal-anilist-link')) return;

		const malId = (/(?:anime|manga)(?:\/|\.php\?id=)(\d+)/.exec(location.href))?.[1];
		const type = (/^\/(anime|manga)\/\d+/.exec(location.pathname))?.[1];
		const anilistId = await getAnilistId(malId!, type as 'anime' | 'manga');

		const headerEl = $('.header-right');

		if (!headerEl) return;

		createElement('a', {
			attributes: {
				target: '_blank',
				href: `https://anilist.co/${type}/${anilistId}/`,
			},
			styles: {
				'margin-left': '1em',
			},
			textContent: 'AniList',
			appendTo: headerEl,
		});
	},
});
