# Frontend build report – MaziwaTrack

Date: 21 Oct 2026. Built from wireframes W1–W5. Nothing has been committed or pushed to GitHub.

## What was built
| Wireframe | Screen | Requirement |
|---|---|---|
| W1 | Login (no role selector), Register (farmers only, validated), Help | FR1 |
| W2 | Farmer: record delivery → batch number shown, my deliveries with status, receipt (paid only) with Print | FR2 |
| W3 | Grader: batches to test with search, test batch (measured litres, Pass/Reject, notes), mismatch warning | FR3 |
| W4 | Admin approvals: filter by status/date/farmer, mismatches highlighted, approve modal with amount | FR4 |
| W5 | Reports (daily collection, payments by date range, farmer statement) with logo + date; audit log with filters | FR5 |
| All | Dark mode toggle, role-based routes, mobile menu | NFRs |

## How it was tested
- `npm run build` passes; `npm run lint` shows only 2 harmless warnings (see issue 7).
- Manual test steps for the team: `FRONTEND_TEST.md`.
- Automated browser run of the full flow with sample data, no console errors:
  1. Farmer: empty litres → "Litres must be a number greater than 0"; 25 L → batch number shown and listed as Recorded.
  2. Grader: searched the batch, entered 24 L → mismatch warning; saved as Passed.
  3. Admin: batch highlighted with Mismatch; approve modal showed 24 × KSh 50 = KSh 1,200; approval message with payment ref.
  4. Admin: payments report generated and printed to PDF with logo and date; audit log showed every step; filter by action works.
  5. Farmer: batch now Paid with a receipt; receipt prints to PDF.
  6. Role guard: a farmer opening /admin is sent back to /farmer.
  7. Dark mode and a phone-width screen checked.

## Issues and things to decide
1. **`.env` could not be written** from here (blocked for safety). The app runs without it on sample data.
   When the backend is ready, use the single `.env` in the project root (copied from the root `.env.example`) with `VITE_USE_MOCK=false`.
2. **Leftover file `src/components/ComingSoon.jsx`** from the first batch has been removed.
3. **PDFs use the browser's "Save as PDF".** Reports and receipts show a preview with the logo,
   cooperative name and date, and "Download PDF"/"Print" opens the print dialog. This meets FR5 without
   extra libraries. If your lecturer wants the server to generate the PDF file, Tonybrian can add a
   PDFKit route later; the screens would not need to change.
4. **API contract needs Tonybrian's agreement.** The routes the frontend expects are listed at the end of this report.
   Two additions beyond the earlier plan: `GET /config` (price per litre for the approve pop-up) and
   `POST /reports/log` (so generating a report appears in the audit log). Reports reuse `GET /batches`
   with date filters instead of a separate report route.
5. **The backend must do the real work** the sample data only imitates: generate batch numbers and payment
   references, calculate the amount, send the email on approval, write audit log entries, and check roles
   on every route (the frontend role guard is for convenience, not security).
6. **Batch number counter.** Sample data numbers batches with one running counter
   (e.g. `MT-20261021-0007`). Decide with Tonybrian whether the last 4 digits reset each day.
7. **Lint warnings:** 2 "fast refresh" warnings in `AuthContext.jsx`. They only affect hot reload during
   development; no action needed.
8. **Sample dates are 16–19 Oct 2026.** The daily report defaults to today, so pick 19 Oct to see sample rows.
9. **Node version:** Vite 8 needs Node 20.19+ or 22.12+. Run `node -v` if `npm run dev` fails.
10. **maji_platform code was not reused.** Its files are stored online-only in OneDrive and could not be
    opened, so only its folder layout was used as a guide.

## Not included (outside the MVP)
Forgot password, user management screen, SMS/M-Pesa – as agreed in the requirements.

## API the frontend expects (agree with Tonybrian)
All JSON, login via httpOnly cookie (`credentials: 'include'`). Errors: `{ "message": "..." }` with a 4xx status.

| Method & route | Body / query | Returns |
|---|---|---|
| POST `/auth/register` | full_name, phone, email, password | `{ user }` |
| POST `/auth/login` | email, password | `{ user }` (user_id, full_name, email, role) |
| POST `/auth/logout` | – | – |
| GET `/auth/me` | – | `{ user }` or 401 |
| GET `/config` | – | `{ price_per_litre, cooperative_name }` |
| POST `/batches` (farmer) | declared_litres | batch |
| GET `/batches/mine` (farmer) | – | batches |
| GET `/batches` (grader: status=recorded; admin) | status, from, to, farmer | batches |
| PATCH `/batches/:batch_number/verify` (grader) | measured_litres, quality_result, grader_notes | batch |
| POST `/payments` (admin) | batch_number | batch (status paid, with payment) |
| POST `/reports/log` (admin) | type | – (writes the audit entry) |
| GET `/audit-logs` (admin) | user, action, date | logs with user_name, batch_number |

A "batch" is a `batches` row plus `farmer_name` and `payment`
(`{ payment_reference, price_per_litre, amount, email_sent, approved_at }` or `null`), newest first.
