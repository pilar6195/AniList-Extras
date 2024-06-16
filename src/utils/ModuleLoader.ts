import EventEmitter from '@/utils/EventEmitter';

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

export const anilistModules: AnilistModule[] = [];

export const malModules: MalModule[] = [];

export const registerModule = {
	anilist(module: AnilistModule) {
		if (anilistModules.some(m => m.id === module.id)) {
			console.error(`Anilist module with id "${module.id}" is already registered.`);
			return;
		}

		anilistModules.push(module);
		ModuleEmitter.emit(ModuleEvents.Register, module.id);
	},
	mal(module: MalModule) {
		if (malModules.some(m => m.id === module.id)) {
			console.error(`MAL module with id "${module.id}" is already registered.`);
			return;
		}

		malModules.push(module);
		ModuleEmitter.emit(ModuleEvents.Register, module.id);
	},
};
