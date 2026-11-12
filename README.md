# UnboxedThinking — Supabase Lead CRM

A browser-based, password-login CRM for manual, permission-based business outreach. Uses **Supabase Authentication + PostgreSQL with row-level security**. **No WhatsApp API and no automatic sending.**

## Project

- GitHub: https://github.com/AKxSTAdvertising/whatsapp
- Supabase project ref: `fhpbijphwfsejmdklcdt` (existing AKxSTAdvertising project)
- Database table: `public.unboxed_crm_leads` (new isolated CRM table)
- Expected site after GitHub Pages activation: https://akxstadvertising.github.io/whatsapp/

## First-time setup

1. In **GitHub → Settings → Pages**, select **GitHub Actions**. GitHub's automatic Pages enablement failed with `Resource not accessible by integration`; the repository owner must enable Pages through Settings.
2. In Supabase dashboard **Authentication → Users**, use an **existing account** or invite/create a user through your dashboard. The CRM intentionally has no public sign-up form.
3. Sign in to the website using that account's **email and password**. If the account was created without a password, set a password using Supabase Auth's supported account flows.
4. Import your cleaned `shailesh-leads-with-contact-numbers.csv` through the CRM interface. **Never commit actual leads, CSV lists, passwords or secrets to this public GitHub repository.**
5. Keep the browser tab open until **Supabase cloud sync** finishes. Use **Full backup** to save progress separately.

Each authenticated user owns **their own leads** in this MVP. Leads are not automatically shared between staff members. A team-wide CRM with admin/team roles would need additional authorization design.

## CRM functionality

- Authenticated email/password login; explicit sign-out
- CSV import; skip missing phone numbers; deduplicate by business name + phone
- Search/filter by status, priority and website
- Personalized, editable outreach intro; manual `wa.me` opening only after confirmation of permission to contact
- Calls via `tel:`; status, notes, follow-up dates, dashboard stats
- Supabase cloud persistence (separate user rows protected with four RLS policies)
- CSV export and full-fidelity JSON backup/restore
- Prompted migration for any old browser-only leads saved by the original MVP

## Security notes

- Frontend contains **only the Supabase publishable key** (intended for browser use). Never add the `service_role` key, secret keys, or passwords to the repo.
- RLS restricts SELECT/INSERT/UPDATE/DELETE using `auth.uid() = user_id`. Unauthorized users cannot view another user's leads through the Data API.
- Authentication is enforced before the dashboard becomes visible. Supabase hosts the data, not GitHub.
- An old browser-only lead cache may still remain in the importing browser to prevent data loss. After verifying cloud sync and exporting a backup, you can clear old site data manually.
- The Supabase account has *existing unrelated security advisories*; review them separately in Supabase Advisors before broader production use.
- Do not send unsolicited or bulk WhatsApp messages. Confirm permission, review drafts, and honor opt-outs.

## Local development

Open `index.html` with a modern browser or serve the directory using a static local server. Supabase Auth requires a working network connection and the external pinned Supabase JS library. No secrets or environment files are needed for this static client.

## CSV columns

`Business Name, Niche, Founder, Phone, Email, Address, Website, Rating, Reviews, Website Status, Digital Score, Lead Priority`.

10-digit phone numbers are assumed to use Indian country code +91 for click-to-chat; all others should include their correct country code.

## Deployment

GitHub Actions workflow at `.github/workflows/pages.yml` uploads **only** the app HTML/CSS/JS and configures Pages. If the workflow fails at `Configure GitHub Pages` with a permissions error, enable Pages from repo settings first.

## Limitations

- No password reset page or self-registration form yet
- Supabase-backed, per-user CRM, not shared team workspaces
- Cloud sync uses batched browser requests; avoid closing the tab while a large CSV import is syncing
- App-level and integration testing in a real browser/account still required after Pages activation
