const axios = require('axios');
const WhatsappLog = require('../models/WhatsappLog'); // Might need this later for logging

/**
 * Format phone number to E.164 without the '+' sign
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-numeric characters
  let cleanPhone = phone.toString().replace(/\D/g, '');
  
  // If it's a 10 digit Indian number, prefix with 91
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  return cleanPhone;
};

/**
 * Generic reusable function to send a WhatsApp template
 * 
 * @param {string} phone - The recipient's phone number
 * @param {string} templateName - The name of the approved template
 * @param {Array} variables - An array of variable values in sequence (or an array of objects)
 */
const sendWhatsAppTemplate = async (phone, templateName, variables) => {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      throw new Error('Invalid phone number provided');
    }

    // Try to get token from settings first
    const Settings = require('../models/Settings');
    const dbSettings = await Settings.findOne();
    const wapiSettings = dbSettings?.integrations?.flaxxaWapi;

    let wapiToken = (wapiSettings?.enabled && wapiSettings?.token) 
      ? wapiSettings.token 
      : (process.env.WAPI_TOKEN || process.env.WAPI_API_TOKEN);
    let baseUrl = process.env.WAPI_BASE_URL || 'https://wapi.flaxxa.com/api/v1';
    let language = process.env.WAPI_LANGUAGE || 'en_US';

    if (!wapiToken) {
      throw new Error('WAPI_TOKEN is not configured in Settings or .env');
    }

    // Format variables into the parameters array for body component
    const parameters = variables.map((variable) => ({
      type: 'text',
      text: variable ? variable.toString() : 'N/A'
    }));

    const payload = {
      token: wapiToken,
      phone: formattedPhone,
      template_name: templateName,
      template_language: language,
      components: parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters
        }
      ] : []
    };

    console.log(`[WAPI Service] Sending template ${templateName} to ${formattedPhone}`);
    console.log(`[WAPI Service] Payload:`, JSON.stringify(payload));

    const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
      headers: {
        'Content-Type': 'application/json'
        // 'Authorization': `Bearer ${wapiToken}` // Just in case, some platforms allow both
      }
    });

    console.log(`[WAPI Service] Success:`, response.data);

    // Save log if Covid requires (Optional but requested for detailed logs)
    if (WhatsappLog && response && response.data) {
      await WhatsappLog.create({
        phone: formattedPhone,
        type: templateName,
        status: 'success',
        response: response.data
      }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
    }

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[WAPI Service] Error sending ${templateName} to ${phone}: ${errorMessage}`);
    
    if (WhatsappLog) {
      await WhatsappLog.create({
        phone: phone,
        type: templateName,
        status: 'failed',
        response: { error: errorMessage } // Map to response so it complies with schema
      }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
    }

    // Return rather than throw to prevent breaking API flows
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Sends a PDF document via WhatsApp using FlaxxaWapi.
 * Uses the `sendtemplatemessage` endpoint with a document header component —
 * this is the correct approach since FlaxxaWapi has no standalone sendDocumentMessage route.
 *
 * Requires the FlaxxaWapi approved template `quotation_pdf` with:
 *   - Header: Document (1 variable → PDF link)
 *   - Body:   {{1}} customerName, {{2}} eventName, {{3}} quoteNumber, {{4}} amount
 *
 * @param {string} phone        - Recipient's phone number
 * @param {string} pdfUrl       - Publicly accessible HTTPS URL for the PDF
 * @param {string} quoteNumber  - Quotation number (used as filename)
 * @param {string} customerName - Customer's name for body {{1}}
 * @param {string} eventName    - Event/service type for body {{2}}
 * @param {number|string} amount - Total amount for body {{4}}
 */
const sendQuotationPDF = async (phone, pdfUrl, quoteNumber, customerName = 'Customer', eventName = 'Catering', amount = '') => {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) throw new Error('Invalid phone number provided');

    const Settings = require('../models/Settings');
    const dbSettings = await Settings.findOne();
    const wapiSettings = dbSettings?.integrations?.flaxxaWapi;

    let wapiToken = (wapiSettings?.enabled && wapiSettings?.token)
      ? wapiSettings.token
      : (process.env.WAPI_TOKEN || process.env.WAPI_API_TOKEN);
    let baseUrl = process.env.WAPI_BASE_URL || 'https://wapi.flaxxa.com/api/v1';
    let language = process.env.WAPI_LANGUAGE || 'en_US';

    if (!wapiToken) throw new Error('WAPI_TOKEN is not configured');

    const fileName = `Quotation-${quoteNumber}.pdf`;

    // FlaxxaWapi uses sendtemplatemessage for ALL message types including documents.
    // The quotation_pdf template has:
    //   header → document (1 param: PDF URL)
    //   body   → 4 params: customerName, eventName, quoteNumber, amount
    const payload = {
      token: wapiToken,
      phone: formattedPhone,
      template_name: 'quotation_pdf',
      template_language: language,
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: pdfUrl,
                filename: fileName
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(customerName || 'Customer') },
            { type: 'text', text: String(eventName || 'Catering') },
            { type: 'text', text: String(quoteNumber) },
            { type: 'text', text: String(amount || '0') }
          ]
        }
      ]
    };

    console.log(`[WAPI Service] Sending Quotation PDF template to ${formattedPhone}`);
    console.log(`[WAPI Service] PDF URL: ${pdfUrl}`);

    const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[WAPI Service] Document template success:`, response.data);

    if (WhatsappLog && response?.data) {
      await WhatsappLog.create({
        phone: formattedPhone,
        type: 'quotation_pdf',
        status: 'success',
        response: response.data
      }).catch(err => console.error('[WAPI Service] Failed log:', err.message));
    }

    return { success: true, data: response.data };

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[WAPI Service] Error sending PDF template to ${phone}: ${errorMessage}`);

    if (WhatsappLog) {
      await WhatsappLog.create({
        phone: phone,
        type: 'quotation_pdf',
        status: 'failed',
        response: { error: errorMessage }
      }).catch(err => console.error('[WAPI Service] Failed log:', err.message));
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Returns the public base URL of this API for building download links.
 * Priority: API_URL env var → RAILWAY_STATIC_URL → fallback construction.
 */
const getApiBaseUrl = () => {
  // Explicitly set in Railway/Vercel env vars
  if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL.replace(/\/$/, '');
  // Railway auto-injects this
  if (process.env.RAILWAY_STATIC_URL) return `https://${process.env.RAILWAY_STATIC_URL}`;
  // Local dev fallback
  return 'http://localhost:5000';
};

module.exports = {
  sendWhatsAppTemplate,
  sendQuotationPDF,
  getApiBaseUrl
};
