const axios = require('axios');
const fs = require('fs');

async function testTemplates() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  
  const templatesToTest = [
    { name: 'quotation_inquiry', hasDoc: false },
    { name: 'quotation_inquiry', hasDoc: true },
    { name: 'quotation_pdf', hasDoc: true },
    { name: 'quotation_pdf', hasDoc: false }
  ];

  const results = {};

  for (const t of templatesToTest) {
    const key = `${t.name}_${t.hasDoc ? 'with_doc' : 'no_doc'}`;
    const payload = {
      token: wapiToken,
      phone: phone,
      template_name: t.name,
      template_language: 'en_US',
      components: t.hasDoc ? [
        {
          type: 'header',
          parameters: [{type: 'document', document: {link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', filename: 'dummy.pdf'}}]
        },
        {
          type: 'body',
          parameters: [{type: 'text', text: 'T'}, {type: 'text', text: 'T'}, {type: 'text', text: 'T'}, {type: 'text', text: 'T'}]
        }
      ] : [
        {
          type: 'body',
          parameters: [{type: 'text', text: 'T'}, {type: 'text', text: 'T'}, {type: 'text', text: 'T'}, {type: 'text', text: 'T'}]
        }
      ]
    };
    
    try {
      const res = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', payload);
      results[key] = res.data;
    } catch(err) {
      results[key] = err.response?.data || err.message;
    }
  }

  fs.writeFileSync('flaxxa_test_all.json', JSON.stringify(results, null, 2));
}

testTemplates();
