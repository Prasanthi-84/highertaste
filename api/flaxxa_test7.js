const axios = require('axios');
const fs = require('fs');

async function testTemplates() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  
  const payload = {
    token: wapiToken,
    phone: phone,
    template_name: 'quotation_inquiry',
    template_language: 'en', // THIS WAS 'en_US' before!
    components: [
      {
        type: 'header',
        parameters: [{type: 'document', document: {link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', filename: 'dummy.pdf'}}]
      },
      {
        type: 'body',
        parameters: [
          {type: 'text', text: 'Mukunda'},
          {type: 'text', text: 'Marriage Catering'},
          {type: 'text', text: 'QT-123'},
          {type: 'text', text: '1000'}
        ]
      }
    ]
  };
    
  try {
    const res = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', payload);
    fs.writeFileSync('flaxxa_test_en.json', JSON.stringify(res.data, null, 2));
  } catch(err) {
    fs.writeFileSync('flaxxa_test_en.json', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

testTemplates();
