import Storage from './Storage';

/* Make logs a bit more fancy */

const consoleMethods = ['log', 'info', 'error', 'warn', 'debug', 'trace', 'group', 'groupCollapsed'] as const;
const toggleableMethods = ['log', 'info', 'debug', 'trace', 'group', 'groupCollapsed'] as const;

type ConsoleMethod = typeof consoleMethods[number];

const originalMethods = {} as Record<ConsoleMethod, Console[ConsoleMethod]>;

for (const method of consoleMethods) {
	originalMethods[method] = console[method];
}

export const enableLogs = () => {
	for (const method of consoleMethods) {
		console[method] = originalMethods[method].bind(
			console,
			'%cAnilist Extras',
			'color: rgb(159,173,189); background: #151f2e; padding: 3px 5px; font-weight: bold; border-radius: 5px;',
		);
	}
};

export const disableLogs = () => {
	for (const method of toggleableMethods) {
		console[method] = () => {};
	}
};

// Enable logs intially. Even if we disable this later, we still want to style the warn and error logs.
enableLogs();

// Disable logs in production (except for warnings or errors)
if (!Storage.get('enableLogs', ALEXTRAS_DEV)) {
	disableLogs();
}

Storage.watch('enableLogs', (value) => {
	const enable = typeof value === 'boolean' ? value : ALEXTRAS_DEV;
	if (enable) {
		enableLogs();
	} else {
		disableLogs();
	}
});
