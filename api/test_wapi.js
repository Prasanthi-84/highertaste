require('dotenv').config();
const { sendWhatsAppTemplate, sendQuotationPDF } = require('./src/services/wapiService');

async function test() {
  const phone = '919876543210';
  const customerName = 'Test User';
  const eventName = 'Catering';
  const quoteNo = 'QT-TEST';
  const amount = '1000';
  const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  console.log("=== TEST TEXT ONLY ===");
  const res1 = await sendWhatsAppTemplate(phone, 'quotation_inquiry', [
    customerName,
    eventName,
    quoteNo,
    amount
  ]);
  console.log(res1);

  console.log("\n=== TEST PDF HEADER ===");
  const res2 = await sendQuotationPDF(phone, pdfUrl, quoteNo, customerName, eventName, amount);
  console.log(res2);
}

test();
