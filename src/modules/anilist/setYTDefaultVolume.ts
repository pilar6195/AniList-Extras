import SettingsManager from '@/utils/Settings';
import { $$, observe } from '@/utils/Helpers';
import { registerModule, ModuleTags } from '@/utils/ModuleLoader';

let observer: MutationObserver;

registerModule.anilist({
	id: 'setYTDefaultVolume',
	name: 'YouTube Default Volume',
	description: 'Set the default volume for all embedded YouTube videos.',
	tags: [
		ModuleTags.Media,
		ModuleTags.Utiliy,
	],
	toggleable: true,
	disabledDefault: true,
	settingsPage: {
		defaultVolume: {
			type: 'number',
			label: 'Default Volume',
			description: 'The default volume for YouTube videos. 0 is muted, 100 is full volume.',
			step: 1,
			min: 0,
			max: 100,
			default: 50,
		},
	},

	validate() {
		// Always load the module.
		return true;
	},

	validateUnload() {
		// We only want to unload the module when it's disabled in the settings.
		return false;
	},

	async load() {
		const ModuleSettings = new SettingsManager(this.id);

		const updateYoutubeIframes = () => {
			const iframes = $$('iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"]') as HTMLIFrameElement[];

			for (const iframe of iframes) {
				if (iframe.dataset['volumeSet']) continue;

				iframe.setAttribute('onload', `this.contentWindow.postMessage(JSON.stringify({
					event: 'command',
					func: 'setVolume',
					args: [${ModuleSettings.get('defaultVolume')}]
				}), '*')`);

				const iframeUrl = new URL(iframe.src);
				iframeUrl.searchParams.set('enablejsapi', '1');
				iframe.src = iframeUrl.href;
				iframe.dataset['volumeSet'] = 'true';
			}
		};

		observer = observe(document.body, () => updateYoutubeIframes());
		updateYoutubeIframes();
	},

	unload() {
		observer?.disconnect();
	},
});
