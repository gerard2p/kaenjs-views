import * as render from 'consolidate';
import { accessSync, constants, existsSync, readFileSync } from "fs";
import { extname, join, resolve } from "path";
import { KaenContext } from '@kaenjs/core';
import { configuration } from "@kaenjs/core/configuration";
declare global {
	namespace KaenExtensible {
		interface KaenContext {
			render(file: string, locals?: any): Promise<void>
		}
	}
}
function exists(target: string) {
	try {
		accessSync(target, constants.R_OK);
		return true;
	} catch (err) {
		return false;
	}
};
export enum ViewEngines {
	html = 'html',
	nunjucks = 'nunjucks'
}
export let extMapper = {
	'': 'html',
	'html': 'html',
	'htm': 'html'
};
let cacher = {};
/**
* This function return the correct enginge for the path provided
* path  engine is stored in a cache
* @param {string} fullpath - filename to render
* @return {engine}
*/
function getEngine(fullpath: string) {
	let extension = extname(fullpath).slice(1);
	let file = fullpath.replace(extname(fullpath), '');
	let engine;
	if (!extension && !cacher[fullpath] && !exists(fullpath)) {
		for (const ext of Object.keys(extMapper)) {
			let engine = extMapper[ext];
			/* istanbul ignore else */
			if (exists(`${file}.${engine}`)) {
				extension = engine;
				break;
			}
		}
	}
	if (!cacher[fullpath]) {
		engine = extMapper[extension] || extension;
		if (!ViewEngines[engine]) {
			throw Error(`${extension} engine is not supported`);
		}
		let path = `${file}.${extension}`;
		// if (testedEngines.indexOf(engine) === -1 && avaliableEngines.indexOf(engine) > -1 && engine !== 'html') {
		// 	console.warn(`${engine} engine is avaliable but not tested`);
		// } else if (avaliableEngines.indexOf(engine) === -1 && engine !== 'html') {
		// 	throw Error(`${engine} engine is not supported`);
		// }
		cacher[fullpath] = [engine, path];
	}
	return cacher[fullpath];
}
/**
* This function return the correct enginge for the path provided
* path  engine is stored in a cache
*/
export function template(file: string, locals: any):Promise<string> {
	let fullpath = resolve('views', file);
	const [engine, target] = getEngine(fullpath);
	if (engine !== 'html') {
		return render[engine](target, Object.assign({}, locals, {
			liveReloadHost: process.env.liveReloadHost,
			isDevelopment: configuration.environment !== 'production'
		}));
	} else {
		return new Promise(function (resolve, reject) {
			try {
				accessSync(target, constants.R_OK);
				resolve(readFileSync(target, 'utf-8'));
			} catch (err) {
				/* istanbul ignore next */
				reject(err);
			}
		});
	}
}
export async function Views(ctx: KaenContext) {
	ctx.render = async (file: string, locals: any = {}) => {
		const Local = Object.assign({}, locals, {
			path: ctx.params.url,
			subdomain: ctx.subdomain
		});
		try {
			ctx.body = await template(file, Local);
		} catch(err) {
			ctx.status = 500;
			ctx.body = err.message;
		}
	};
}
export function requireEngine(engine: string) {
	return require(join(process.cwd(), 'node_modules', engine));
}
for (const engine of Object.keys(ViewEngines)) {
	if (engine === ViewEngines.html) continue;
	if(!existsSync(join(process.cwd(), 'node_modules', engine)))continue;
	let { setup, mapping } = require(`./engines/${engine}`);
	extMapper = Object.assign({}, extMapper, mapping);
	render.requires[engine] = setup();
	if (configuration.views[engine] !== undefined) {
		configuration.views[engine](render.requires[engine]);
	}
}
