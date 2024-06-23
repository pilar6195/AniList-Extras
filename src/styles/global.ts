import { addStyles } from '@/utils/Helpers';

addStyles(`
	.alextras--hide {
		display: none !important;
	}

	/* View Toggles */

	.alextras--view-switch-toggle {
		float: right;
	}

	.alextras--view-switch-toggle span:hover {
		cursor: pointer;
	}

	.alextras--view-switch-toggle span.alextras--active {
		color: rgb(var(--color-blue))
	}

	/* Input Margins */

	.alextras--switch,
	.alextras--checkbox,
	.alextras--input,
	.alextras--textarea,
	.alextras--dropdown {
		margin: 0px 1em 1em 0;
	}

	/* Input Labels */

	.alextras--textarea h2,
	.alextras--input h2,
	.alextras--dropdown h2 {
		margin-bottom: 0.5em !important;
	}

	/* Switch Label */

	.alextras--switch .el-switch__label:not(.is-active) {
		color: rgb(var(--color-text));
	}

	/* Input Descriptions */

	.alextras--switch h5,
	.alextras--checkbox h5,
	.alextras--textarea h5,
	.alextras--input h5,
	.alextras--dropdown h5 {
		color: rgb(var(--color-text-light));
		margin: 0.5em 0 0 0.2em;
		font-size: 0.7em;
		user-select: none;
	}

	/* Switch/Checkbox Descriptions */

	.alextras--checkbox h5 {
		margin-left: 2.2em;
	}

	.alextras--switch h5 {
		margin-left: 4.5em;
	}

	/* Input Errors */

	.alextras--input .el-input__error,
	.alextras--textarea .el-input__error {
		font-size: 11px;
		color: rgb(var(--color-red));
		margin: 0.4em 0 0 0.2em;
	}
		
	.alextras--input .el-input__error:empty,
	.alextras--textarea .el-input__error:empty {
		display: none;
	}

	/* Input Backgrounds */

	.alextras--dropdown .el-input__inner,
	.alextras--textarea .el-textarea__inner,
	.alextras--input .el-input__inner {
		background: rgba(var(--color-background), .6);
	}

	/* Input Placeholders */

	.alextras--input input::placeholder,
	.alextras--textarea textarea::placeholder {
		color: rgb(var(--color-text-light));
	}

	/* Number Input */

	.alextras--input input[type="number"]::-webkit-outer-spin-button,
	.alextras--input input[type="number"]::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}

	.alextras--input input[type="number"] {
		-moz-appearance: textfield;
	}

	/* Color Input */

	.alextras--input input.el-input__inner[type="color"] {
		padding: 0.3em;
		width: 3em;
		height: 3em;
		cursor: pointer;
	}

	.alextras--input input.el-input__inner[type="color"]::-webkit-color-swatch-wrapper {
		padding: 0;
	}

	.alextras--input input.el-input__inner[type="color"]::-webkit-color-swatch {
		border-color: rgb(var(--color-background-300));
		border-radius: 4px;
	}

	.alextras--input input.el-input__inner[type="color"]::-moz-color-swatch {
		border-color: rgb(var(--color-background-300));
		border-radius: 4px;
	}

	/* Dropdown */

	.alextras--dropdown .el-input {
		width: max-content;
	}

	.alextras--dropdown .el-input__inner {
		width: auto;
		padding-right: 35px;
	}

	.alextras--dropdown .el-input:after {
		content: "▾";
		position: absolute;
		right: 10px;
		top: 9px;
		font-size: 20px;
		pointer-events: none;
	}

	.alextras--dropdown option {
		background: rgba(var(--color-background));
	}
`);
