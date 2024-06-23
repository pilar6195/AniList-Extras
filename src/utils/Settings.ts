/* eslint-disable @typescript-eslint/no-dynamic-delete */
import Storage from './Storage';
import { anilistModules, malModules, getModule } from './ModuleLoader';

/**
 * Purge unused settings from the storage.
 * This will remove settings for modules that are not registered.
 * This should only be called after all modules have been registered.
 */
export const purgeUnusedSettings = () => {
	const moduleIds = [...anilistModules, ...malModules].map(m => m.id);
	const settings = Storage.getAll();

	for (const key of ['settings', 'moduleStates']) {
		if (!settings[key]) continue;

		let changed = false;

		for (const moduleId in settings[key]) {
			if (!moduleIds.includes(moduleId)) {
				delete settings[key][moduleId];
				changed = true;
			}
		}

		if (changed) {
			Storage.set(key, settings[key]);
		}
	}
};

/**
 * Settings manager for registered modules.
 */
export default class SettingsManager {
	private readonly module: AnilistModule | MalModule;

	private readonly moduleId: string;

	public constructor(moduleId: string, type: 'anilist' | 'mal' = 'anilist') {
		const module = type === 'anilist'
			? getModule.anilist(moduleId)
			: getModule.mal(moduleId);

		if (!module) {
			throw new Error(`Module with id "${moduleId}" not found.`);
		}

		this.module = module;
		this.moduleId = moduleId;
	}

	/**
	 * Get a setting value.
	 * If the setting is not found, it will return the default value passed as the second argument.
	 * If a default value is not provided, it will return the default value from the module settings, if any.
	 */
	public get(key: string, defaultValue?: any) {
		const settings = Storage.get('settings', {});
		const moduleSettings = settings[this.moduleId] ?? {};
		return moduleSettings[key] ?? defaultValue ?? this.module.settingsPage?.[key].default;
	}

	/**
	 * Set a setting value.
	 */
	public set(key: string, value: any) {
		const settings = Storage.get('settings', {});
		const moduleSettings = settings[this.moduleId] ?? {};
		moduleSettings[key] = value;
		settings[this.moduleId] = moduleSettings;
		Storage.set('settings', settings);
	}

	/**
	 * Delete a setting.
	 */
	public remove(key: string) {
		const settings = Storage.get('settings', {});
		const moduleSettings = settings[this.moduleId] ?? {};
		delete moduleSettings[key];
		settings[this.moduleId] = moduleSettings;
		Storage.set('settings', settings);
	}

	public clear() {
		const settings = Storage.get('settings', {});
		delete settings[this.moduleId];
		Storage.set('settings', settings);
	}

	public watch(key: string, callback: (newValue: any, previousValue: any) => void) {
		return Storage.watch('settings', (newValue, previousValue) => {
			const newSetting = newValue?.[this.moduleId]?.[key];
			const previousSetting = previousValue?.[this.moduleId]?.[key];

			if (newSetting !== previousSetting) {
				callback(newSetting, previousSetting);
			}
		});
	}
}
