import { ExtraErrorData, RewriteFrames, SessionTiming } from '@sentry/integrations';
import { RequestData, Toucan } from 'toucan-js';
import HTML from './index.html';

class RequestError extends Error {}

async function loggingFetchJson<T>(
	sentry: Toucan,
	request: string | Request,
	requestInitr: Request | RequestInit | undefined,
	body: any,
	fetchOverride?: typeof fetch
): Promise<T> {
	const currentfetch = fetchOverride || fetch;

	sentry.addBreadcrumb({
		message: `request ${request}`,
		data: { ...requestInitr, reqdata: body },
	});

	const resp = await currentfetch(request, {
		body: JSON.stringify(body),
		...requestInitr,
	});

	sentry.addBreadcrumb({
		message: `response ${request} ${resp.status}`,
	});
	const data: any = await resp.json();
	sentry.addBreadcrumb({
		message: `parsed ${request} ${resp.status}`,
		data,
	});

	if (resp.status >= 400) throw new RequestError(data || resp.statusText);

	return data;
}

export default {
	async fetch(request: Request, env: Env, context: ExecutionContext) {
		const sentry = new Toucan({
			dsn: env.SENTRY_DSN,
			context,
			request,
			integrations: [
				// new RewriteFrames({ root: '/' })
				new SessionTiming() as any,
				new ExtraErrorData() as any,
				new RequestData({
					allowedHeaders: true,
					allowedCookies: true,
					allowedSearchParams: true,
					allowedIps: true,
				}),
			],
		});

		try {
			let url = new URL(request.url);
			let path = url.pathname.slice(1).split('/');

			if (path[0] === 'grammar') path.shift();

			if (!path[0]) {
				// Serve our HTML at the root path.
				return new Response(HTML, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
			}

			if (path[0] === 'query') {
				const data: { input: string } = await request.json();
				sentry.setRequestBody(data);

				const result = await loggingFetchJson(
					sentry,
					`https://openai.promptstudio.ai/${env.PROMPTSTUDIO_PROXY_ID}/v1/completions`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': 'Bearer ' + env.OPENAI_API_KEY,
						},
					},
					{
						model: 'text-davinci-003',
						prompt: `Rewrite a sentence correctly in the language it is written in, then explain the changes. Do not translate the sentence. Be careful about words lexically fitting together, sounding idiomatically.\n\n"${data.input}"`,
						temperature: 0.7,
						max_tokens: 256,
						top_p: 1,
						frequency_penalty: 0,
						presence_penalty: 0,
					},
					// to fix weirdness in worker-to-worker communication
					env.invoke ? env.invoke.fetch.bind(env.invoke) : undefined
				);
				console.log(result);

				return new Response(
					JSON.stringify({
						grammar_response: result.choices[0].text,
					}),
					{
						headers: { 'Content-Type': 'application/json;charset=UTF-8' },
					}
				);
			}

			return new Response(`request method: ${request.method}`);
		} catch (e) {
			console.error(e);
			sentry.captureException(e);
			return new Response(e.stack || e);
		}
	},
};
