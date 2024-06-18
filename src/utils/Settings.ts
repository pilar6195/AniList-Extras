import Storage from './Storage';
import { getModule } from './ModuleLoader';

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
	 * Set a setting value.
	 */
	public set(key: string, value: any) {
		const moduleSettings = Storage.get(this.moduleId, {});
		moduleSettings[key] = value;
		Storage.set(this.moduleId, moduleSettings);
	}

	/**
	 * Get a setting value.
	 * If the setting is not found, it will return the default value from the module settings.
	 * If the setting is not specified in the module settings, it will return the default value passed as the second argument.
	 */
	public get(key: string, defaultValue?: any) {
		const moduleSettings = Storage.get(this.moduleId, {});
		return moduleSettings[key] ?? this.module.settingsPage?.[key].default ?? defaultValue;
	}

	/**
	 * Delete a setting.
	 */
	public remove(key: string) {
		const moduleSettings = Storage.get(this.moduleId, {});
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete moduleSettings[key];
		Storage.set(this.moduleId, moduleSettings);
	}
}
