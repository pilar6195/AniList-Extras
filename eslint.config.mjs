import { defineConfig } from 'eslint/config';
import common from 'eslint-config-neon/common';
import browser from 'eslint-config-neon/browser';
import typescript from 'eslint-config-neon/typescript';

export default defineConfig([
	{
		ignores: ['.unused/**', 'dist/**', '.build/**', '**/*.js', 'eslint.config.mjs'],
	},
	...common,
	...browser,
	...typescript,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: ['./tsconfig.json'],
			},
		},
		rules: {
			'@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
			'@stylistic/no-extra-parens': 'off',
			'@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
			'@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
			'@stylistic/array-bracket-newline': ['error', 'consistent'],
			'@stylistic/array-element-newline': ['error', { multiline: true, consistent: true }],
			'@stylistic/arrow-parens': ['error', 'as-needed'],
			'@stylistic/operator-linebreak': ['error', 'before'],
			'@stylistic/line-comment-position': 'off',

			// Typescript
			'typescript-sort-keys/interface': 'off',

			// Built-in
			'func-names': 'off',
			'arrow-body-style': 'off',
			'id-length': 'off',
			'consistent-return': 'off',
			'no-inline-comments': 'off',
			'no-shadow': 'off',
			'no-warning-comments': 'off',
			'prefer-named-capture-group': 'off',

			'import-x/order': 'off',
			'promise/prefer-await-to-callbacks': 'off',

			// Unicorn
			'unicorn/numeric-separators-style': 'off',
			'unicorn/no-array-method-this-argument': 'off',
		},
	},
]);
