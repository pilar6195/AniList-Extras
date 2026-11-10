/**
 * Converts GM request data into a body XMLHttpRequest can send.
 * Plain objects and arrays are sent as JSON.
 */
const toXhrBody = (data: Tampermonkey.Request['data']): XMLHttpRequestBodyInit | null => {
	if (data === undefined || data === null) {
		return null;
	}

	if (
		typeof data === 'string'
		|| data instanceof Blob
		|| data instanceof FormData
		|| data instanceof URLSearchParams
		|| data instanceof ArrayBuffer
		|| ArrayBuffer.isView(data)
	) {
		return data as XMLHttpRequestBodyInit;
	}

	return JSON.stringify(data);
};

/**
 * responseText throws unless responseType is '' or 'text'.
 */
const safeResponseText = (xhr: XMLHttpRequest): string => {
	return xhr.responseType === '' || xhr.responseType === 'text' ? xhr.responseText : '';
};

/**
 * responseXML throws unless responseType is '' or 'document'.
 */
const safeResponseXML = (xhr: XMLHttpRequest): Document | null => {
	return xhr.responseType === '' || xhr.responseType === 'document' ? xhr.responseXML : null;
};

/**
 * Builds the error object passed to onerror and used for rejections,
 * so callers always get an object instead of undefined.
 */
const toErrorResponse = (xhr: XMLHttpRequest, error: string): Tampermonkey.ErrorResponse => ({
	error,
	readyState: xhr.readyState,
	response: xhr.response,
	responseHeaders: xhr.getAllResponseHeaders(),
	responseText: safeResponseText(xhr),
	responseXML: safeResponseXML(xhr),
	status: xhr.status,
	statusText: xhr.statusText,
});

/**
 * Basic GM.xmlHttpRequest API Polyfill.
 * No where near 1:1, but should be enough.
 */
const xmlHttpRequestPolyfill = <TContext>(
	details: Tampermonkey.Request<TContext>,
): Tampermonkey.PromiseWithAbort<Tampermonkey.Response<TContext>> => {
	const xhr = new XMLHttpRequest();

	const promise = new Promise<Tampermonkey.Response<TContext>>((resolve, reject) => {
		if (details.url instanceof Blob) {
			const objectUrl = URL.createObjectURL(details.url);
			xhr.addEventListener('loadend', () => URL.revokeObjectURL(objectUrl));
			xhr.open(details.method ?? 'GET', objectUrl, true);
		} else {
			xhr.open(details.method ?? 'GET', details.url, true, details.user, details.password);
		}

		if (details.headers) {
			for (const [header, value] of Object.entries(details.headers)) {
				xhr.setRequestHeader(header, value);
			}
		}

		xhr.timeout = details.timeout ?? 0;
		// XHR has no 'stream' response type, so it falls back to text.
		xhr.responseType = details.responseType === 'stream' ? '' : details.responseType ?? '';

		xhr.onload = () => {
			const response: Tampermonkey.Response<TContext> = {
				// GM's types say `context` is always set, but it's undefined when the caller didn't pass one.
				context: details.context as TContext,
				finalUrl: xhr.responseURL,
				readyState: xhr.readyState,
				response: xhr.response,
				responseHeaders: xhr.getAllResponseHeaders(),
				responseText: safeResponseText(xhr),
				responseXML: safeResponseXML(xhr),
				status: xhr.status,
				statusText: xhr.statusText,
				json: null,
			};

			// Userscript managers call listeners with the response as `this`.
			details.onload?.call(response, response);
			resolve(response);
		};

		xhr.onerror = () => {
			const errorResponse = toErrorResponse(xhr, 'Network error');
			details.onerror?.call(errorResponse, errorResponse);
			reject(errorResponse);
		};

		xhr.ontimeout = () => {
			details.ontimeout?.();
			reject(toErrorResponse(xhr, 'Timeout'));
		};

		xhr.onabort = () => {
			details.onabort?.();
			reject(toErrorResponse(xhr, 'Aborted'));
		};

		xhr.send(toXhrBody(details.data));
	});

	return Object.assign(promise, { abort: () => xhr.abort() });
};

if (ALEXTRAS_ENV === 'extension') {
	const gmPolyfill = { xmlHttpRequest: xmlHttpRequestPolyfill } satisfies Pick<typeof GM, 'xmlHttpRequest'>;
	// Only xmlHttpRequest is polyfilled. The rest of GM doesn't exist in the extension build.
	globalThis.GM = gmPolyfill as typeof GM;
}
