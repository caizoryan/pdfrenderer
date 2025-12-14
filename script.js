import * as PDFJS from "https://esm.sh/pdfjs-dist";
import * as PDFWorker from "https://esm.sh/pdfjs-dist/build/pdf.worker.min";

try {
  PDFJS.GlobalWorkerOptions.workerSrc = PDFWorker;
	console.log("TRIED")
} catch (e) {
  window.pdfjsWorker = PDFWorker;
	console.log("CAUGHT")
	init()
}

function init(){
	let urls = ['./output.pdf', './coverpdfs/cmyk.pdf']
  // Asynchronous download of PDF
	urls.forEach(e => {loadAndRender(e)})
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
      var scale = 1.5;
      var viewport = page.getViewport({scale: scale});

      // Prepare canvas using PDF page dimensions
      var canvas = document.getElementById('canvas');
      var ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {canvasContext: ctx, viewport: viewport};
      var renderTask = page.render(renderContext);

      renderTask.promise.then(function () {
        console.log('Page rendered');
      });
    });
}
