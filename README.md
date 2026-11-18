# Global Buyer Export Dashboard

A full-stack **TypeScript** dashboard built around the assessment video *"API Export & Manual Export Tricks to Get Buyers in Different Countries"*. It automates buyer discovery, data extraction, email validation, AI classification, Gmail outreach, duplicate prevention and reporting for a **singing bowls / home décor export business targeting the US**.

## Tech stack

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Recharts, Lucide |
| Backend | Node.js + Express, TypeScript (run with `tsx`) |
| Data | Local JSON files (`server/data/`) |
| AI | Gemini API via REST (with heuristic fallback) |
| Search | Serper / Google CSE when configured, otherwise DuckDuckGo HTML + live website scraping |
| Mail | Gmail API (OAuth), SMTP (App Password), or DEMO mode |

## Quick start

```bash
# 1. Install dependencies (root + client)
npm run setup

# 2. Add your Gemini key to .env
#    GEMINI_API_KEY=your_key_here

# 3. Start both servers
npm run dev
```

- Dashboard: **http://localhost:3000**
- API: **http://localhost:5001** (port 5000 is often taken by macOS AirPlay)

Production-style run:

```bash
npm run build
npm start
```

## Environment variables

Copy `.env.example` to `.env`. All integrations are optional — the app runs without them using fallbacks.

| Variable | Used for |
| --- | --- |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI buyer classification |
| `SERPER_API_KEY` or `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` | Live search-based discovery |
| `SMTP_USER`, `SMTP_PASS` | Sending real email via Gmail App Password |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Sending via Gmail API |
| `FROM_NAME`, `FROM_EMAIL` | Email sender identity |
| `PORT` | Backend port (default 5001) |

Without mail credentials the app uses **demo send mode**: emails are recorded in the history but not delivered. The UI clearly labels this.

## Modules (mapped to the video)

1. **Buyer Discovery** — multi-source search (Google Maps, Google Search, LinkedIn, Facebook, business directories, company sites, ImportYeti, ThomasNet, trade shows, US business directories), CSV import, manual entry, and live email/phone extraction from websites. **Country → state → city narrowing** is built in as cascading selectors (plus a custom location override). Every selected source is searched in one run and merged.
2. **Buyers / Leads** — searchable/filterable database with bulk selection and actions.
3. **Email Validation** — syntax checks, disposable-domain filtering and live DNS MX lookups.
4. **AI Classification** — Gemini classifies each contact as business or individual with confidence + reasoning.
5. **Outreach / Gmail** — personalized templates with `{{name}}`, `{{company}}`, `{{product}}`, `{{city}}`, PDF presentation attachment, and email history.
6. **Duplicate Prevention** — email + website checks on discovery, CSV import and manual entry.
7. **Reports & Data** — charts, CSV export, activity log and storage overview.
8. **Integrations** — live connection status and setup instructions.

## Video summary

A full write-up of the assessment video — what export is, the dashboard modules it asks for, and
the manual (non-IT) buyer-finding tricks — is in [`VIDEO_SUMMARY.md`](./VIDEO_SUMMARY.md).

## Suggested demo flow

1. Open **Overview** to show KPIs and charts.
2. Go to **Buyer Discovery**, set product `Singing Bowls`, location `Houston, TX, United States`, pick sources and click **Find buyers**.
3. Open **Buyers / Leads**, select a few rows and run **Validate emails**, then **AI classify**.
4. Go to **Outreach / Gmail**, upload a PDF presentation, select recipients and click **Send**.
5. Finish at **Reports & Data** to show the funnel, activity log and CSV export.
