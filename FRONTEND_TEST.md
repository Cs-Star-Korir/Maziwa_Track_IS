# MaziwaTrack frontend – test guide

Follow these steps in order. Each step says what to do and what you should see (✅).
Tick the box when it matches. If something is different, take a screenshot and note the step number.

The app runs on **sample data**, so you do not need the backend or a database.

## Before you start

1. Install **Node.js 20.19 or newer** (check with `node -v`).
2. Pull the latest code, then in a terminal in the project folder:
   ```
   npm install
   npm run dev
   ```
3. Open **http://localhost:5173** in your browser.

Sample accounts (all use the password `password123`):

| Role   | Email               |
|--------|---------------------|
| Farmer | wanjiku@example.com |
| Grader | grader@example.com  |
| Admin  | admin@example.com   |

## 0. Start clean
- [ ] On the Login page, click **Reset sample data** (bottom of the form).

## 1. Login, register and help
- [ ] Log in as `wanjiku@example.com` with a wrong password.
  ✅ Red message: *"Incorrect email or password. Please try again."* There is no role selector on the form.
- [ ] Click **Need help?**
  ✅ Steps for farmers, graders and admin. Click **Back to login**.
- [ ] Click **Register here** and press **Create account** with every field empty.
  ✅ Each field turns red with its own message.
- [ ] Register with your own name, a phone like `0711 222 333`, an email and an 8+ character password typed twice.
  ✅ Back on Login with *"Account created. Please log in."* (Only farmers can register.)
- [ ] Use the sun / screen / moon control in the top corner.
  ✅ Sun = light, moon = dark, screen = follows your computer's setting (the default).

## 2. Farmer
- [ ] Log in as `wanjiku@example.com`.
  ✅ Blue header with "My deliveries", today's date and "Farmer: Wanjiku Mwangi".
- [ ] Click **Save delivery** with the litres box empty.
  ✅ *"Litres must be a number greater than 0"*.
- [ ] Enter `25` and click **Save delivery**.
  ✅ A dashed ticket shows the batch number (e.g. MT-2026…); the batch appears at the top of the history as **Recorded**. **Write the batch number down.**
- [ ] On the **Paid** batch (MT-20261017-0003) click **View receipt**.
  ✅ Receipt with logo, 21.50 L × KSh 50.00 = **KSh 1,075.00** and a payment reference.
- [ ] Click **Print**.
  ✅ Print preview shows only the receipt. Cancel, then **Close**.
- [ ] Add `/admin` to the end of the address and press Enter.
  ✅ You are sent back to the farmer page (farmers cannot open admin pages).
- [ ] Click **Log out**.

## 3. Grader
- [ ] Log in as `grader@example.com`.
  ✅ "Batches to test" with the list of waiting batches.
- [ ] Search for your batch number and click its row.
  ✅ Test form on the right; declared litres (25.00) are greyed out.
- [ ] Enter `24` in **Measured litres**.
  ✅ Yellow warning that measured (24.00 L) differs from declared (25.00 L).
- [ ] Leave **Pass** selected and click **Save result**.
  ✅ *"Saved. Batch … marked as Passed."* and the batch leaves the list.
- [ ] Click **Log out**.

## 4. Admin – approvals
- [ ] Log in as `admin@example.com`.
  ✅ Menu shows Approvals, Reports, Audit log, Help, Log out. Status filter is **Passed**.
- [ ] Find your batch.
  ✅ Row is highlighted yellow with a **Mismatch** label.
- [ ] Click **Approve**.
  ✅ Pop-up: 24.00 L × KSh 50.00 = **KSh 1,200.00**, with a note that payment is on measured litres.
- [ ] Click **Approve** in the pop-up.
  ✅ *"Payment approved. Ref PAY-… Email sent to farmer."*
- [ ] Set Status to **Paid** and click **Filter**.
  ✅ Your batch is listed with its payment reference.

## 5. Admin – reports
- [ ] Open **Reports**, choose **Payments by date range**, From = 1 Oct 2026, To = today, click **Generate report**.
  ✅ Preview with logo, "MaziwaTrack Dairy Cooperative", title, dates, both paid batches and totals (45.50 L, KSh 2,275.00).
- [ ] Click **Download PDF**.
  ✅ Print dialog shows only the report (choose "Save as PDF" to keep it).
- [ ] Choose **Daily collection**, date **19 Oct 2026**, click **Generate report**.
  ✅ Sample batches from that day with a total.

## 6. Admin – audit log
- [ ] Open **Audit log**.
  ✅ Your session is listed newest first: GENERATE_REPORT, APPROVE_PAYMENT, TEST_BATCH, RECORD_DELIVERY, logins and logouts.
- [ ] Set Action to **APPROVE_PAYMENT** and click **Filter**.
  ✅ Only approval entries, showing *status: passed → status: paid*.
- [ ] Check there is no way to edit or delete entries. Then **Log out**.

## 7. Back to the farmer
- [ ] Log in as `wanjiku@example.com`.
  ✅ Your batch shows measured 24.00, Pass, **Paid**, and a **View receipt** button.
- [ ] Open the receipt.
  ✅ **KSh 1,200.00** with the same payment reference the admin saw.

## 8. Phone view
- [ ] Press F12, then Ctrl+Shift+M, and pick a phone size.
  ✅ Menu collapses into ☰; tables scroll sideways; Login form fits the screen.

## Reporting problems
Send in the group: the step number, what you expected, what happened, and a screenshot.
