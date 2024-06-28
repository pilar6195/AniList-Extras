/* eslint-disable @typescript-eslint/no-dynamic-delete, sonarjs/no-empty-collection */
import Storage from './Storage';
import EventEmitter from './EventEmitter';
import { $, addStyles, removeElements } from './Helpers';

export const ModuleTags = {
	Global: 'Global',
	Home: 'Home',
	Profile: 'Profile',
	Media: 'Media',
	Social: 'Social',
	Styles: 'Styles',
	Metadata: 'Metadata',
	Utiliy: 'Utility',
	External: 'External',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type ModuleTags = typeof ModuleTags[keyof typeof ModuleTags];

export const ModuleEvents = {
	Register: 'module:register',
	Unload: 'module:unload',
	UnloadError: 'module:unload:error',
	Validate: 'module:validate',
	ValidateError: 'module:validate:error',
	Load: 'module:load',
	LoadError: 'module:load:error',
	Navigate: 'module:navigate',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
type ModuleEvents = typeof ModuleEvents[keyof typeof ModuleEvents];

type ModuleEventArguments = {
	[ModuleEvents.Register]: [string];
	[ModuleEvents.Unload]: [string];
	[ModuleEvents.UnloadError]: [string, any];
	[ModuleEvents.Validate]: [string];
	[ModuleEvents.ValidateError]: [string, any];
	[ModuleEvents.Load]: [string];
	[ModuleEvents.LoadError]: [string, any];
	[ModuleEvents.Navigate]: [URL, URL?];
};

export const ModuleEmitter: {
	emit<T extends ModuleEvents>(event: T, ...args: ModuleEventArguments[T]): void;
	on<T extends ModuleEvents>(event: T, listener: (...args: ModuleEventArguments[T]) => void): void;
	off<T extends ModuleEvents>(event: T, listener: (...args: ModuleEventArguments[T]) => void): void;
	once<T extends ModuleEvents>(event: T, listener: (...args: ModuleEventArguments[T]) => void): void;
} = new EventEmitter();

type ModuleToggles = {
	disabled: boolean;
	enable(): void;
	disable(): Promise<void>;
	insertStyles(): void;
	removeStyles(): void;
};

export const anilistModules: (AnilistModule & ModuleToggles)[] = [];

export const malModules: (MalModule & ModuleToggles)[] = [];

export const activeModules = new Set<string>();

export const getModule = {
	anilist(id: string) {
		return anilistModules.find(m => m.id === id);
	},
	mal(id: string) {
		return malModules.find(m => m.id === id);
	},
};

export const ModuleStates = {
	get(moduleId: string, defaultState?: boolean) {
		const moduleStates: Record<string, boolean> = Storage.get('moduleStates', {});
		return moduleStates[moduleId] ?? defaultState;
	},

	set(moduleId: string, state: boolean) {
		const moduleStates = Storage.get('moduleStates', {});
		moduleStates[moduleId] = state;
		Storage.set('moduleStates', moduleStates);
	},

	remove(moduleId: string) {
		const moduleStates = Storage.get('moduleStates', {});
		delete moduleStates[moduleId];
		Storage.set('moduleStates', moduleStates);
	},

	clear() {
		Storage.set('moduleStates', {});
	},
};

export const registerModule = {
	anilist(module: (AnilistModule & { tags?: ModuleTags[] })) {
		if (!module.id) {
			console.error('Module id is required to register a module.');
			return;
		}

		if (anilistModules.some(m => m.id === module.id)) {
			console.error(`Anilist module with id "${module.id}" is already registered.`);
			return;
		}

		const moduleState = ModuleStates.get(module.id, !(module.disabledDefault ?? false));

		anilistModules.push({
			togglable: false,
			...module,
			disabled: !moduleState,
			enable() {
				if (!this.disabled) return;
				this.disabled = false;
				ModuleStates.set(this.id, true);
				this.insertStyles();
			},
			async disable() {
				if (this.disabled) return;
				this.disabled = true;
				ModuleStates.set(this.id, false);
				this.removeStyles();

				// Unload the module if it is currently active.
				if (typeof module.unload === 'function' && activeModules.has(module.id)) {
					try {
						const unloadStartTime = performance.now();
						await module.unload();
						const unloadEndTime = performance.now();
						console.log(`Unloaded module: ${module.id} [${(unloadEndTime - unloadStartTime).toFixed(2)}ms]`);
						activeModules.delete(module.id);
						ModuleEmitter.emit(ModuleEvents.Unload, module.id);
					} catch (error: any) {
						console.error('Module unload error:', module.id, error);
						activeModules.delete(module.id);
						ModuleEmitter.emit(ModuleEvents.UnloadError, module.id, error);
					}
				}
			},
			insertStyles() {
				if (!module.styles || $(`style.alextras--module-${module.id}-styles`)) return;
				addStyles(module.styles, `alextras--module-${module.id}-styles`);
			},
			removeStyles() {
				removeElements(`style.alextras--module-${module.id}-styles`);
			},
		});

		ModuleEmitter.emit(ModuleEvents.Register, module.id);
	},
	mal(module: MalModule) {
		if (!module.id) {
			console.error('Module id is required to register a module.');
			return;
		}

		if (malModules.some(m => m.id === module.id)) {
			console.error(`MAL module with id "${module.id}" is already registered.`);
			return;
		}


		const moduleState = ModuleStates.get(module.id, !(module.disabledDefault ?? false));

		malModules.push({
			togglable: false,
			...module,
			disabled: !moduleState,
			enable() {
				this.disabled = false;
				ModuleStates.set(this.id, true);
				this.insertStyles();
			},
			async disable() {
				this.disabled = true;
				ModuleStates.set(this.id, false);
				this.removeStyles();
			},
			insertStyles() {
				if (!module.styles || $(`style.alextras--module-${module.id}-styles`)) return;
				addStyles(module.styles, `alextras--module-${module.id}-styles`);
			},
			removeStyles() {
				removeElements(`style.alextras--module-${module.id}-styles`);
			},
		});

		ModuleEmitter.emit(ModuleEvents.Register, module.id);
	},
};
