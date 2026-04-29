
(function () {
  "use strict";

  function cleanText(text) {
    return String(text || "")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  async function extractTxt(file) {
    return cleanText(await file.text());
  }

  async function extractHtml(file) {
    var raw = await file.text();
    var doc = new DOMParser().parseFromString(raw, "text/html");
    Array.prototype.forEach.call(doc.querySelectorAll("script, style, nav, header, footer"), function (el) {
      el.remove();
    });
    return cleanText(doc.body ? doc.body.innerText : doc.documentElement.innerText);
  }

  async function extractPdf(file) {
    if (!window.pdfjsLib) {
      throw new Error("PDF extraction requires pdf.js. Load already includes lib-pdf.min.js in many builds.");
    }
    var buf = await file.arrayBuffer();
    var pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    var pages = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var content = await page.getTextContent();
      var pageText = content.items.map(function (item) { return item.str; }).join(" ");
      pages.push(pageText);
    }
    return cleanText(pages.join("\n\n"));
  }

  async function extractEpub(file) {
    if (!window.ePub) {
      throw new Error("EPUB extraction requires epub.js. Load already includes lib-epub.min.js in many builds.");
    }
    var buf = await file.arrayBuffer();
    var book = window.ePub(buf);
    await book.ready;
    var spineItems = book.spine && book.spine.spineItems ? book.spine.spineItems : [];
    var chunks = [];
    for (var i = 0; i < spineItems.length; i++) {
      try {
        var item = spineItems[i];
        var doc = await item.load(book.load.bind(book));
        var text = doc && doc.body ? doc.body.innerText : "";
        chunks.push(text);
        item.unload();
      } catch (e) {
        chunks.push("");
      }
    }
    return cleanText(chunks.join("\n\n"));
  }

  async function extractFromFile(file) {
    var name = (file.name || "").toLowerCase();
    var type = file.type || "";

    if (name.endsWith(".txt") || type.indexOf("text/plain") >= 0) return extractTxt(file);
    if (name.endsWith(".html") || name.endsWith(".htm") || type.indexOf("text/html") >= 0) return extractHtml(file);
    if (name.endsWith(".pdf") || type.indexOf("pdf") >= 0) return extractPdf(file);
    if (name.endsWith(".epub")) return extractEpub(file);

    return extractTxt(file);
  }

  window.BookTextExtractor = {
    cleanText: cleanText,
    extractFromFile: extractFromFile,
    extractTxt: extractTxt,
    extractHtml: extractHtml,
    extractPdf: extractPdf,
    extractEpub: extractEpub
  };
})();
