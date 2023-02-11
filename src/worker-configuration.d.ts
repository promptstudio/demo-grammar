interface Env {
	// secrets
	OPENAI_API_KEY: string;
	SENTRY_DSN: string;

	// vars
	PROMPTSTUDIO_PROXY_ID: '3479a61a-9d8b-4884-99b5-02933833e6f3';

	// services
	invoke: Fetcher;
}
declare module '*.html' {
	const value: ArrayBuffer;
	export default value;
}
