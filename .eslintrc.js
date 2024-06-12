module.exports = {
	root: true,
	extends: [
		'neon/common',
		'neon/browser',
		'neon/typescript',
		'neon/prettier',
	],
	parserOptions: {
		project: ['./tsconfig.json'],
	},
	ignorePatterns: ['dist/**', '**/*.js'],
	env: {
		browser : true,
		greasemonkey: true,
	},
	rules: {
		'@typescript-eslint/comma-dangle': [2, 'always-multiline'],
		'@typescript-eslint/comma-spacing': [2, { after: true }],
		'@typescript-eslint/indent': [2, 'tab', { SwitchCase: 1 }],
		'@typescript-eslint/no-extra-semi': 2,
		'@typescript-eslint/quotes': [2, 'single', { avoidEscape: true }],
		'@typescript-eslint/semi': [2, 'always', { omitLastInOneLineBlock: false }],
		'typescript-sort-keys/interface': 0,

		// Disable normal rules that are covered by @typescript-esLint
		'comma-dangle': 0,
		'comma-spacing': 0,
		indent: 0,
		quotes: 0,
		semi: 0,

		// Extra Rules
		'consistent-return': 0,
		'eol-last': 2,
		'func-names': 0,
		'id-length': 0,
		'import/order': 0,
		'line-comment-position': 0,
		'no-extra-semi': 0,
		'no-inline-comments': 0,
		'no-multi-spaces': 2,

		'sonarjs/no-unused-collection': 0,

		// WIP
		'no-shadow': 0,
		'no-warning-comments': 0,
		'no-trailing-spaces': 2,
		'object-curly-newline': 0,
		'object-curly-spacing': 2,
		'object-property-newline': 0,
		'padded-blocks': 2,
		'prefer-named-capture-group': 0,
		'quote-props': [2, 'as-needed'],
		'semi-spacing': [2, { before: false, after: true }],
		'semi-style': [2, 'last'],

		'promise/prefer-await-to-callbacks': 0,

		'unicorn/numeric-separators-style': 0,
		'unicorn/no-array-method-this-argument': 0,
	},
};
