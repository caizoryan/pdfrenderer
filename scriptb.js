import { blobStream } from './blob-stream.js'
import { PDFDocument } from "./pdfkit.standalone.js"
import { runa, f, isSymbol, isFunction, isScopedFunction } from "./runa.js"
import { reactive, memo } from './hok.js'
import { dom } from './dom.js'
import { Keymanager } from './keymanager.js'

let keys = new Keymanager()
let plus = (e) => e + 1

import * as PDFJS from "https://esm.sh/pdfjs-dist";
import * as PDFWorker from "https://esm.sh/pdfjs-dist/build/pdf.worker.min";

let queued

try {
	PDFJS.GlobalWorkerOptions.workerSrc = PDFWorker;
	console.log("TRIED")
} catch (e) {
	window.pdfjsWorker = PDFWorker;
	console.log("CAUGHT")
}
function loadAndRender(url) {
	let start = new Date()
	var loadingTask = PDFJS.getDocument(url);
	loadingTask.promise.then((pdf) => renderPDF(pdf, start), (reason) => console.error(reason));
}
let renderPDF = (pdf, start) => {
	let end = new Date()
	let ms = end.valueOf() - start.valueOf()
	console.log('PDF loaded in', ms);

	// Fetch the first page
	var pageNumber = 1;
	pdf.getPage(pageNumber).then(function (page) {
		console.log('Page loaded');
		var scale = 1;
		var viewport = page.getViewport({ scale: scale });

		// Prepare canvas using PDF page dimensions
		var canvas = document.getElementById('canvas');
		var ctx = canvas.getContext('2d');
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		// Render PDF page into canvas context
		var renderContext = { canvasContext: ctx, viewport: viewport };
		if (queued) {
			queued.cancel()
			queued = undefined
		}
		var renderTask = page.render(renderContext);
		queued = renderTask
		// queued = renderTask

		renderTask.promise.then(function () {
			queued = undefined
			console.log('Page rendered');
		});
	});
}
function throttle(mainFunction, delay) {
	let timerFlag = null; // Variable to keep track of the timer

	// Returning a throttled version 
	return (...args) => {
		if (timerFlag === null) { // If there is no timer currently running
			mainFunction(...args); // Execute the main function 
			timerFlag = setTimeout(() => { // Set a timer to clear the timerFlag after the specified delay
				timerFlag = null; // Clear the timerFlag to allow the main function to be executed again
			}, delay);
		}
	};
}

let draw = (drawables) => {
	const doc = new PDFDocument({ layout: 'landscape' });
	var stream = doc.pipe(blobStream());
	drawables.forEach(fn => fn.draw(doc))
	doc.end();
	stream.on('finish', () => loadAndRender(stream.toBlobURL('application/pdf')));
}

let button = (fn, text, attr) => ['button', { onclick: fn, ...attr }, text]
let cursor = reactive([0])
// setTimeout(() => cursor.next([0,1]), 2800)
cursor.subscribe((v) => {
	let selected = document.querySelector("*[selected='true']")
	if (selected) selected.setAttribute('selected', 'false')

	selected = document.querySelector(`*[address='${v.join("-")}']`)
	if (selected) {
		selected.setAttribute('selected', 'true')
		selected.scrollIntoView({ block: "center", behavior: "smooth" })
	}

})

let flashselected = () => {
	document.querySelectorAll("*[selected='true']").forEach(e => {
		e.setAttribute("selected", 'false')
		setTimeout(() => { e.setAttribute("selected", 'true') }, 50)
	})
}

cursor.goNext = (out = false) => {
	let [ref, refindex] = getcurrentref()
	if (refindex < ref.length - 1) {
		cursor.next((e) => (e[e.length - 1] += 1, e))
		let [ref, refindex] = getcurrentref()
		if (out && Array.isArray(ref[refindex])) {
			let notdone = true
			while (notdone) {
				cursor.next(e => (e.push(0), e))
				ref = getcurrentref()[0]
				refindex = getcurrentref()[1]

				if (!Array.isArray(ref[refindex])) notdone = false
			}
		}
	}
	else if (out) (cursor.goUp(), cursor.goNext(true))
}
cursor.goPrev = (out = false) => {
	let [_, refindex] = getcurrentref()
	if (refindex != 0) {
		cursor.next((e) => (e[e.length - 1] -= 1, e))

		let [ref, refindex] = getcurrentref()
		if (out && Array.isArray(ref[refindex])) {
			let notdone = true

			while (notdone) {
				cursor.next((e) => (e.push(ref[refindex].length - 1), e))
				ref = getcurrentref()[0]
				refindex = getcurrentref()[1]

				if (!Array.isArray(ref[refindex])) notdone = false
			}
		}
	}
	else if (out) (cursor.goUp(), cursor.goPrev(true))
	else cursor.goUp()
}
cursor.goUp = () => {
	if (cursor.value().length > 1) cursor.next((e) => (e.pop(), e))
}


let renderers = {
	"Fold": (el, i, address, change) => {
		if (isFunction(el) && el.name == 'Fold') return ["span.fold-marker", "▶︎"]
		else change(() => ["span.fold", selected(i, address), "(x)"])
		return ["span.fold", selected(i, address), (isFunction(el) || isSymbol(el)) ? el.name : "[ Folded(...) ]"]
	},
	"History": (el, i, address, change) => {
		let num = parseInt(el)
		if (isFunction(el) && el.name == 'History') return ["span.fold-marker", selected(i, address), "...︎"]
		else if (typeof num != 'number') console.error("Next num from history should be parseable as number")
		else {
			change((el, ii, address) => ii == (num + i) ? defaultrenderer(el, ii, address, change) : ["span.symbol", selected(ii, address), "(x)"])
			return ["span.fold", selected(i, address), "(" + el + ")"]
		}
	}
}
let selected = (i, address) => {
	let addy = [...address]
	if (i != undefined) { addy.push(i) }
	let addy_str = addy.join('-')
	return {
		address: addy_str, selected: addy_str == cursor.value().join('-'), onclick: (e) => {
			e.stopImmediatePropagation()
			e.stopPropagation()
			cursor.next([...addy])
		}
	}
}
let defaultrenderer = (el, i, a, change) => {
	if (Array.isArray(el)) { return arrayui(el, a.concat([i])) }
	else if (isSymbol(el) || isFunction(el)) {
		let r = renderers[el.name]
		if (r) { change(r); return r(el, i, a, change) }
		else return ["span" + (isFunction(el) ? isScopedFunction(el) ? ".scoped.function" : ".function" : ".symbol"), selected(i, a), el.name]
	}
	else if (typeof el == 'string') { return ["span.string", selected(i, a), el] }
	else if (typeof el == 'number') { return ["span.number", selected(i, a), el + ""] }
	else console.error(el)
}

let arrayui = (arr, address = [], renderer = defaultrenderer) => {
	// change should manage the resetting back of the rendere
	let change = r => renderer = r
	let f = arr.map((el, i) => {
		return renderer(el, i, address, change)
	})

	return ['.array', {
		tabindex: 0,
		...selected(address[address.length - 1], address.slice(0, -1)),
	},
		...f]
}
let uirenders = reactive(0)
// uirenders.subscribe(() => { save_data() })

let buffer
let current = [
	[f("rect"), f("{}"),
	['x', Math.random() * 100],
	['y', 30],
	['fill', 'red'],
	['stroke', 'black'],
	['width', 50],
	['height', 80]],
	...Array(10).fill(0).map((e, i) =>
		[f("text"), f("{}"),
		["text", "hello world"],
		['x', Math.random() * 100],
		['y', i * 30],
		// ['fill', false],
		['fontSize', 84],
		['lineWidth', Math.random() * 3],
		['stroke', 'red']
		])

]

function render(){
	draw(runa(current))
}

let sidebar = [
	".side-bar",
	memo(() => arrayui(current), [uirenders])
]

// use keys this time

document.body.appendChild(dom(sidebar))

keys.on("ArrowRight", () => {
	let [ref, refindex] = getcurrentref()
	if (isFunction(ref[refindex][0])
		&& ref[refindex][0].name == 'History') {
		ref[refindex][1] += 1
		uirenders.next(plus)
		render()
	}

	else {
		// cursor go next but go inside if it is array
		if (Array.isArray(ref[refindex])) {
			let notdone = true
			while (notdone) {
				cursor.next(e => (e.push(0), e))
				ref = getcurrentref()[0]
				refindex = getcurrentref()[1]
				if (!Array.isArray(ref[refindex])) notdone = false
			}
		}
		else cursor.goNext(true)
	}
})

keys.on("ArrowLeft", () => {
	let [ref, refindex] = getcurrentref()
	if (isFunction(ref[refindex][0]) && ref[refindex][0].name == 'History') {
		ref[refindex][1] -= 1
		uirenders.next(plus)
		render()
	}

	else {
		// if it is an array go inside and to last of the el
		if (Array.isArray(ref[refindex])) {
			let notdone = true
			while (notdone) {
				cursor.next((e) => (e.push(ref[refindex].length - 1), e))
				ref = getcurrentref()[0]
				refindex = getcurrentref()[1]

				if (!Array.isArray(ref[refindex])) notdone = false
				else console.log("still going...")
			}
		}
		else cursor.goPrev(true)
	}
})
keys.on("Enter", (e) => {
	let [ref, refindex] = getcurrentref()
	if (Array.isArray(ref[refindex])) {
		if (e.shiftKey) {
			last.push(current)
			current = ref[refindex]
			cursor.next([0])
			uirenders.next(plus)
			render()
		}
		else cursor.next((e) => (e.push(0), e))
	}
	else {
		let buffer = ref[refindex]?.name != undefined
			? ref[refindex].name : ref[refindex]
		let att = {
			oninput: (e) => buffer = e.target.value,
			onkeydown: (e) => {
				e.stopPropagation()
				if (e.key == "Escape") e.target.parentNode.remove()
				if (e.key == 'Enter') {
					let type = ref[refindex]
					if (isSymbol(type) || isFunction(type)) {
						if (isScopedFunction(type)) ref[refindex] = fn(buffer)
						else if (isFunction(type)) ref[refindex] = f(buffer)
						else ref[refindex] = o(buffer)
					}

					else if (typeof type == 'number') {
						ref[refindex] = parseFloat(buffer);
					}

					else ref[refindex] = buffer;
					uirenders.next(plus);
					render();
					e.target.parentNode.remove()
				}
			}, value: buffer
		}
		mountinput(att)
	}
})
keys.on("Escape", (e) => {
	let i = document.querySelector(".input-box")
	if (i) {
		i.remove()
	} else {
		if (e.shiftKey && last.length > 0) {
			current = last.pop()
			cursor.next([0])
			uirenders.next(plus)
			render()
		} else cursor.goUp()
	}
})

keys.on('ArrowDown', () => {
	// have strategy functions for what next means in different contexts
	cursor.goNext()
})

keys.on('ArrowUp', () => {
	// have strategy functions for what next means in different contexts
	cursor.goPrev()
})

keys.on('x', () => {
	let [ref, refindex] = getcurrentref()
	buffer = ref[refindex]
	ref.splice(refindex, 1)
	uirenders.next(plus)
	render()
})

keys.on('j', () => {
	// check if at cursor is number, and if is reduce
	let [ref, refindex] = getcurrentref()
	if (typeof ref[refindex] == 'number') {
		ref[refindex] -= inc
		uirenders.next(plus)
		render()
	}
})


keys.on('k', () => {
	let [ref, refindex] = getcurrentref()
	if (typeof ref[refindex] == 'number') {
		ref[refindex] += inc
		uirenders.next(plus)
		render()
	}
})

keys.on('y', () => {
	let [ref, refindex] = getcurrentref()
	buffer = ref[refindex]
	flashselected()
})

keys.on("p", (e) => {
	if (buffer != undefined) {
		e.preventDefault()
		let [ref, refindex] = getcurrentref()
		if (e.shiftKey) ref.splice(refindex, 0, JSON.parse(JSON.stringify(buffer)))
		else ref.splice(refindex + 1, 0, JSON.parse(JSON.stringify(buffer)))
		uirenders.next(plus)
		render()

	}
})

let mountinput = (attr, after = false) => {
	let pos = document.querySelector("*[selected='true']")
	let { x, y, width, height } = pos.getBoundingClientRect()
	let input = dom(['input', attr])
	let div = dom('.input-box', {
		style: `
				position: fixed;
				left: ${x}px;
				top: ${y + height}px;
				background: yellow;`}, input)
	setTimeout(() => {
		document.body.appendChild(div)
		input.focus()
	}, 10)
}

document.onkeydown = e => keys.event(e)

let getcurrentref = () => {
	let curse = cursor.value()
	if (curse.length == 1) return [current, curse[0]]

	let refaddress = curse.slice(0, -1)
	let refindex = cursor.value()[cursor.value().length - 1]
	let ref = getref(refaddress, current)
	return [ref, refindex]
}
let getref = (address, arr) => {
	let copy = [...address]
	let index = copy.shift()
	if (copy.length == 0) return arr[index]
	return getref(copy, arr[index])
}

render()
