# UnboxedThinking — Lead Outreach CRM

A privacy-conscious, browser-local CRM for manually managing business outreach **without the WhatsApp API**.

## Features

- Import CSV (including `shailesh-leads-with-contact-numbers.csv`) and skip rows with missing phone numbers
- Search by business, niche, phone, address and email
- Filter by priority, status and website status
- Auto-generated, editable niche-aware message drafts
- Manual WhatsApp chat opening via `wa.me` (does **not** send a message)
- Checkbox requiring user confirmation of permission to contact before opening a WhatsApp draft
- Phone dialer, lead status, notes and next follow-up date
- Follow-up due list and pipeline summary
- CSV export and JSON backup/restore
- Mobile-friendly layout

## Data safety and limitations

**Important:** This first version uses the browser's `localStorage` only. There is **no server database, shared/team sync, remote authentication, or password-protected application** yet. Anyone can access the empty web application if hosted publicly, but leads added in your browser are **not uploaded to GitHub or a server**. Browser profiles, browser resets, device changes, private browsing, and storage clearing can lose data. Export a JSON backup frequently and protect those backups.

**Do not put actual lead CSV files, phone lists, credentials or private backups in this public repository.** Instead, use the app's *Import leads* button after opening it in your own browser.

Use the outreach features only for contacts that have agreed to the relevant channel. Verify permissions yourself. Respect opt-outs. The app never auto-sends messages, never runs a bulk WhatsApp campaign and never claims to have sent messages.

Phone numbers with **10 digits are treated as Indian numbers (+91)** when generating WhatsApp links; other numbers should be provided in international format. Check the recipient before sending.

## Run locally

Open `index.html` in a browser (or serve this folder over a simple local web server). Import your CSV, work on leads and export backups.

## GitHub Pages deployment

1. Open **Settings → Pages** in this GitHub repository.
2. Choose **GitHub Actions** as the build/deployment source, if not selected.
3. Open **Actions**, find **Deploy UnboxedThinking CRM**, and check the latest run. You can trigger it with **Run workflow**.
4. When successful, the expected project site URL is `https://akxstadvertising.github.io/whatsapp/`.

The workflow intentionally packages **only** `index.html`, `assets/app.css` and `assets/app.js` into the published artifact.

## CSV fields

`Business Name, Niche, Founder, Phone, Email, Address, Website, Rating, Reviews, Website Status, Digital Score, Lead Priority`

CSV import **merges** leads by business name + phone and keeps existing statuses/notes. Full JSON backup **replaces** current data upon confirmation. A CSV export is for spreadsheets and should not be used as a full-fidelity restore; use the JSON backup instead.

## Production roadmap

For a **truly private, multi-device CRM**, deploy a backend with Supabase Authentication, PostgreSQL and row-level security (RLS), and host the authenticated frontend on a production-compatible service. Do not connect public lead data to a database without access control. Add scheduled follow-up reminders only with the user's express approval.

UnboxedThinking · AKxST Advertising.
