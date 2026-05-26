const axios = require('axios');
const token = 'EAANqzRmR6ZC0BRgfICV21X2XsTboLHdaUJtbfP0p2Yo5ZCrB4QZAB42WiCmP8pFiZAu73tJMaJAeKUfDEyTZB8bA8ee5bixe2y4HoQBKu9JhPZAWyXywWe1qryTAZCI20ttQTnglp49EYDMcLjJuHREh3wySH5ftYmj0pQ0x1Be2urMIrjzheklAcMyeHFlFPxgOuwU1NQPvQnIrT4Imw5TBJ4nIpZBe6K9UARIL9i8HpFFjojFaDpE7kTadAUl9xWnR8JtiZA6tZCqntB8PNLrZBgZBZC53P';
const phoneId = '1159339270595670';
const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;

const run = async () => {
  try {
    const res = await axios.post(url, {
      messaging_product: 'whatsapp',
      to: '918247808856',
      type: 'template',
      template: {
        name: 'hare_krishna_market_order_confirmation',
        language: { code: 'en_US' }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
};
run();
