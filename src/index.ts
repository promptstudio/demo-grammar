import HTML from './index.html';

export default {
	async fetch(request: Request, env: Env) {
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
				const result = await fetch(
					`https://openai.promptstudio.ai/${env.PROMPTSTUDIO_PROXY_ID}/v1/completions`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': 'Bearer ' + env.OPENAI_API_KEY,
						},
						body: JSON.stringify({
							model: 'text-davinci-003',
							prompt: `Rewrite a sentence correctly in the language it is written in, then explain the changes. Do not translate the sentence. Be careful about words lexically fitting together, sounding idiomatically.\n\n"${data.input}"`,
							temperature: 0.7,
							max_tokens: 256,
							top_p: 1,
							frequency_penalty: 0,
							presence_penalty: 0,
						}),
					}
				);
				const resultData: any = await result.json();
				console.log(resultData);

				return new Response(
					JSON.stringify({
						grammar_response: resultData.choices[0].text,
					}),
					{
						headers: { 'Content-Type': 'application/json;charset=UTF-8' },
					}
				);
			}

			return new Response(`request method: ${request.method}`);
		} catch (e) {
			console.error(e);
			return new Response(e.stack || e);
		}
	},
};
