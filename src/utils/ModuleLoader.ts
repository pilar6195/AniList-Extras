/* eslint-disable sonarjs/no-empty-collection */
import Storage from './Storage';
import EventEmitter from './EventEmitter';

export const ModuleEvents = {
	Register: 'module:register',
	Unload: 'module:unload',
	UnloadError: 'module:unload:error',
	Validate: 'module:validate',
	ValidateError: 'module:validate:error',
	Load: 'module:load',
	LoadError: 'module:load:error',
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

const moduleStates: Record<string, boolean> = Storage.get('moduleStates', {});

export const registerModule = {
	anilist(module: AnilistModule) {
		if (!module.id) {
			console.error('Module id is required to register a module.');
			return;
		}

		if (anilistModules.some(m => m.id === module.id)) {
			console.error(`Anilist module with id "${module.id}" is already registered.`);
			return;
		}

		const disableModule = typeof moduleStates[module.id] === 'boolean'
			? !moduleStates[module.id]
			: module.disabledDefault ?? false;

		anilistModules.push({
			togglable: false,
			...module,
			disabled: disableModule,
			enable() {
				if (!this.disabled) return;
				this.disabled = false;
				moduleStates[this.id] = true;
				Storage.set('moduleStates', moduleStates);
			},
			async disable() {
				if (this.disabled) return;
				this.disabled = true;
				moduleStates[this.id] = false;
				Storage.set('moduleStates', moduleStates);

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

		const disableModule = typeof moduleStates[module.id] === 'boolean'
			? moduleStates[module.id]
			: module.disabledDefault ?? false;

		malModules.push({
			togglable: false,
			...module,
			disabled: disableModule,
			enable() {
				this.disabled = false;
				moduleStates[this.id] = false;
				Storage.set('moduleStates', moduleStates);
			},
			async disable() {
				this.disabled = true;
				moduleStates[this.id] = true;
				Storage.set('moduleStates', moduleStates);
			},
		});

		ModuleEmitter.emit(ModuleEvents.Register, module.id);
	},
};
