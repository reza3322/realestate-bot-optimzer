import * as pdfjsLib from "https://esm.sh/pdfjs-dist@3.7.107/legacy/build/pdf.mjs";

// Replace with your test PDF file URL
const pdfUrl = "https://your-pdf-url.com/sample.pdf";

async function testPdfExtraction() {
  try {
    console.log("🔍 Fetching PDF...");
    const response = await fetch(pdfUrl);
    const arrayBuffer = await response.arrayBuffer();

    console.log("📄 Extracting text using pdfjs-dist...");
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let extractedText = "";

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      extractedText += textContent.items.map((item) => item.str).join(" ") + "\n\n";
    }

    console.log("✅ Extracted Text:");
    console.log(extractedText);
  } catch (error) {
    console.error("❌ PDF Extraction Failed:", error);
  }
}

testPdfExtraction();
