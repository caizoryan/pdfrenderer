import {blobStream} from './blob-stream.js'
import {PDFDocument} from "./pdfkit.standalone.js"

import * as PDFJS from "https://esm.sh/pdfjs-dist";
import * as PDFWorker from "https://esm.sh/pdfjs-dist/build/pdf.worker.min";

try {
  PDFJS.GlobalWorkerOptions.workerSrc = PDFWorker;
	console.log("TRIED")
} catch (e) {
  window.pdfjsWorker = PDFWorker;
	console.log("CAUGHT")
}

let queued

function loadAndRender(url) {
	let start = new Date()
  var loadingTask = PDFJS.getDocument(url);
  loadingTask.promise.then((pdf) => render(pdf, start), (reason) =>  console.error(reason));
}

let render = (pdf, start) => {
		let end = new Date()
		let ms = end.valueOf() - start.valueOf()
    console.log('PDF loaded in', ms);

    // Fetch the first page
    var pageNumber = 1;
    pdf.getPage(pageNumber).then(function(page) {
      console.log('Page loaded');
      var scale = 1;
      var viewport = page.getViewport({scale: scale});

      // Prepare canvas using PDF page dimensions
      var canvas = document.getElementById('canvas');
      var ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {canvasContext: ctx, viewport: viewport};
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

let size = 10
let gap = 10
let funkyforms = (doc) => {
	for (let i = inch(0); i < inch(11); i += size + gap) {
		for (let j = inch(0); j < inch(8.5); j += size + gap) {
			if (Math.random() > 0.5) continue

			let rotation = Math.random() * 10 + 15
			let x = i - 5
			let y = j - 2
			let opacity = Math.random()

			doc
				.save()
				.rotate(rotation, { origin: [i - 5 + 20, j - 2 + 20] })
				.rect(x, y, size, size)
				.strokeOpacity(opacity)
				.stroke('White')
				.restore()

			doc
				.fontSize(7)
				.fillColor('White', .6)
				.text("(( " + Math.floor(opacity * 100) + "% ))", x + 5, y + 5, { lineBreak: false })
		}
		
			let rotation = Math.random() * 10 + 15
			let x = i - 5
			let y = j - 2
			let opacity = Math.random()

			doc
				.save()
				.rotate(rotation, { origin: [i - 5 + 20, j - 2 + 20] })
				.rect(x, y, size, size)
				.strokeOpacity(opacity)
				.stroke('yellow')
				.restore()

			doc
				.fontSize(7)
				.fillColor('yellow', .6)
				.text("(( " + Math.floor(opacity * 100) + "% ))", x + 5, y + 5, { lineBreak: false })
		}
	}

	for (let i = inch(1); i < inch(6); i += size + gap) {
		for (let j = inch(3); j < inch(7); j += size + gap) {
			if (Math.random() > 0.5) continue

			let rotation = Math.random() * 10 + 15
			let x = i - 5
			let y = j - 2
			let opacity = Math.random()

			doc
				.save()
				.rotate(rotation, { origin: [i - 5 + 20, j - 2 + 20] })
				.rect(x, y, size, size)
				.strokeOpacity(opacity)
				.stroke('White')
				.restore()

			doc
				.fontSize(7)
				.fillColor('White', .6)
				.text("(( " + Math.floor(opacity * 100) + "% ))", x + 5, y + 5, { lineBreak: false })
		}
	}

	doc
		.save()
		.circle(inch(7), inch(3), inch(1.8))
		.dash(5, { space: 10 })
		.stroke('White')
		.restore()

	doc
		.save()
		.circle(inch(5), inch(5.8), inch(.8))
		.dash(5, { space: 10 })
		.lineWidth(3)
		.stroke('White')
		.restore()

	doc
		.save()
		.circle(inch(2.3), inch(5.4), inch(.5))
		.dash(5, { space: 10 })
		.lineWidth(5)
		.stroke('White')
		.restore()

	doc
		.moveTo(inch(4.5), inch(1))
		.lineTo(inch(4), inch(7))
		.lineWidth(3)
		.stroke('White')

	doc
		.moveTo(inch(8), inch(1))
		.lineTo(inch(6), inch(5))
		.lineWidth(5)
		.stroke('White')


	doc
		.moveTo(inch(10), inch(1))
		.lineTo(inch(7), inch(4))
		.lineWidth(8)
		.stroke('White')



}

let inch = v => v * 72
// doc.pipe(fs.createWriteStream('output.pdf'));


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




let move = (x, y) => {
		size=x/window.innerWidth * 50
		gap=y/window.innerHeight * 25
		const doc = new PDFDocument({ layout: 'landscape' });
		var stream = doc.pipe(blobStream());

		doc.addSpotColor('White', 0, 100, 0, 0)

		funkyforms(doc)
		doc.end();
		stream.on('finish', function() {
			let url = stream.toBlobURL('application/pdf');
			loadAndRender(url)
		});
}

document.onmousemove = throttle((e) => {
	console.log(e.clientX)
	console.log(e.clientY)
	move(e.clientX, e.clientY)
}, 50)
