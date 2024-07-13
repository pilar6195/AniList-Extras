import Storage from './Storage';

/* Make logs a bit more fancy */

const consoleMethods = ['log', 'info', 'error', 'warn', 'debug', 'trace', 'group', 'groupCollapsed'] as const;
const toggleableMethods = ['log', 'info', 'debug', 'trace', 'group', 'groupCollapsed'] as const;

type ConsoleMethod = typeof consoleMethods[number];
type ToggleableMethod = typeof toggleableMethods[number];

let enableLogs = true;

// eslint-disable-next-line no-global-assign
window.console = new Proxy(window.console, {
	get(console, prop) {
		// Return the original console method if it's not a method we want to modify
		if (!consoleMethods.includes(prop as ConsoleMethod)) {
			return Reflect.get(console, prop);
		}

		// Disable logs if the method is toggleable and the logs are disabled
		if (!enableLogs && toggleableMethods.includes(prop as ToggleableMethod)) {
			return () => {};
		}

		// Add a prefix to the log message
		return console[prop as ConsoleMethod].bind(
			console,
			'%cAnilist Extras',
			'color: rgb(159,173,189); background: #151f2e; padding: 3px 5px; font-weight: bold; border-radius: 5px;',
		);
	},
});

// Disable logs in production (except for warnings or errors)
if (!Storage.get('enableLogs', ALEXTRAS_DEV)) {
	enableLogs = false;
}

Storage.watch('enableLogs', (value) => {
	const enable = typeof value === 'boolean' ? value : ALEXTRAS_DEV;
	if (enable) {
		enableLogs = true;
	} else {
		enableLogs = false;
	}
});
