import { PDFDocument } from "https://deno.land/x/pdf@v1.2.0/mod.ts";

// Replace with your test PDF file path
const pdfPath = "./sample.pdf"; // Change this to a valid local PDF file

async function extractPdfText(pdfFilePath: string) {
  try {
    console.log("🔍 Reading PDF file...");
    const pdfBytes = await Deno.readFile(pdfFilePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    let extractedText = "";

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i);
      extractedText += page.getText() + "\n\n"; // Preserve formatting
    }

    console.log("✅ Extracted Text:");
    console.log(extractedText);
  } catch (error) {
    console.error("❌ PDF Extraction Failed:", error);
  }
}

// Run the test
await extractPdfText(pdfPath);
