const fs = require('fs');
const pdfParseModule = require('pdf-parse');

async function extractText() {
    try {
        console.log('typeof pdfParseModule:', typeof pdfParseModule);
        console.log('pdfParseModule.PDFParse:', typeof pdfParseModule.PDFParse);
        console.log('pdfParseModule keys:', Object.keys(pdfParseModule));

        const buffer = fs.readFileSync('./Files/Extrato.pdf');
        let text = '';
        if (typeof pdfParseModule === 'function') {
            const data = await pdfParseModule(buffer);
            text = data.text;
        } else if (pdfParseModule && pdfParseModule.PDFParse) {
            // Modern versions (like 2.4.x) use a class-based API
            const pdfParse = new pdfParseModule.PDFParse(new Uint8Array(buffer));
            await pdfParse.load();
            const data = await pdfParse.getText();
            text = data.text;
        } else if (pdfParseModule && pdfParseModule.default) {
            const data = await pdfParseModule.default(buffer);
            text = data.text;
        } else {
            throw new Error('Could not find a valid PDF parsing function in the module.');
        }

        console.log('--- PDF TEXT START ---');
        console.log(text);
        console.log('--- PDF TEXT END ---');
    } catch (err) {
        console.error('Error parsing PDF:', err);
    }
}

extractText();
