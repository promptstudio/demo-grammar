import HTML from './index.html';

export default {
	async fetch(request: Request) {
		let url = new URL(request.url);
		let path = url.pathname.slice(1).split('/');

		if (!path[0]) {
			// Serve our HTML at the root path.
			return new Response(HTML, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
		}

		return new Response(`request method: ${request.method}`);
	},
};
