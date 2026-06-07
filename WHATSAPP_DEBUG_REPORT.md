# WhatsApp Debug Report — Satvata Foods
**Generated:** 2026-06-06
**Flow traced:** Send WA / Resend WA button → Flaxxa API

---

## Complete Flow Map

```
[User clicks "Send WA" / "Resend WA"]
         │
         ▼
[Frontend: quotes.tsx / quote-details.tsx]
  handleWhatsAppShare(quote)
  └─ sendQuoteWhatsapp(quote._id).unwrap()         ← RTK Query mutation
         │
         ▼
[RTK Query: store/quoteApi.ts → sendQuoteWhatsapp]
  POST /api/quotes/:id/send-whatsapp
  Headers: Authorization: Bearer <JWT>
  BaseURL: /api → Vite proxy → http://localhost:5000/api
         │
         ▼
[Backend Route: src/routes/quoteRoutes.js]
  router.post('/:id/send-whatsapp', protect, sendQuoteWhatsApp)
         │
         ▼
[Controller: src/controllers/quoteController.js → sendQuoteWhatsApp]
  CTRL-STEP 1: Route hit
  CTRL-STEP 2: DB lookup (Quote + customerId populate)
  CTRL-STEP 3: Extract phone from quote.customerId.phone
  CTRL-STEP 4: Build pdfUrl = getApiBaseUrl() + /api/quotes/download/:id
  CTRL-STEP 5: Call sendQuotationWithPDF(...)
  CTRL-STEP 6: Check templateResponse + pdfResponse
  CTRL-STEP 7: Save flags to DB
         │
         ▼
[Service: src/services/wapiService.js → sendQuotationWithPDF]
  ├─ sendQuotationTemplate → sendWhatsAppTemplate(phone, 'quotation_inquiry', [...])
  └─ sendQuotationPDF      → direct 'quotation_pdf' template call
         │
         ▼
[sendWhatsAppTemplate]
  WA-STEP 1: Entry log (phone + template + variables)
  WA-STEP 2: formatPhoneNumber()
  WA-STEP 3: Load token (DB → .env → hardcoded fallback)
  WA-STEP 4: Build payload
  WA-STEP 5: axios.post → https://wapi.flaxxa.com/api/v1/sendtemplatemessage
  WA-STEP 6: Check message_wamid (null = silent failure)
  WA-STEP 7: Save WhatsappLog to DB
         │
         ▼
[Flaxxa WAPI — external]
  Returns: { message_wamid: "wamid.xxx..." }  ← SUCCESS
       OR  { message_wamid: null }             ← TEMPLATE REJECTED
```

---

## Known Failure Points & How to Identify Each

### FAILURE 1 — Frontend never calls backend

**Symptom:** No CTRL-STEP 1 in backend terminal when you click Send WA.

**Cause:** Token is missing from Redux store (user not logged in) OR Vite proxy is broken.

**How to check:**
1. Open browser F12 → Network tab
2. Click Send WA
3. Look for `POST /api/quotes/.../send-whatsapp`
   - If it doesn't appear: frontend issue (check console for JS errors)
   - If it appears with 401: Redux token is not being sent

**Fix:** Log out and log back in to refresh the JWT token.

---

### FAILURE 2 — Phone number missing or wrong format

**Symptom in logs:**
```
[CTRL-DEBUG] ▶ CTRL-STEP 3: Customer phone = "null"
[CTRL-DEBUG] ✖ CTRL-STEP 3 FAILED: No phone on customerId
```

**Cause:** Customer record has no phone saved.

**Valid formats accepted:**
```
9876543210       → formatPhone adds 91 → 919876543210   ✅
+919876543210    → formatPhone strips + → 919876543210  ✅
919876543210     → already correct                      ✅
null / undefined → FAILS                                ✖
```

**Fix:** Go to customer profile and add a valid 10-digit mobile number.

---

### FAILURE 3 — PDF URL is localhost (Flaxxa cannot reach it)

**Symptom in logs:**
```
[CTRL-DEBUG]   API Base: http://localhost:5000
[CTRL-DEBUG]   PDF URL : http://localhost:5000/api/quotes/download/abc123
[CTRL-DEBUG]   (If API Base is localhost, Flaxxa cannot fetch this PDF — URL must be public!)
```

**Cause:** `getApiBaseUrl()` returns `http://localhost:5000` because `API_URL` env var is not set on the backend.

**Impact:**
- Template message (quotation_inquiry) = STILL SENDS  ✅
- PDF attachment (quotation_pdf) = FAILS              ✖
  (Flaxxa tries to download the PDF from your URL — localhost is unreachable from the internet)

**Fix:** In Railway, set env var:
```
API_URL=https://your-railway-app.up.railway.app
```
Then restart. PDF will work once deployed.

---

### FAILURE 4 — Template rejected (message_wamid = null)

**Symptom in logs:**
```
[WA-DEBUG] ✔ STEP 5 OK: HTTP 200 received
[WA-DEBUG]   Raw response: {"message_wamid":null}
[WA-DEBUG] ✖ STEP 6 FAILED: Template "quotation_inquiry" was REJECTED by FlaxxaWapi
```

**Causes:**
| Cause | Check |
|-------|-------|
| Template name typo | Must be exactly `quotation_inquiry` (lowercase, underscore) |
| Template not approved | Go to Flaxxa dashboard → verify Approved status |
| Wrong variable count | Template expects exactly 4 body vars |
| Language mismatch | en_US in .env must match template language on Flaxxa |

**Fix:** Log in to your Flaxxa WAPI dashboard → Templates → verify `quotation_inquiry` status = Approved.

---

### FAILURE 5 — Wrong / expired WAPI token

**Symptom in logs:**
```
[WA-DEBUG]   Token source: .env WAPI_TOKEN
[WA-DEBUG]   Token value (first 8 chars): 21265638...
[WA-DEBUG] ✔ STEP 5 OK: HTTP 200 received
[WA-DEBUG]   Raw response: {"message_wamid":null,"error":"Invalid token"}
```

**Current token in .env:** `212656387069d4dcc8aa914`

**Fix:** Log in to Flaxxa → Account → API Token. If regenerated, update .env and restart.

---

### FAILURE 6 — Backend returns 500 to frontend

**Symptom in Network tab:** Status 500 on the POST request.

**Symptom in logs:**
```
[CTRL-DEBUG] ✖ CTRL-STEP 6: Template FAILED → <error message here>
```

**Fix:** Read the exact error and match to failures above.

---

## How to Read Your Logs After Clicking Send WA

Look for this exact sequence in the backend terminal:

```
############################################################
[CTRL-DEBUG] ▶ CTRL-STEP 1: POST /api/quotes/:id/send-whatsapp HIT
[CTRL-DEBUG]   Quote ID: 68423abc...
[CTRL-DEBUG] ▶ CTRL-STEP 2: DB lookup done
[CTRL-DEBUG]   Quote found: QT-001, status: Draft
[CTRL-DEBUG] ▶ CTRL-STEP 3: Customer phone = "9876543210"
[CTRL-DEBUG]   Customer name : Ramesh Kumar
[CTRL-DEBUG] ▶ CTRL-STEP 4: PDF URL built
[CTRL-DEBUG]   API Base: http://localhost:5000
[CTRL-DEBUG]   PDF URL : http://localhost:5000/api/quotes/download/abc123
[CTRL-DEBUG] ▶ CTRL-STEP 5: Calling sendQuotationWithPDF...

============================================================
[WA-DEBUG] ▶ STEP 1: sendWhatsAppTemplate called
[WA-DEBUG]   Template : quotation_inquiry
[WA-DEBUG]   Raw phone: 9876543210
[WA-DEBUG] ▶ STEP 2: Phone formatted → "919876543210"
[WA-DEBUG] ▶ STEP 3: Loading WAPI token...
[WA-DEBUG]   Token source: .env WAPI_TOKEN
[WA-DEBUG]   Token value (first 8 chars): 21265638...
[WA-DEBUG] ✔ STEP 3 OK: Token loaded
[WA-DEBUG] ▶ STEP 4: Building payload...
[WA-DEBUG] ✔ STEP 4 OK: Payload built
[WA-DEBUG] ▶ STEP 5: Calling Flaxxa API → POST https://wapi.flaxxa.com/api/v1/sendtemplatemessage
[WA-DEBUG] ✔ STEP 5 OK: HTTP 200 received
[WA-DEBUG]   Raw response: {"message_wamid":"wamid.abc123..."}   ← NOT null = SUCCESS
[WA-DEBUG] ▶ STEP 6: Validating message_wamid...
[WA-DEBUG] ✔ STEP 6 OK: message_wamid = wamid.abc123...
[WA-DEBUG] ✔ STEP 7: WhatsApp template "quotation_inquiry" sent successfully
============================================================

[CTRL-DEBUG] ▶ CTRL-STEP 6: sendQuotationWithPDF returned
[CTRL-DEBUG]   templateResponse: {"success":true}
[CTRL-DEBUG]   pdfResponse     : {"success":false,"error":"..."}  ← Expected locally
[CTRL-DEBUG] ▶ CTRL-STEP 7: Saving quote flags to DB...
[CTRL-DEBUG] ✔ CTRL-STEP 7: Quote saved. whatsappSent=true, status=Sent
############################################################
```

**If the log stops at any step** — that is the exact failure point.

---

## Current Config Summary

| Setting | Value | Status |
|---------|-------|--------|
| WAPI_TOKEN (.env) | `212656387069...` | Present |
| WAPI_BASE_URL | `https://wapi.flaxxa.com/api/v1` | Present |
| WAPI_LANGUAGE | `en_US` | Present |
| Template name used | `quotation_inquiry` | Must be Approved on Flaxxa |
| PDF template name | `quotation_pdf` | Must be Approved on Flaxxa |
| getApiBaseUrl() in local dev | `http://localhost:5000` | PDF attachment will fail locally |
| API_URL env var | Not set | Set in Railway for production PDF |
| Frontend RTK base | `/api` → Vite proxy → :5000 | Correct for local dev |

---

## Quick Fix Checklist

- [ ] Backend terminal shows CTRL-STEP 1? If not → frontend is not calling backend (check Network tab)
- [ ] Phone shown as null? → Go to customer record, add 10-digit phone number
- [ ] message_wamid = null? → Flaxxa dashboard: template `quotation_inquiry` must be Approved
- [ ] Both template + PDF fail? → Token is wrong or expired (check WAPI_TOKEN vs Flaxxa dashboard)
- [ ] Template works but PDF fails locally? → Expected. PDF needs a public URL (deploy + set API_URL)

---

**Next step:** Click Send WA, paste the backend terminal output and the exact STEP where it stops tells us the root cause instantly.
