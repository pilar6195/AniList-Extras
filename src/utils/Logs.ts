/* Make logs a bit more fancy */

const methods = ['log', 'info', 'error', 'warn', 'debug', 'group', 'groupCollapsed'] as const;

type ConsoleMethod = typeof methods[number];

for (const method of methods) {
	const _method = console[method as ConsoleMethod];
	console[method as ConsoleMethod] = _method.bind(
		console,
		'%cAnilist Extras',
		'color: rgb(159,173,189); background: #151f2e; padding: 3px 5px; font-weight: bold; border-radius: 5px;',
	);
}
