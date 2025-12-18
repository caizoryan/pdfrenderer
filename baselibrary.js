let s = {
	point: (v) => v,
	inch: (v) => v*72,
	em: (v) => v*12,
	pica: (v) => v*12,
	mul: (v1,v2) => v1*v2,  
	add: (v1,v2) => v1+v2,  
	sub: (v1,v2) => v1-v2,  
	div: (v1,v2) => v1/v2,  
}

import { runa, f, o, isObject } from './runa.js'
// import { hyphenateSync } from "./lib/hyphenator/hyphenate.js"

let base = '#fffa'

export let setprinting = v => printing = v
export let printing = false
let funky_hyphens = false;
let color_hyphens = false;

export let tag_hooks = {
	"+:name": {
		font_weight: 600,
		font_family: "untitled",
		color: '#2E8CFF',
		positive: s.point(6),
		font_size: s.point(6.5),
		positive_y: s.point(-1),
		edge: 3,
	},

	"+:marker": {
		font_weight: 600,
		font_family: "untitled",
		color: '#2E8CFF',
		font_size: s.point(6.5),
		positive_y: s.point(-1),
	},

	'+:italic': { font_style: "ITALIC" },
	'+:notitalic': { font_style: "NORMAL" },

	'+:footnote': {
		font_weight: 600,
		font_family: "Arial",
		color: '#2E8CFF',
		leading: s.point(11.5),
		font_size: s.point(7.5),
	},

	// "+:name": {
	// 	font_weight: 600,
	// 	font_family: "Arial Narrow",
	// 	color: 'black',
	// 	negative: s.em(1.5),
	// },

	"+:text": {
		font_weight: 100,
		font_family: "Arial",
		color: 'black',
	}
}

// ["recto", 2, "x"]
// ["verso", 2, "x"]
let verso = (prop) => (grid) => {
	let index = Math.floor(prop[0])
	let diff = prop[0] - index
	// // TODO: Figure out column width
	let offset = s.mul(grid.column_width_verso(1), diff)
	return s.add(grid.verso_columns()[index][prop[1]], offset)
}
let recto = (prop) => (grid) => {
	let index = Math.floor(prop[0])
	let diff = prop[0] - index
	// TODO: Figure out column width
	let offset = s.mul(grid.column_width_recto(1), diff)
	return s.add(grid.recto_columns()[index][prop[1]], offset)
}

// TODO: Figure out column width
let column_width_verso = (prop) => (grid) => grid.column_width_verso(prop[0])
let column_width_recto = (prop) => (grid) => grid.column_width_recto(prop[0])

// ["hangline", 2]
let hangline = (prop) =>
	/**@param {Grid} grid */
	(grid) => {
		let index = Math.floor(prop[0])
		let diff = prop[0] - index

		let value = grid.hanglines()[index]
		//let next = grid.hanglines().length - 1 >= index ? grid.props.page_width : grid.hanglines()[index + 1]
		let next = grid.hanglines()[index + 1]
		if (!next) next = grid.props.page_width

		let dist = s.sub(next, value)
		let offset = s.mul(dist, diff)

		return s.add(value, offset)
	}

let em = (prop) => s.em(prop[0])
let inch = (prop) => s.inch(prop[0])
let point = (prop) => s.point(prop[0])
let px = (prop) => s(prop[0])
let pica = (prop) => s.pica(prop[0])

let add = (prop) => s.add(prop[0], prop[1])
let mul = (prop) => s.mul(prop[0], prop[1])
let sub = (prop) => s.sub(prop[0], prop[1])
let div = (prop) => s.div(prop[0], prop)

// ----------------- +x+ --
// ++ FRAMES
// ----------------- +x+ --
// have to figure out how this will fit with frames...
export let spread = (frames, gridmaker) => ({
	draw: (p, dimensions) => {
		// page will have page dimensions
		frames.forEach(f => f?.draw ? f.draw(p, gridmaker(dimensions)) : null)
	}
})
let IntersectionFrame = (props) => ({
	draw: (p, grid) => {
		let contents = props.contents
		let side = props.side
		if (side == 'left') {
			let x = grid.verso.width
			p.push()
			p.translate(x, 0)
		}

		else {
			let x = grid.recto.width
			p.push()
			p.translate(x * -1, 0)
		}

		contents.forEach(d => d?.draw ? d.draw(p, grid) : null)

		p.pop()
	}

})
let Group = (array, env) => {
	let contents = array.map(f => !Array.isArray(f) && f.draw ? f : runa(f, env))
	return {
		draw: (p, grid) => {
			// let side = props.side
			// if (side == 'left') {
			// 	let x = grid.verso.width
			// 	p.push()
			// 	p.translate(x, 0)
			// }

			// else {
			// 	let x = grid.recto.width
			// 	p.push()
			// 	p.translate(x * -1, 0)
			// }

			contents.forEach(d => d?.draw ? d.draw(p, grid) : null)

			// p.pop()
		}

	}
}
let TextFrame = (props) => ({
	draw: (p, grid) => draw_paragraph(p, props)
})
let Circle = (props) => ({
	draw: (p, grid) => {
		let x = props.x
		let y = props.y
		let radius = props.radius
		let stroke = props.stroke
		let fill = props.fill
		let strokeWeight = parseFloat(props.strokeWeight)


		if (!stroke) p.noStroke()
		else p.stroke(stroke)

		if (!fill) p.noFill()
		else p.fill(fill)

		if (typeof strokeWeight == 'number') p.strokeWeight(strokeWeight)
		else p.strokeWeight(1)

		p.circle(x, y, radius)
	}
})
let imageframe = props => {
	let image = new Image()
	image.src = props.src

	return {
		draw: (p, prop) => {
			let x = typeof props.x == 'function' ? props.x(prop.structure) : props.x
			let y = typeof props.y == 'function' ? props.y(prop.structure) : props.y
			// if length/width is given use that to calculate height
			let w = typeof props.length == 'function' ? props.length(prop.structure) : props.length
			let ratio = w / image.width
			let h = image.height * ratio

			if (props.opacity != undefined) p.opacity(props.opacity)

			let pop = false
			if (props.rotation != undefined) {
				p.push()
				pop = true
				p.translate(x, y)
				p.angleMode(p.DEGREES)
				p.rotate(props.rotation)
			}

			if (pop) {
				p.image(image, 0, 0, w, h)
				p.pop()
			}
			else {
				p.image(image, x, y, w, h)
			}
			p.opacity(1)
		}
	}
}



// gridmaker = dimensions => grid
// grid = {margins, columns, getColumns()} etc
// dimensions  = [verso: {width, height}, recto] of page
let pages = (spreadcount) => {
	if (spreadcount % 2 == 1) {
		return Array(spreadcount).fill(undefined)
			.reduce((acc, _, i) =>
				(acc.push([i * 2, i == spreadcount - 1 ? 0 : i * 2 + 1]), acc), [])
	}

	else console.log("FUCK NOT MULTIPLE OF 4", (spreadcount * 2) - 2)
}
let imposedPages = (pagesArray) => {
	let spreadCount = pagesArray.length
	if (spreadCount % 2 != 1) {
		console.error("FUCK NOT MULTIPLE OF 4", (spreadCount * 2) - 2)
	}
	// get pages
	let last = pagesArray.length - 1
	let pair = (i) => pagesArray[last - i]
	let pairskiplast = (i) => pagesArray[last - i - 1]

	let middle = Math.ceil(last / 2)

	// switch each recto with pair spread recto till middle
	for (let i = 0; i < middle; i++) {
		let f_verso = pagesArray[i][0]
		let p_verso = pair(i)[0]

		pagesArray[i][0] = p_verso
		pair(i)[0] = f_verso
	}

	let pairedup = []

	// pair spreads up with each other
	for (let i = 0; i < middle; i++) {
		pairedup.push(pagesArray[i])
		pairedup.push(pairskiplast(i))
	}

	return pairedup
}
let beforeSpine = (page_num, spread_count) => {
	let spreads = pages(spread_count)
	let middle = Math.floor(spreads.length / 2)

	let is = undefined
	spreads.forEach((e, i) => {
		e.forEach((pg, side) => {
			if (pg == page_num) {
				if (i == middle) {
					if (side == 0) is = true
					else is = false
				}
				else {
					if (i < middle) is = true
					else is = false
				}
			}
		})
	})
	return is
}

// Match sheets with spread to get the dimensions
// sheets have page size, and supply it to spreads to draw
let getSpreadDimensions = (spreadNum, spreadCount, sheets) => {
	let spreads = pages(spreadCount)
	let verso_sheet = { ...getPageDimensions(spreads[spreadNum][0], spreadCount, sheets) }
	let recto_sheet = { ...getPageDimensions(spreads[spreadNum][1], spreadCount, sheets) }
	return { verso: verso_sheet, recto: recto_sheet }
}
let getPageDimensions = (pageNum, spreadCount, sheets) => {
	let saddle_pages = imposedPages(pages(spreadCount))
	let sheet

	if (pageNum == 0) sheet = 0
	else
		saddle_pages.forEach((set, i) => {
			if (pageNum == set[0] || pageNum == set[1]) {
				sheet = Math.floor(i / 2)
			}
		})

	sheet = { ...sheets[sheet] }
	sheet.width = s.div(sheet.width, 2)

	if (sheet.offset?.horizontal) {
		if (beforeSpine(pageNum, spreadCount)) sheet.width = s.sub(sheet.width, sheet.offset.horizontal)
		else sheet.width = s.add(sheet.width, sheet.offset.horizontal)
	}


	return sheet
}

export let drawSignature = (p, spreads, sheets, centerx, y, spreadNum) => {
	if (!sheets) {
		// treat spreads as a root obj whose props give values
		let config = spreads
		spreads = config.spreads
		sheets = config.sheets
		centerx = config.centerx
		y = config.y
		spreadNum = config.spreadNum

		// fix this
		let x = config.x
		if (!centerx) centerx = x
	}
	drawVerso(p, spreads, sheets, centerx, y, spreadNum, 5)
	drawRecto(p, spreads, sheets, centerx, y, spreadNum, 5)
	p.stroke(180)
	p.line(centerx, 0, centerx, p.height)
}
export let drawSaddle = (p, spreads, sheets, centerx, y, spreadNum) => {
	let pagesArr = imposedPages(pages(spreads.length))
	let cur = pagesArr[spreadNum].map(num => Math.floor(num / 2))

	drawVerso(p, spreads, sheets, centerx, y, cur[0], 5)
	drawRecto(p, spreads, sheets, centerx, y, cur[1], 5)
}

let doubleSaddle = (count) => {
	let saddled = imposedPages(pages(count))
	// let saddled = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]]
	let newsaddled = []
	for (let i = 0; i < saddled.length; i++) {
		if (i % 4 == 2 || i % 4 == 3) {
			continue
		}
		else {
			newsaddled.push([saddled[i], saddled[i + 2]])
		}
	}

	return newsaddled
}

// console.log("PLAESS",doubleSaddle())

// must iter by 2?
export let drawSaddleDouble = (p, spreads, sheets, spreadNum, centerx, y, y2) => {
	let pagesArr = doubleSaddle(spreads.length)

	let cur1 = pagesArr[spreadNum]
	if (cur1) cur1 = cur1[0].map(num => Math.floor(num / 2))
	else return

	//1
	drawVerso(p, spreads, sheets, centerx, y, cur1[0])
	drawRecto(p, spreads, sheets, centerx, y, cur1[1])


	let cur2 = pagesArr[spreadNum][1]
	if (cur2) cur2 = cur2.map(num => Math.floor(num / 2))
	else return
	//2
	drawVerso(p, spreads, sheets, centerx, y2, cur2[0])
	drawRecto(p, spreads, sheets, centerx, y2, cur2[1])

}

let drawRecto = (p, spreads, sheets, centerx, y, spreadNum, draw_behind = 0) => {
	// [page, length]
	let pagesarr = pages(spreads.length)

	// [if, [eq spreadnum length], [return]]
	if (spreadNum == pagesarr.length - 1) return

	// if draw behind
	// [filternull 
	//  [map pagesarr [lambda [e, i] [if [> i spreadnum] [i] [nil]]]]
	if (draw_behind) {
		let after = pagesarr.map((e, i) => i > spreadNum ? i : null).filter(e => e != null)
		if (after.length > 0) drawRecto(p, spreads, sheets, centerx, y, after[0], --draw_behind)
	}
	// [setq page [get pagesarr spreadnum]]
	let page = pagesarr[spreadNum]
	let recto = pageImage(p, spreads, sheets, page[1],)
	let recto_dimensions = getPageDimensions(page[1], spreads.length, sheets)
	if (recto_dimensions.offset) {
		if (recto_dimensions.offset.vertical) y += recto_dimensions.offset.vertical
	}

	p.image(recto, centerx, y, recto_dimensions.width, recto_dimensions.height)

	if (printing) {
		// draw crop marks
		p.stroke(0)
		p.strokeWeight(4)
		let vx = centerx
		let vy = y
		let vxw = (vx + recto_dimensions.width)
		p.line(vxw, vy - s.em(1), vxw, vy)
		p.line(vxw + s.em(1), vy, vxw, vy)

		p.line(vxw, (vy + recto_dimensions.height) + s.em(1), vxw, (vy + recto_dimensions.height))
		p.line(vxw + s.em(1), (vy + recto_dimensions.height), vxw, (vy + recto_dimensions.height))
	}

}
let drawVerso = (p, spreads, sheets, centerx, y, spreadNum, draw_behind = 0) => {
	if (spreadNum == 0) return
	let pagesarr = pages(spreads.length)
	let page = pagesarr[spreadNum]
	let verso = pageImage(p, spreads, sheets, page[0],)
	let verso_dimensions = getPageDimensions(page[0], spreads.length, sheets)

	let vw = verso_dimensions.width
	let vy = y
	let vx = centerx - vw
	if (verso_dimensions.offset) {
		if (verso_dimensions.offset.vertical) vy += verso_dimensions.offset.vertical
	}

	// if draw behind

	if (draw_behind) {
		let before = pagesarr.map((e, i) => i < spreadNum ? i : null).filter(e => e != null)
		if (before.length > 0) drawVerso(p, spreads, sheets, centerx, y, before[before.length - 1], --draw_behind)
	}

	p.image(verso, vx, vy, verso_dimensions.width, verso_dimensions.height)
	if (printing) {
		// draw crop marks
		p.stroke(0)
		p.strokeWeight(4)
		p.line(vx, vy - s.em(1), vx, vy)
		p.line(vx - s.em(1), vy, vx, vy)

		p.line(vx, (vy + verso_dimensions.height) + s.em(1), vx, (vy + verso_dimensions.height))
		p.line(vx - s.em(1), (vy + verso_dimensions.height), vx, (vy + verso_dimensions.height))
	}
}
let pageImage = (p, spreads, sheets, spreadNum,) => {
	let spread = Math.floor(spreadNum / 2)
	return spreadNum % 2 == 1
		? recto_image(p, spreads, sheets, spread,)
		: verso_image(p, spreads, sheets, spread,)
}
let verso_image = (p, spreads, sheets, pageNum,) => {
	let dimensions = getSpreadDimensions(pageNum, spreads.length, sheets)

	let w = s.add(
		dimensions.verso.width,
		dimensions.recto.width
	)

	let h = dimensions.verso.height
	if (dimensions.recto.height > h) h = dimensions.recto.height

	let buffer = p.createGraphics(w, h)
	if (!printing) buffer.background(dimensions.verso.color)
	else buffer.background(base)

	spreads[pageNum].draw(buffer, dimensions)
	if (pageNum == 0) { buffer.background('#eee') }
	let page_width = dimensions.verso.width
	let img = buffer.get(0, 0, page_width, dimensions.verso.height)

	return img
}
let recto_image = (p, spreads, sheets, pageNum,) => {
	let dimensions = getSpreadDimensions(pageNum, spreads.length, sheets)
	let w = s.add(dimensions.verso.width, dimensions.recto.width)
	let h = dimensions.verso.height
	if (h == undefined || dimensions.recto.height > h) h = dimensions.recto.height

	let buffer = p.createGraphics(w, h)
	if (!printing) buffer.background(dimensions.recto.color)
	else buffer.background(base)

	spreads[pageNum].draw(buffer, dimensions)

	if (pageNum == spreads.length - 1) { buffer.background('#eee') }

	let img = buffer.get(dimensions.verso.width, 0,
		dimensions.recto.width, dimensions.recto.height)
	return img
}

export let signature = (spreads, sheets, spreadNum) => ({ spreads, sheets, spreadNum })
export let drawAccordionBook = (p, signatures) => {
	// TODO: maybe also accept a positioner for getting position
	let totalWidth = arr => arr.reduce((acc, sig) => {
		let dim = sig.sheets[0]
		acc += dim.width
		return acc
	}, 0)
	let spreadsgrouped = arr => arr.reduce((acc, sig, i) => {
		// TODO: make this not [0] and the highesst?
		let dim = sig.sheets[0]
		acc[i].push(dim.width / 2)
		acc.push([])
		acc[i + 1].push(dim.width / 2)
		return acc
	}, [[0]])
	let sumarrsigs = arr => arr.reduce((acc, sig) => {
		acc.push(sig.reduce((a, i) => a + i, 0))
		return acc
	}, [])
	let sum = (acc, i) => acc + i
	let nxpos = i => sumarrsigs(spreadsgrouped(signatures.slice(0, i + 1)).slice(0, i + 1)).reduce(sum, 0)
	let x = ((p.width - totalWidth(signatures)) / 2)

	let xpos = i => ({
		x: x + nxpos(i),
		y: s.em(10)
	})

	signatures.forEach((sig, i) => {
		let loc = xpos(i)
		if (printing) drawSaddle(p, sig.spreads, sig.sheets, loc.x, loc.y, sig.spreadNum)
		else drawSignature(p, sig.spreads, sig.sheets, loc.x, loc.y, sig.spreadNum)
	})
}

// ----------------- +x+ --
// ++ LINE FUNCTIONS
// ----------------- +x+ --
/**
@param {string} text
@param {Unit} length
@param {Unit} x
@param {Unit} y
@param {LineHooks=} hooks
@param {ParentState} state
@param {p5} p
@returns {{leading: number, text: string}} 

Takes text and length, and returns overflowed text.
TODO: Return amount to skip/add or smth + text...
*/
function draw_line(p, text, x, y, length, state, hooks) {
	let last = {}
	if (text.charAt(0) == `\n`) {
		if (text.charAt(1) == `\n`) {
			return { text: text.slice(2), leading: 1.1 }
		}

		return { text: text.slice(1), leading: .4 }
	}

	let break_ratio = 1
	let lines = text.split(`\n`)
	let words = lines.shift().split(" ")
	let tagged = ""
	let tag

	let end_lines = `\n` + lines.join(`\n`)

	let skip = false

	/**@type LineState*/
	let line_state = {
		space_size: p.textWidth(" "),
		hyphen_leftover: "",
		horizontal_pos: 0,
		word_count: 0,
	}

	// let try_hyphenation = (word) => {
	// 	if (word.includes("-")) return false

	// 	let hyphenated
	// 	if (funky_hyphens) {
	// 		hyphenated = word.split("")
	// 	} else {
	// 		hyphenated = hyphenateSync(word, {
	// 			hyphenChar: "---((---))---"
	// 		}).split("---((---))---")
	// 	}


	// 	// try to put first of hyphenated in...
	// 	/**@type {number[]}*/
	// 	let sizes = hyphenated.map(e => p.textWidth(e))
	// 	let already = line_state.horizontal_pos
	// 	//let lexeme = hyphenated.shift()
	// 	let condition = () => {
	// 		let cur_size = sizes
	// 			.slice(0, count + 1)
	// 			.reduce((sum, a) => sum += a, 0)
	// 		return already + cur_size < length
	// 	}

	// 	let count = 0
	// 	while (condition()) { count++ }

	// 	//let word_len = p.textWidth(lexeme)

	// 	if (count == 0) return false
	// 	else {
	// 		let remainder = hyphenated.slice(count).join("")
	// 		let word = hyphenated.slice(0, count).join("")
	// 		let _fill = p.ctx.fillStyle
	// 		//
	// 		if (color_hyphens) p.fill(p.color("red"))
	// 		p.text(word + "-", x + line_state.horizontal_pos, y)
	// 		p.fill(_fill)
	// 		return remainder
	// 	}

	// 	return false
	// }

	const props = () => ({
		paragraph_state: state.paragraph_state,
		line_state: line_state,
		paragraph: state.paragraph,
		p: p,
	})

	words.forEach((word, index) => {
		if (skip) return
		let word_len = p.textWidth(word)

		let tag = tag_hooks[word.toLowerCase()]
		if (word.toLowerCase() == '+:/reset') { tag = last }

		if (tag) {
			last = {}
			Object.assign(last, state.paragraph)

			p.noStroke();
			p.textSize(state.paragraph.font_size)
			p.textFont(state.paragraph.font_family)
			p.textWeight(state.paragraph.font_weight)

			p.fill(state.paragraph.color)

			if (tag.edge) {
				// check if the next two words will fit in the line or else break
				let curhor = line_state.horizontal_pos
				let word_lens = words.slice(index, index + tag.edge).reduce((acc, e) => acc += p.textWidth(e), 0)
				if (curhor + word_lens > length) {
					skip = true
					return
				}
			}


			if (tag.negative) {
				line_state.negative_marker = -1 * tag.negative
			}

			if (tag.positive) {
				if (line_state.horizontal_pos != 0) line_state.horizontal_pos += tag.positive
			}

			if (tag.positive_y) {
				line_state.positive_y_marker = tag.positive_y
			}

			if (tag.color) p.fill(tag.color)
			if (tag.leading) { p.textLeading(tag.leading) }
			if (tag.break_ratio) { break_ratio = tag.break_ratio }
			if (tag.font_size) p.textSize(tag.font_size)
			if (tag.font_weight) p.textWeight(tag.font_weight)
			if (tag.font_family) p.textFont(tag.font_family)
			if (tag.font_style) p.textStyle(p[tag.font_style])

			tagged = word + " "
			line_state.space_size = p.textWidth(" ")
			line_state.word_count++

			return
		}

		// if (typeof hooks?.beforeWord == "function") hooks?.beforeWord(props())
		if (line_state.horizontal_pos + word_len > length) {
			// try hyphenation...
			// if (!state.paragraph.hyphenate) {
			// 	skip = true
			// 	return
			// }

			// let _leftover = try_hyphenation(word)
			// if (_leftover) {
			// 	line_state.hyphen_leftover = _leftover
			// 	line_state.word_count++
			// }
			skip = true
			return
		}

		let _fill = p.ctx.fillStyle
		if (word.includes(`\n`)) {
			p.fill(p.color("red"))
		}

		word = word.replace("//", "/ ")

		let negative_marker = 0
		let positive_marker = 0
		let positive_y_marker = 0
		let space_size = line_state.space_size
		if (line_state.negative_marker) {
			negative_marker = line_state.negative_marker
			line_state.negative_marker = undefined
			word_len = 0
			space_size = 0
		}

		if (line_state.positive_y_marker) {
			positive_y_marker = line_state.positive_y_marker
			line_state.positive_y_marker = undefined
		}


		p.text(word, x + line_state.horizontal_pos + negative_marker, y + positive_y_marker)
		p.fill(_fill)
		line_state.horizontal_pos += word_len
		line_state.horizontal_pos += space_size
		line_state.word_count++
	})

	p.opacity(1)
	words = words.slice(line_state.word_count).join(" ")


	let t = line_state.hyphen_leftover ? line_state.hyphen_leftover + " " + words + end_lines : words + end_lines
	if (words.length > 0) t = tagged + t

	return { text: t, leading: 1 }
}

let linked_frame = ([text, frames]) => ({
	draw: (p, props) => {
		let count = 0
		/**@type {ParagraphProps}*/
		let last_props = { text: "" }

		while (text && count < frames.length) {
			let updated = frames[count]
			updated.text = text
			Object.assign(last_props, updated)

			text = draw_paragraph(p, last_props)
			count++
		}

		return text
	}
})

/**
@param {ParagraphProps} paragraph
@param {p5} p
@param {Grid} grid 

@description takes text and length, and returns overflowed text.
*/
function draw_paragraph(p, paragraph, grid) {
	const is_fn = fn => typeof fn == "function"

	//@ts-ignore
	if (paragraph.x && is_fn(paragraph.x)) paragraph.x = paragraph.x(grid)
	//@ts-ignore
	if (paragraph.y && is_fn(paragraph.y)) paragraph.y = paragraph.y(grid)
	//@ts-ignore
	if (paragraph.length && is_fn(paragraph.length)) paragraph.length = paragraph.length(grid)
	//@ts-ignore
	if (paragraph.height && is_fn(paragraph.height)) paragraph.height = paragraph.height(grid)

	/**@type Paragraph*/
	let _paragraph = Object.assign({
		text: "",
		font_family: "monospace",
		font_weight: 300,
		font_style: 'NORMAL',
		x: 10,
		y: 10,
		height: 100,
		length: 100,
		leading: 12,
		rotation: 0,
		color: p.color("black"),
		stroke: p.color("black"),
		font_size: 14,
		rect: false,
		hooks: {},
		hyphenate: true
	}, paragraph)


	p.textSize(_paragraph.font_size)
	p.textFont(_paragraph.font_family)
	p.textWeight(_paragraph.font_weight)
	p.textLeading(_paragraph.leading)
	p.textStyle(p.NORMAL)

	/**@type ParagraphState*/
	let paragraph_state = {
		vertical_pos: _paragraph.y + p.textLeading(),
		word_count: 0,
	}

	// _paragraph.rotation=0

	if (_paragraph.rotation != 0) {
		p.push()
		p.translate(_paragraph.x, _paragraph.y)
		p.angleMode(p.DEGREES)
		p.rotate(_paragraph.rotation)
		paragraph_state.vertical_pos = p.textLeading()
		_paragraph.x =  0 
		_paragraph.y =  0
	}

	if (_paragraph.rect) {
		p.noFill();
		p.strokeWeight(.5)
		p.stroke(_paragraph.stroke);
		p.rect(_paragraph.x, _paragraph.y, _paragraph.length, _paragraph.height);
	}

	p.noStroke();
	p.fill(_paragraph.color)
	let start_length = _paragraph.text.length

	while (
		// text is there
		_paragraph.text.length > 0

		// vertical pos hasnt exited bounding box
		&& paragraph_state.vertical_pos < _paragraph.y + _paragraph.height
	) {

		// reset every iter
		p.noStroke();
		p.textSize(_paragraph.font_size)
		p.textFont(_paragraph.font_family)
		p.textWeight(_paragraph.font_weight)
		p.fill(_paragraph.color)
		p.textStyle(p[_paragraph.font_style]);

		p.textLeading(_paragraph.leading)


		paragraph_state.word_count = start_length - _paragraph.text.length


		let { text, leading } = draw_line(
			p,
			_paragraph.text,
			_paragraph.x,
			 paragraph_state.vertical_pos,
			_paragraph.length,
			{
				paragraph: _paragraph,
				paragraph_state
			},
			_paragraph.hooks
		)
		_paragraph.text = text
		paragraph_state.vertical_pos += p.textLeading() * leading
		//leading
		//
		//
	}

	if (_paragraph.rotation != 0) {
		p.pop()
	}

	// OVERFLOW MARKER
	if (_paragraph.text.length > 0) {
		// draw red rectangle
		p.noFill();
		p.strokeWeight(2)
		p.stroke("red");
		let xx = _paragraph.x + _paragraph.length - 10
		let yy = _paragraph.y + _paragraph.height - 10
		p.text("X", xx + 10, yy + 10)
		p.rect(xx, yy, 20, 20);
	}
	return _paragraph.text
}

function fillColor(doc, props){
	if (props.fill) doc.fillColor(props.fill)
}

function fill(doc, props){
	if (props.fill) doc.fill(props.fill)
}


function stroke(doc, props){
	if (props.stroke) doc.stroke(props.stroke)
}

function strokeColor(doc, props){
	if (props.stroke) doc.strokeColor(props.stroke)
}

function fontSize(doc, props){
	if (props.fontSize) doc.fontSize(props.fontSize)
}

function lineWidth(doc, props){
	console.log("line width", props.lineWidth)
	if (props.lineWidth) doc.lineWidth(props.lineWidth)
}

function text(doc, props){
	fillColor(doc, props)
	strokeColor(doc, props)
	fontSize(doc, props)
	lineWidth(doc, props)
	let opts = {linebreak: false}
	if (props.stroke) opts.stroke =true
	if (props.fill) opts.fill = true
	else opts.fill = false
	doc.text(props.text, props.x, props.y, opts)
	doc.dash(5, {space: 1})
	// doc.undash()
	// if (props.stroke) doc.stroke()
}
function rect(doc, props){
	// let opts = {linebreak: false}
	// if (props.stroke) opts.stroke =true
	// if (props.fill) opts.fill = true
	// else opts.fill = false
	doc.rect(props.x, props.y, props.width, props.height)
	stroke(doc, props)
	fill(doc, props)
	// doc.dash(5, {space: 1})
	// doc.undash()
	// if (props.stroke) doc.stroke()
}

export let foot = ([text, side = 'left']) => (
	[f('TextFrame'),
	f('{}'),
	['text', text.toUpperCase()],
	['font_family', 'sans-serif'],
	['font_weight', '600'],
	['font_size', [f('point'), 17]],
	['color', 'blue'],
	['length', [f('inch'), 4.1]],
	['height', [f('inch'), 4.1]],
	['x', [f('inch'), side == 'left' ? .4 : 2]],
	['y', [f('mul'),
	[o('rand')],
	[f('inch'), 1.2]]]])

export let reduceprops = (props) => props.reduce((acc, tuple) => {
	if (Array.isArray(tuple)) {
		let key = tuple[0]
		let value = tuple[1]
		acc[key] = runa(value)
		return acc
	}
	else if (isObject(tuple)) {
		Object.entries(tuple).forEach(([k, v]) => acc[k] = v)
		return acc
	}
}, {})

export let rootenv = {
	"foot": foot,
	"key": (args) => args[0][args[1]],
	"set": (args, env) => env[args[0]] = runa(args[1], env),
	'progn': (args, env) => {
		let f = runa(args, env)
		return f[f.length - 1]
	},
	"p5": (args, env) => {
		// [p5 [background, 255]]
	},
	"position": (args, env) => {
		return {
			x: args[0],
			y: args[1],
		}
	},
	"map": (args, env) => {
		let list = args[0]
		let fn = args[1]

		let items = list.map((e, i) => fn([e]))
		return items
	},
	"Loop": (args, env) => {
		// will basically map args
		let name = args[0][0]
		let list = runa(args[0][1])
		let block = args[1]
		let envv = { ...env }
		let items = list.map((e, i) => {
			envv[name.name] = e
			return runa(block, envv)
		})

		console.log(items)
		return Group(items)
	},
	"text": (props) => ({draw: (doc) => text(doc, props)}),
	"rect": (props) => ({draw: (doc) => rect(doc, props)}),
	"range": ([count]) => Array(parseInt(count)).fill(0).map((_, i) => i),
	"Fold": (props) => props,
	"History": (props) => runa(props[props[0]]),
	"Group": Group,
	"TextBlock": TextFrame,
	"TextFrame": TextFrame,
	"ImageBlock": imageframe,
	"Circle": Circle,
	"Intersection": IntersectionFrame,
	"{}": reduceprops,
	"em": em,
	"inch": inch,
	"point": point,
	"px": px,
	"pica": pica,
	"add": add,
	"mul": mul,
	"sub": sub,
	"div": div,
	"rand": Math.random(),
	"+": (props) => props.reduce((acc, e) => acc + parseFloat(e), 0),
	"-": (props) => props.slice(1).reduce((acc, e) => acc - parseFloat(e), props[0]),
	"*": (props) => props.reduce((acc, e) => acc * parseFloat(e), 1),

	"recto": recto,
	"linked_frame": linked_frame,
	"column_width_verso": column_width_verso,
	"column_width_recto": column_width_recto,
	"verso": verso,
	"hangline": hangline,
	"accordion": (p) => drawAccordionBook(...p)
}


