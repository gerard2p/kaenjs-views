import { requireEngine } from "../";
import { targetPath } from "@kaenjs/core/utils";
import { existsSync } from "fs";
const i18n = require('i18n');

const nunjucks = requireEngine('nunjucks');
export const mapping = {
	'njk': 'nunjucks',
	'nunjucks': 'nunjucks'
};
function makeLink(ctx, url, render) {
	// let route = KoatonRouter.AllRoutes(ctx.subdomain).map(exp => {
	// 	let variables = (exp[1].match(/\$/g) || []).length;
	// 	let matches = (url.match(exp[0]) || []).length - 1;
	// 	if (matches === variables && url.replace(...exp).indexOf('.') === -1) {
	// 		return url.replace(...exp);
	// 	}
	// }).filter(r => !!r);
	// route = url === 'home' ? '/' : route[0];
	// let content;
	// let active = ctx.route === url || ctx.path === route;
	// if (ctx.path === route) {
	// 	content = `<a class="active">${render(this)}</a>`;
	// } else {
	// 	content = `<a href="${route}" class="${active ? 'active' : ''}">${render()}</a>`;
	// }
	// return content;
}
function translate(key: string, locale: string) { 
	if(!i18n) {
		console.warn('i18n is required');
		return key;
	}
	if (locale) {
		let loc = i18n.getLocale();
		i18n.setLocale(locale);
		let res = i18n.__(key);
		i18n.setLocale(loc)  ;
		return res;
	} else {
		return i18n.__(key);
	}
}
class Link {
	private tags: string[]
	constructor() {
		this.tags = ['link'];
	}
	parse(parser, nodes, lexer) {
		// get the tag token
		let tok = parser.nextToken();

		// parse the args and move after the block end. passing true
		// as the second arg is required if there are no parentheses
		let args = parser.parseSignature(null, true);
		parser.advanceAfterBlockEnd(tok.value);

		// parse the body and possibly the error block, which is optional
		let body = parser.parseUntilBlocks('error', 'endlink');
		let errorBody = null;
		/* istanbul ignore next */
		if (parser.skipSymbol('error')) {
			parser.skip(lexer.TOKEN_BLOCK_END);
			errorBody = parser.parseUntilBlocks('endlink');
		}

		parser.advanceAfterBlockEnd();

		// See above for notes about CallExtension
		return new nodes.CallExtension(this, 'run', args, [body, errorBody]);
	}
	run(context, url, body, errorBody) {
		return new nunjucks.runtime.SafeString(makeLink(context.ctx, url, body));
	}
}
export function setup() {
	const env = new nunjucks.Environment();
	env.addFilter('bundle', function (bundle) {
		let dir = bundle.split('.')[1];
		if (existsSync(targetPath(`public/${dir}/${bundle}`))) {
			if (dir === 'css') {
				return new nunjucks.runtime.SafeString(`<link href="/assets/${dir}/${bundle}" rel="stylesheet">`);
			} else if (dir === 'js') {
				return new nunjucks.runtime.SafeString(`<script src="/assets/${dir}/${bundle}"></script>`);
			}
		}
		return '';
	});
	// env.addFilter('i18n', _i18n);
	env.addFilter('t', translate);
	env.addExtension('Link', new Link());
	return env;
}
