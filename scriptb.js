import {blobStream} from './blob-stream.js'
import {PDFDocument} from "./pdfkit.standalone.js"
import {runa, f} from "./runa.js"

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

let spread = [
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
			['y', i*30],
			// ['fill', false],
			['fontSize', 84],
			['lineWidth', Math.random()*3],
			['stroke', 'red']
		])
	
]

draw(runa(spread))
