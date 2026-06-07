require('dotenv').config();
const { sendWhatsAppTemplate, sendQuotationPDF } = require('./src/services/wapiService');
const fs = require('fs');

async function run() {
  const phone = '919876543210';
  const customerName = 'Test User';
  const eventName = 'Catering';
  const quoteNo = 'QT-TEST';
  const amount = '1000';
  const pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  let out = {};
  out.res1 = await sendWhatsAppTemplate(phone, 'quotation_inquiry', [
    customerName,
    eventName,
    quoteNo,
    amount
  ]);
  
  out.res2 = await sendQuotationPDF(phone, pdfUrl, quoteNo, customerName, eventName, amount);

  fs.writeFileSync('test_out.json', JSON.stringify(out, null, 2), 'utf8');
}

run();
