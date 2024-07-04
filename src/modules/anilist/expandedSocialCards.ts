import SettingsManager from '@/utils/Settings';
import { $, waitFor } from '@/utils/Helpers';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

import moduleStyles from '@/styles/expandedSocialCards.scss';

registerModule.anilist({
	id: 'expandedSocialCards',
	name: 'Expanded Social Profile Cards',
	description: 'Expands the profile cards on the user socials page for followers and following lists.',
	tags: [
		ModuleTags.Profile,
		ModuleTags.Social,
		ModuleTags.Styles,
	],
	toggleable: true,
	disabledDefault: true,
	settingsPage: {
		styleType: {
			label: 'Style Type',
			description: 'Select the style type for the expanded social profile cards.',
			type: 'select',
			options: {
				style1: 'Style 1',
				style2: 'Style 2',
			},
			default: 'style1',
		},
	},
	styles: moduleStyles,

	validate({ currentPage }) {
		return /^\/user\/.+\/social$/.test(currentPage.pathname);
	},

	async load() {
		const ModuleSettings = new SettingsManager(this.id);
		const targetLoaded = await waitFor('.user-social');

		// If the target element is not found, return.
		if (!targetLoaded) return;

		const styleType = await ModuleSettings.get('styleType', 'style1');

		$('.user-social')!.classList.add(`alextras--${styleType}`);
	},
});
