/* eslint-disable prefer-promise-reject-errors */
if (ALEXTRAS_ENV === 'extension') {
	// @ts-expect-error - Basic GM API Polyfill
	// No where near 1:1, but should be enough.
	window.GM = {
		async xmlHttpRequest(details) {
			return new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();

				xhr.open(details.method ?? 'GET', details.url, true, details.user, details.password);

				if (details.headers) {
					for (const [header, value] of Object.entries(details.headers)) {
						xhr.setRequestHeader(header, value);
					}
				}

				xhr.timeout = details.timeout ?? 0;
				xhr.responseType = details.responseType as XMLHttpRequestResponseType ?? '';

				xhr.onload = function() {
					const response = {
						context: details.context,
						finalUrl: xhr.responseURL,
						readyState: xhr.readyState,
						response: xhr.response,
						responseHeaders: xhr.getAllResponseHeaders(),
						responseText: xhr.responseText,
						responseXML: xhr.responseXML,
						status: xhr.status,
						statusText: xhr.statusText,
						json: null,
					};

					if (details.onload) {
						// @ts-expect-error - Idk but it works
						details.onload(response);
					}

					// @ts-expect-error - Idk but it works
					resolve(response);
				};

				xhr.onerror = function() {
					const errorResponse = {
						readyState: xhr.readyState,
						response: xhr.response,
						responseHeaders: xhr.getAllResponseHeaders(),
						responseText: xhr.responseText,
						responseXML: xhr.responseXML,
						status: xhr.status,
						statusText: xhr.statusText,
					};

					if (details.onerror) {
						// @ts-expect-error - Idk but it works
						details.onerror(errorResponse);
					}

					reject(errorResponse);
				};

				xhr.ontimeout = function() {
					if (details.ontimeout) {
						details.ontimeout();
					}

					reject();
				};

				xhr.onabort = function() {
					if (details.onabort) {
						details.onabort();
					}

					reject();
				};

				// @ts-expect-error - Idk but it works
				xhr.send(details.data ?? null);
			});
		},
	};
}
