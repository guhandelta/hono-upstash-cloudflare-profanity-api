				import worker, * as OTHER_EXPORTS from "/Users/guhaprasaanth/Documents/projects/hono-upstash-cloudflare-profanity-api/index";
				import * as __MIDDLEWARE_0__ from "/Users/guhaprasaanth/Documents/projects/hono-upstash-cloudflare-profanity-api/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "/Users/guhaprasaanth/Documents/projects/hono-upstash-cloudflare-profanity-api/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";

				export * from "/Users/guhaprasaanth/Documents/projects/hono-upstash-cloudflare-profanity-api/index";

				export const __INTERNAL_WRANGLER_MIDDLEWARE__ = [
					...(OTHER_EXPORTS.__INJECT_FOR_TESTING_WRANGLER_MIDDLEWARE__ ?? []),
					__MIDDLEWARE_0__.default,__MIDDLEWARE_1__.default
				]
				export default worker;