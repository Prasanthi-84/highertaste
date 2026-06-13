const axios = require('axios');
const fs = require('fs');

async function testFlaxxa() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  
  const results = {};

  try {
    const resDoc = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'quotation_inquiry',
      template_language: 'en',
      components: [
        {
          type: 'header',
          parameters: [{ type: 'document', document: { link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', filename: 'dummy.pdf' } }]
        },
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: 'Cat'},
            {type: 'text', text: 'QT'},
            {type: 'text', text: '10'}
          ]
        }
      ]
    });
    results.quotation_inquiry_doc = resDoc.data;
  } catch(e) {
    results.quotation_inquiry_doc = e.response?.data || e.message;
  }

  try {
    const resNoDoc = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'quotation_inquiry',
      template_language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: 'Cat'},
            {type: 'text', text: 'QT'},
            {type: 'text', text: '10'}
          ]
        }
      ]
    });
    results.quotation_inquiry_no_doc = resNoDoc.data;
  } catch(e) {
    results.quotation_inquiry_no_doc = e.response?.data || e.message;
  }
  
  try {
    const resPayment = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'payment_request',
      template_language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: '123'},
            {type: 'text', text: '100'}
          ]
        },
        {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'https://google.com' }]
        }
      ]
    });
    results.payment_request = resPayment.data;
  } catch(e) {
    results.payment_request = e.response?.data || e.message;
  }

  try {
    const resPayment2 = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'payment_request',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: 'ORD-123'},
            {type: 'text', text: '100'},
            {type: 'text', text: 'https://google.com'}
          ]
        }
      ]
    });
    results.payment_request_fallback = resPayment2.data;
  } catch(e) {
    results.payment_request_fallback = e.response?.data || e.message;
  }

  fs.writeFileSync('flaxxa_test3.json', JSON.stringify(results, null, 2));
}

testFlaxxa();
