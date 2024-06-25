import { $, removeElements, addStyles } from '@/utils/Helpers';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';
import SettingsManager from '@/utils/Settings';

registerModule.anilist({
	id: 'altScrollbars',
	name: 'Alternative Scrollbars',
	description: 'Replaces the default scrollbars with a alternative design. Requires a page refresh.',
	togglable: true,
	tags: [
		ModuleTags.Global,
		ModuleTags.Styles,
	],
	disabledDefault: true,
	settingsPage: {
		thinScrollbar: {
			type: 'checkbox',
			label: 'Thin Scrollbar',
			description: 'Makes the scrollbar thinner.',
			default: true,
		},
		coloredScrollbar: {
			type: 'checkbox',
			label: 'Colored Scrollbar',
			description: 'Alternating colors for the scrollbar. Set the colors below.',
			default: true,
		},
		thumbColor: {
			type: 'color',
			label: 'Thumb Color',
			description: 'Color of the scrollbar thumb.',
			default: '#3db4f2',
		},
		trackColor: {
			type: 'color',
			label: 'Track Color',
			description: 'Color of the scrollbar track.',
			default: '#151f2e',
		},
	},

	validate() {
		// Load on any page assuming we haven't already created the element.
		return !$('.alextras--scrollbar-styles');
	},

	validateUnload() {
		// Only unload if the element doesn't exist for some reason.
		return !$('.alextras--scrollbar-styles');
	},

	async load() {
		const ModuleSettings = new SettingsManager(this.id);
		const thumbColor = ModuleSettings.get('thumbColor');
		const trackColor = ModuleSettings.get('trackColor');

		if (ModuleSettings.get('thinScrollbar')) {
			addStyles('* { scrollbar-width: thin; }', 'alextras--scrollbar-styles');
		}

		if (ModuleSettings.get('coloredScrollbar')) {
			addStyles(`* { scrollbar-color: ${thumbColor} ${trackColor}; }`, 'alextras--scrollbar-styles');
		}
	},

	unload() {
		removeElements('.alextras--scrollbar-styles');
	},
});
