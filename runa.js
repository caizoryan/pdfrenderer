import { rootenv } from './baselibrary.js'

export let isObject = x => typeof x === 'object' && !Array.isArray(x) && x !== null
export let isSymbol = x => isObject(x) && x.symbol
export let isFunction = x => isObject(x) && x.function
export let isScopedFunction = x => isObject(x) && x.function && x.scope

export let o = (name) => ({ symbol: true, name })
export let f = (name) => ({ function: true, name })
export let fn = (name) => ({ function: true, name, scope: true })

export let runa = (prop, env = rootenv) => {
	if (Array.isArray(prop) && isFunction(prop[0]) && env[prop[0].name]) {
		let fn = env[prop[0].name]
		// slice an evaluate again, allows for nice pipline creation!
		// unless functino wants to create scope
		let args = isScopedFunction(prop[0]) ? prop.slice(1) : runa(prop.slice(1), env)
		return fn(args, env)
	}
	else if (Array.isArray(prop)) return prop.map((e) => runa(e, env))
	else if (isFunction(prop)) {
		if(env[prop.name] == undefined) console.log('didnt find', prop.name, rootenv == env)
		return env[prop.name]
	}
	else if (isSymbol(prop)) {
		if(env[prop.name] == undefined) console.log('didnt find', prop.name, rootenv == env)
		return env[prop.name]
	}
	// treat like an array
	else
		return prop
}
