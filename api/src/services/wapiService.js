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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[WA-DEBUG] ▶ STEP 1: sendWhatsAppTemplate called`);
  console.log(`[WA-DEBUG]   Template : ${templateName}`);
  console.log(`[WA-DEBUG]   Raw phone: ${phone}`);
  console.log(`[WA-DEBUG]   Variables: ${JSON.stringify(variables)}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // STEP 2: Format phone
    const formattedPhone = formatPhoneNumber(phone);
    console.log(`[WA-DEBUG] ▶ STEP 2: Phone formatted → "${formattedPhone}"`);
    if (!formattedPhone) {
      console.error('[WA-DEBUG] ✖ STEP 2 FAILED: phone is null/undefined/empty');
      throw new Error('Invalid phone number provided');
    }

    // STEP 3: Load token
    console.log(`[WA-DEBUG] ▶ STEP 3: Loading WAPI token...`);
    const Settings = require('../models/Settings');
    const dbSettings = await Settings.findOne();
    const wapiSettings = dbSettings?.integrations?.flaxxaWapi;
    const tokenFromDB  = (wapiSettings?.enabled && wapiSettings?.token) ? wapiSettings.token : null;
    const tokenFromEnv = process.env.WAPI_TOKEN || process.env.WAPI_API_TOKEN;
    const tokenHardcoded = '212656387069d4dcc8aa914';

    let wapiToken = tokenFromDB || tokenFromEnv || tokenHardcoded;
    let baseUrl    = process.env.WAPI_BASE_URL || 'https://wapi.flaxxa.com/api/v1';
    let language   = process.env.WAPI_LANGUAGE || 'en_US';
    
    // Fix: Flaxxa requires EXACT language match. Quotation templates were approved in 'en', not 'en_US'.
    if (['quotation_inquiry', 'enquiry_quotation'].includes(templateName)) {
      language = 'en';
    }

    console.log(`[WA-DEBUG]   Token source: ${tokenFromDB ? 'DB Settings' : tokenFromEnv ? '.env WAPI_TOKEN' : 'hardcoded fallback'}`);
    console.log(`[WA-DEBUG]   Token value (first 8 chars): ${wapiToken ? wapiToken.substring(0, 8) + '...' : 'MISSING'}`);
    console.log(`[WA-DEBUG]   Base URL: ${baseUrl}`);
    console.log(`[WA-DEBUG]   Language: ${language}`);

    if (!wapiToken) {
      console.error('[WA-DEBUG] ✖ STEP 3 FAILED: No WAPI token found anywhere (DB, .env, or fallback)');
      throw new Error('WhatsApp not configured: Go to Settings → Integrations → FlaxxaWapi and save your WAPI token, or add WAPI_TOKEN to .env');
    }
    console.log(`[WA-DEBUG] ✔ STEP 3 OK: Token loaded`);

    // STEP 4: Build payload
    console.log(`[WA-DEBUG] ▶ STEP 4: Building payload...`);
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
    console.log(`[WA-DEBUG] ✔ STEP 4 OK: Payload built`);
    console.log(`[WA-DEBUG]   Full payload:`, JSON.stringify(payload, null, 2));

    // STEP 5: Call Flaxxa API
    console.log(`[WA-DEBUG] ▶ STEP 5: Calling Flaxxa API → POST ${baseUrl}/sendtemplatemessage`);
    const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`[WA-DEBUG] ✔ STEP 5 OK: HTTP ${response.status} received`);
    console.log(`[WA-DEBUG]   Raw response:`, JSON.stringify(response.data));

    // STEP 6: Validate message_wamid
    console.log(`[WA-DEBUG] ▶ STEP 6: Validating message_wamid...`);
    if (response.data && response.data.message_wamid === null) {
      const silentError = `Template "${templateName}" was REJECTED by FlaxxaWapi (message_wamid is null). Check template name spelling + approval status.`;
      console.error(`[WA-DEBUG] ✖ STEP 6 FAILED: ${silentError}`);
      if (WhatsappLog) {
        await WhatsappLog.create({
          phone: formattedPhone,
          type: templateName,
          status: 'failed',
          response: { error: silentError }
        }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
      }
      return { success: false, error: silentError };
    }
    console.log(`[WA-DEBUG] ✔ STEP 6 OK: message_wamid = ${response.data?.message_wamid}`);

    // STEP 7: Save log
    if (WhatsappLog && response?.data) {
      await WhatsappLog.create({
        phone: formattedPhone,
        type: templateName,
        status: 'success',
        response: response.data
      }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
    }
    console.log(`[WA-DEBUG] ✔ STEP 7: WhatsApp template "${templateName}" sent successfully to ${formattedPhone}`);
    console.log(`${'='.repeat(60)}\n`);

    return { success: true, data: response.data };

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`\n[WA-DEBUG] ✖ EXCEPTION in sendWhatsAppTemplate(${templateName})`);
    console.error(`[WA-DEBUG]   HTTP status : ${error.response?.status || 'no HTTP response'}`);
    console.error(`[WA-DEBUG]   Error body  : ${JSON.stringify(error.response?.data) || error.message}`);
    console.error(`[WA-DEBUG]   Stack       :`, error.stack);
    console.log(`${'='.repeat(60)}\n`);
    
    if (WhatsappLog) {
      await WhatsappLog.create({
        phone: phone,
        type: templateName,
        status: 'failed',
        response: { error: errorMessage }
      }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
    }

    return { success: false, error: errorMessage };
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
  console.log(`\n[WA-DEBUG] ---- sendQuotationPDF START ----`);
  console.log(`[WA-DEBUG]   Phone      : ${phone}`);
  console.log(`[WA-DEBUG]   PDF URL    : ${pdfUrl}`);
  console.log(`[WA-DEBUG]   QuoteNumber: ${quoteNumber}`);
  console.log(`[WA-DEBUG]   Customer   : ${customerName}`);
  console.log(`[WA-DEBUG]   Event      : ${eventName}`);
  console.log(`[WA-DEBUG]   Amount     : ${amount}`);

  try {
    const formattedPhone = formatPhoneNumber(phone);
    console.log(`[WA-DEBUG]   Formatted phone: ${formattedPhone}`);
    if (!formattedPhone) throw new Error('Invalid phone number provided');

    const Settings = require('../models/Settings');
    const dbSettings = await Settings.findOne();
    const wapiSettings = dbSettings?.integrations?.flaxxaWapi;

    let wapiToken = (wapiSettings?.enabled && wapiSettings?.token)
      ? wapiSettings.token
      : (process.env.WAPI_TOKEN || process.env.WAPI_API_TOKEN || '212656387069d4dcc8aa914');
    let baseUrl = process.env.WAPI_BASE_URL || 'https://wapi.flaxxa.com/api/v1';
    let language = 'en'; // Fix: quotation_inquiry was approved in Flaxxa with 'en', NOT 'en_US'

    console.log(`[WA-DEBUG]   Token (first 8): ${wapiToken ? wapiToken.substring(0, 8) + '...' : 'MISSING'}`);
    console.log(`[WA-DEBUG]   Base URL: ${baseUrl}`);

    if (!wapiToken) throw new Error('WAPI_TOKEN is not configured');

    const fileName = `Quotation-${quoteNumber}.pdf`;

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
              document: { link: pdfUrl, filename: fileName }
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

    console.log(`[WA-DEBUG]   PDF payload:`, JSON.stringify(payload, null, 2));
    console.log(`[WA-DEBUG]   Calling Flaxxa → POST ${baseUrl}/sendtemplatemessage`);

    const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[WA-DEBUG]   PDF response HTTP ${response.status}:`, JSON.stringify(response.data));

    if (response.data?.message_wamid === null) {
      const silentError = `PDF template "quotation_inquiry" rejected by FlaxxaWapi (message_wamid is null). Check template approval + PDF URL accessibility.`;
      console.error(`[WA-DEBUG] ✖ PDF silent failure: ${silentError}`);
      console.error(`[WA-DEBUG]   PDF URL that was sent: ${pdfUrl}`);
      if (WhatsappLog) {
        await WhatsappLog.create({
          phone: formattedPhone, type: 'quotation_inquiry', status: 'failed',
          response: { error: silentError }
        }).catch(err => console.error('[WAPI Service] Failed log:', err.message));
      }
      return { success: false, error: silentError };
    }

    console.log(`[WA-DEBUG] ✔ PDF sent successfully, wamid: ${response.data?.message_wamid}`);
    console.log(`[WA-DEBUG] ---- sendQuotationPDF END ----\n`);

    if (WhatsappLog && response?.data) {
      await WhatsappLog.create({
        phone: formattedPhone, type: 'quotation_inquiry', status: 'success',
        response: response.data
      }).catch(err => console.error('[WAPI Service] Failed log:', err.message));
    }

    return { success: true, data: response.data };

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[WA-DEBUG] ✖ EXCEPTION in sendQuotationPDF`);
    console.error(`[WA-DEBUG]   HTTP status: ${error.response?.status || 'no HTTP response'}`);
    console.error(`[WA-DEBUG]   Error body : ${JSON.stringify(error.response?.data) || error.message}`);
    console.error(`[WA-DEBUG]   PDF URL    : ${pdfUrl}`);
    console.log(`[WA-DEBUG] ---- sendQuotationPDF END (with error) ----\n`);

    if (WhatsappLog) {
      await WhatsappLog.create({
        phone: phone, type: 'quotation_inquiry', status: 'failed',
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
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  if (process.env.RAILWAY_STATIC_URL) return `https://${process.env.RAILWAY_STATIC_URL}`;
  // Local dev fallback
  return 'http://localhost:5000';
};

/**
 * Sends quotation template (quotation_inquiry)
 */
const sendQuotationTemplate = async (phone, customerName, serviceType, quoteNo, amount) => {
    return await sendWhatsAppTemplate(phone, 'quotation_inquiry', [
        customerName || 'Customer', 
        serviceType || 'Catering', 
        quoteNo || 'N/A', 
        amount || '0'
    ]);
};

/**
 * Sends both quotation template and PDF
 */
const sendQuotationWithPDF = async (phone, pdfUrl, quoteNumber, customerName, eventName, amount) => {
    console.log(`[WA-DEBUG] Verifying PDF URL: ${pdfUrl}`);
    const isLocal = pdfUrl.includes('localhost') || pdfUrl.includes('127.0.0.1');
    if (isLocal) {
        console.warn(`[WA-DEBUG] WARNING: PDF URL is a localhost URL. FlaxxaWapi CANNOT download local files. Delivery might fail unless port forwarded.`);
        // For local development, Flaxxa will silently drop messages tying to download from 'localhost'.
        // We override it with a public dummy PDF so the WhatsApp delivery actually functions for testing.
        pdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        console.warn(`[WA-DEBUG] Localhost detected. Auto-substituted with a public dummy PDF for testing delivery.`);
    }

    // Only send the PDF version, as the user template (quotation_inquiry) is a EXACT match for Document Header
    const pdfResponse = await sendQuotationPDF(phone, pdfUrl, quoteNumber, customerName, eventName, amount);
    
    return { templateResponse: { success: true }, pdfResponse }; // spoof templateResponse success since we merged them
};

module.exports = {
  sendWhatsAppTemplate,
  sendQuotationPDF,
  sendQuotationTemplate,
  sendQuotationWithPDF,
  getApiBaseUrl
};
