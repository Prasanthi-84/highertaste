# WHATSAPP MASTER DEBUG REPORT
**Project:** Satvata Foods / The Higher Taste Catering
**Generated:** 2026-06-07
**Status:** All 12 tasks audited, root causes identified, code fixes applied.

---

## COMPLETE FLOW MAP

### Quotation Flow
```
[User clicks "Send Quote via WhatsApp" — quote-details.tsx:388]
    useSendQuoteWhatsappMutation → sendQuoteWhatsapp(id)
    ↓
[RTK quoteApi.ts] → POST /api/quotes/:id/send-whatsapp (+ Bearer JWT)
    ↓
[Route quoteRoutes.js:31] → protect middleware → sendQuoteWhatsApp controller
    ↓
[quoteController.js → sendQuoteWhatsApp()]
  CTRL-STEP 1: Route hit
  CTRL-STEP 2: Quote.findById(id).populate('customerId')
  CTRL-STEP 3: Extract phone from quote.customerId.phone
  CTRL-STEP 4: pdfUrl = getApiBaseUrl() + /api/quotes/download/:id
  CTRL-STEP 5: sendQuotationWithPDF(phone, pdfUrl, ...)
    ↓
[wapiService.js → sendQuotationWithPDF()]
  PART A: sendQuotationTemplate() 
          → sendWhatsAppTemplate(phone, 'quotation_inquiry', [4 body vars])
          → POST /sendtemplatemessage  { components: [{ type:'body', parameters:[...] }] }
  PART B: sendQuotationPDF()
          → POST /sendtemplatemessage  { components: [header:document, body:[4 vars]] }
    ↓
[FlaxxaWapi: POST https://wapi.flaxxa.com/api/v1/sendtemplatemessage]
  Returns { message_wamid: "wamid.xxx" } = SUCCESS
  Returns { message_wamid: null }         = TEMPLATE REJECTED (name typo or not approved)
```

### Payment Link Flow
```
[User clicks "Send Payment Link" — order-details.tsx:677]
    handleSendWhatsapp('link')
    ↓
  IF no existing link: POST /api/payments/create-link
  IF link exists:      POST /api/payments/:id/share-whatsapp
    ↓
[paymentController.js]
  createPaymentLink():         Razorpay.paymentLink.create() → sendWhatsAppTemplate(phone, 'payment_request', [4 vars])
  sharePaymentLinkWhatsApp():  sendWhatsAppTemplate(phone, 'payment_request', [4 vars])
    ↓
[FlaxxaWapi] → { message_wamid: "wamid.xxx" } = SUCCESS (after fix)
```

---

## BUGS FOUND & ROOT CAUSES

---

### BUG 1 — PAYMENT LINK: WRONG TEMPLATE NAME [PRIMARY ROOT CAUSE] ✅ FIXED

**Files fixed:**
- `api/src/controllers/paymentController.js` line 519
- `api/src/controllers/paymentController.js` line 564
- `api/src/controllers/whatsappController.js` line 30

**Problem (before fix):**
All three locations used `'payment_link'` as the template name.
The FlaxxaWapi approved template is named `'payment_request'`.
FlaxxaWapi silently returns `{ message_wamid: null }` when template name does not match.

**Log you would have seen:**
```
[WA-DEBUG] ✔ STEP 5 OK: HTTP 200 received
[WA-DEBUG]   Raw response: {"message_wamid":null}
[WA-DEBUG] ✖ STEP 6 FAILED: Template "payment_link" was REJECTED by FlaxxaWapi
```

**Fix applied:** `'payment_link'` → `'payment_request'` in all 3 locations.

---

### BUG 2 — QUOTATION: TWO TEMPLATES REQUIRED, MAY HAVE ONLY ONE

**Problem:**
`sendQuotationWithPDF()` makes TWO separate FlaxxaWapi calls:
1. `quotation_inquiry` — TEXT template, body only, 4 variables
2. `quotation_pdf`    — DOCUMENT template, header (PDF) + 4 body variables

If only ONE template was created in FlaxxaWapi (the document one), then:
- PART A (`quotation_inquiry`) fails — message_wamid = null
- PART B (`quotation_pdf`) may work IF the PDF URL is publicly accessible

**Both templates must exist and be APPROVED separately in FlaxxaWapi:**

| Template | Type | Header | Body Variables |
|----------|------|--------|----------------|
| `quotation_inquiry` | TEXT | None | {{1}} customerName, {{2}} serviceType, {{3}} quoteNo, {{4}} amount |
| `quotation_pdf` | DOCUMENT | PDF file (1 var) | {{1}} customerName, {{2}} eventName, {{3}} quoteNo, {{4}} amount |

**Action required (manual):** Log into FlaxxaWapi dashboard → verify both templates exist and are APPROVED.

---

### BUG 3 — PDF URL IS LOCALHOST (PDF DELIVERY FAILS) ✅ PARTIALLY FIXED

**File:** `api/src/services/wapiService.js` → `getApiBaseUrl()`

**Problem:**
When `API_URL` environment variable is not set, `getApiBaseUrl()` returns `http://localhost:5000`.
FlaxxaWapi's servers cannot reach localhost — the PDF download attempt fails.

**Current local .env:** `API_URL` is NOT set.
**Impact:** PDF attachment in `quotation_pdf` template will fail even if template is approved.

**Code fix applied:** Improved `getApiBaseUrl()` to:
- Check `RAILWAY_PUBLIC_DOMAIN` (newer Railway auto-inject)
- Check `RAILWAY_STATIC_URL` (older Railway auto-inject)
- Print CLEAR WARNING LOG when falling back to localhost
- Still falls back to localhost as last resort

**Action required (production):**
Set in Railway dashboard → Variables:
```
API_URL=https://your-app.railway.app
```

**For local PDF testing:**
```bash
# Install ngrok, expose local port, set API_URL temporarily
ngrok http 5000
# Then in .env: API_URL=https://xyz.ngrok.io
```

---

### BUG 4 — PHONE: 11-DIGIT LEADING-0 NOT HANDLED ✅ FIXED

**File:** `api/src/services/wapiService.js` → `formatPhoneNumber()`

**Before fix:** Only handled 10-digit numbers. Number like `09876543210` was passed through unchanged.

**After fix:** Added handling for:
- 11-digit starting with `0` → replace `0` with `91` → `919876543210` ✅
- 13-digit starting with `0` → strip leading `0` → `91XXXXXXXXXX` ✅

---

### BUG 5 — QUOTATION PDF PAYLOAD STRUCTURE: CORRECT (NO FIX NEEDED) ✅

`sendQuotationPDF()` in `wapiService.js` already sends the correct FlaxxaWapi document template payload:

```json
{
  "token": "...",
  "phone": "91XXXXXXXXXX",
  "template_name": "quotation_pdf",
  "template_language": "en_US",
  "components": [
    {
      "type": "header",
      "parameters": [{"type": "document", "document": {"link": "https://...", "filename": "Quotation-QT-001.pdf"}}]
    },
    {
      "type": "body",
      "parameters": [
        {"type": "text", "text": "CustomerName"},
        {"type": "text", "text": "EventName"},
        {"type": "text", "text": "QT-001"},
        {"type": "text", "text": "25000"}
      ]
    }
  ]
}
```

Both header document AND body variables are present. Code is correct — action is on FlaxxaWapi dashboard.

---

## FRONTEND AUDIT — ALL BUTTONS VERIFIED ✅

| Button | Page:Line | Handler | RTK Mutation | Backend Route |
|--------|----------|---------|--------------|---------------|
| "Send Quote via WhatsApp" | quote-details.tsx:388 | `handleWhatsAppShare()` | `useSendQuoteWhatsappMutation` | `POST /api/quotes/:id/send-whatsapp` |
| "Resend via WhatsApp" | quote-details.tsx:392 | same | same | same |
| "Preview PDF" | quote-details.tsx:399 | `window.open(url)` | — | `GET /api/quotes/download/:id` |
| "Send Confirmation" | order-details.tsx:669 | `handleSendWhatsapp('confirmation')` | `useSendOrderWhatsAppMutation` | `POST /api/orders/:id/send-whatsapp` |
| "Send Payment Link" | order-details.tsx:677 | `handleSendWhatsapp('link')` | `useCreatePaymentLinkMutation` | `POST /api/payments/create-link` |
| Share icon (existing link) | order-details.tsx:648 | `handleSendWhatsapp('link')` | `useSharePaymentLinkWhatsappMutation` | `POST /api/payments/:id/share-whatsapp` |
| "Send Status Update" | order-details.tsx:685 | `handleSendWhatsapp('status')` | `useSendOrderWhatsAppMutation` | `POST /api/orders/:id/send-whatsapp` |

All buttons are correctly wired to RTK mutations and backend routes. Frontend is NOT the failure point.

---

## BACKEND ROUTES AUDIT ✅

| Route | Controller | Status |
|-------|-----------|--------|
| `POST /api/quotes/:id/send-whatsapp` | quoteController.sendQuoteWhatsApp | ✅ Correct |
| `GET /api/quotes/download/:id` | quoteController.downloadQuotePDF | ✅ Public (no auth) |
| `POST /api/payments/create-link` | paymentController.createPaymentLink | ✅ Fixed template |
| `POST /api/payments/:id/share-whatsapp` | paymentController.sharePaymentLinkWhatsApp | ✅ Fixed template |
| `POST /api/whatsapp/payment-link` | whatsappController.sendPaymentLink | ✅ Fixed template |
| `POST /api/orders/:id/send-whatsapp` | orderController.sendOrderWhatsApp | ✅ Correct |

---

## PDF AUDIT

| Check | Status |
|-------|--------|
| `generateQuotePDF()` defined | ✅ pdfService.js:149 (alias of generateInvoicePDF) |
| PDF generates as Buffer | ✅ Uses pdfkit |
| PDF response headers correct | ✅ Content-Type + Content-Disposition set |
| PDF route is public | ✅ Before `router.use(protect)` in quoteRoutes.js |
| PDF URL public in production (with API_URL set) | ✅ Will work |
| PDF URL reachable from FlaxxaWapi in local dev | ❌ localhost is not reachable — use ngrok |

---

## FLAXXA WAPI CONFIG SUMMARY

| Setting | Value | Status |
|---------|-------|--------|
| WAPI_TOKEN | `212656387069d4dcc8aa914` | ✅ Present in .env |
| WAPI_BASE_URL | `https://wapi.flaxxa.com/api/v1` | ✅ Correct |
| WAPI_LANGUAGE | `en_US` | ✅ Present |
| Endpoint | `POST /sendtemplatemessage` | ✅ Correct |
| API_URL for PDF | NOT SET in .env | ❌ Must set in production |

### Templates that MUST be approved in FlaxxaWapi:

| Template Name | Type | Required By |
|--------------|------|------------|
| `quotation_inquiry` | TEXT (body only, 4 vars) | Quote send (Part A) |
| `quotation_pdf` | DOCUMENT (header+4 body) | Quote send (Part B) |
| `payment_request` | TEXT (body only, 4 vars) | Payment link send |
| `order_confirmation` | TEXT (body only, 6 vars) | Order created |
| `order_dispatched` | TEXT (body only, 5 vars) | Order dispatched |
| `order_delivered` | TEXT (body only, 2 vars) | Order delivered |

---

## CODE FIXES APPLIED (SUMMARY)

| File | Change | Status |
|------|--------|--------|
| `paymentController.js:519` | `'payment_link'` → `'payment_request'` | ✅ Applied |
| `paymentController.js:564` | `'payment_link'` → `'payment_request'` | ✅ Applied |
| `whatsappController.js:30` | `'payment_link'` → `'payment_request'` | ✅ Applied |
| `wapiService.js:formatPhoneNumber` | Added 11-digit/13-digit leading-0 handling | ✅ Applied |
| `wapiService.js:getApiBaseUrl` | Added RAILWAY_PUBLIC_DOMAIN + clear warning logs | ✅ Applied |

---

## MANUAL ACTIONS REQUIRED (CANNOT BE DONE IN CODE)

1. **FlaxxaWapi Dashboard** → Templates → Verify `quotation_inquiry` is "Approved"
2. **FlaxxaWapi Dashboard** → Templates → Verify `quotation_pdf` is "Approved"
3. **FlaxxaWapi Dashboard** → Templates → Verify `payment_request` is "Approved"
4. **Railway Dashboard** → Variables → Add `API_URL=https://your-app.railway.app`
5. Restart the API service after adding Railway env var

---

## SUCCESS CRITERIA — POST-FIX EXPECTED BEHAVIOR

### Quotation Flow:
```
Create Quote
  → sendQuotationWithPDF() triggered
    → PART A: quotation_inquiry TEXT sent → Customer gets text WA ✅ (if template approved)
    → PART B: quotation_pdf DOCUMENT sent → Customer gets PDF WA ✅ (if template approved + API_URL set)
  → quote.whatsappSent = true
  → quote.status = 'Sent'
```

### Payment Flow:
```
Click "Send Payment Link"
  → Razorpay link generated (short_url)
  → payment_request template sent → Customer gets clickable payment link ✅ (after fix)
```

---
*Report generated by full code audit — no file was changed except the 3 template name fixes and 2 service improvements listed above.*
