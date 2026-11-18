# Video Summary — "API Export & Manual Export Tricks to Get Buyers in Different Countries"

**Video:** https://youtu.be/_ixy46sPpmY
**Assessment:** Prepare a DASHBOARD as per need + write the summary of the whole video.

---

## 1. What the video is about

The video explains how **export** works end-to-end and then focuses on the practical task of
**finding real buyers abroad** for Indian-made products. Export is defined simply as a good
produced in one country and sold to buyers in another country — a fundamental part of
international trade that lets businesses reach global markets.

Three parties make up the chain:

1. **Manufacturer** — makes the product in India.
2. **Buyer** — the company or person abroad who buys it.
3. **Us (the mediator/agent)** — connects the two.

Most beginners start as **mediators** rather than manufacturers, because it is the best way to
learn the cycle without heavy investment.

---

## 2. Product and market selection

- You cannot launch with every product. **Pick one category first**, then find buyers for it.
- The video chooses **singing bowls** (a home décor / wellness item) as the focus product,
  because it is easily available in India and has demand abroad.
- The target market demonstrated is the **United States**.
- The buyers to look for are **showrooms, small shops, retail stores, wellness stores,
  importers, wholesalers and distributors** — the people who sell the same product in their
  country and would therefore buy it from us.

---

## 3. The main task — build a dashboard (for IT/developer audience)

The speaker explicitly says this discussion is for people from an **IT background** who want to
build an **API-based dashboard**. The dashboard must automate this workflow:

> *Turn scattered online information into an organised, outreach-ready buyer list.
> One workflow connects research, data quality, buyer classification, email sending and reporting.*

### Modules required in the dashboard

| # | Module | What it must do |
|---|--------|-----------------|
| 1 | **Buyer discovery** | Search **Google, Facebook, LinkedIn, business directories and company websites** for importers, wholesalers, retailers, wellness stores, distributors and showrooms. Collect leads from **multiple sources** to build a wider international prospect list. |
| 2 | **Data extraction** | Capture buyer **name, company name, contact number, email ID** and any other available detail into one database. |
| 3 | **Email validation** | Check formatting and filter out **invalid emails** — only correct addresses should be mailed. |
| 4 | **Gemini AI classification** | Classify each contact as a **business buyer or individual buyer**, so B2B marketing data stays filtered and useful. |
| 5 | **Gmail sender** | Send outreach to selected contacts with a **personalised message** introducing the company. Spamming must be avoided — if an email looks like spam it will not be delivered and the effort is wasted. |
| 6 | **Presentation PDF** | Always **attach the product presentation** to every outreach email. |
| 7 | **Data storage / email history** | Store buyer contact information so it can be tracked and reused later. |
| 8 | **Duplicate prevention** | Do **not** collect or email the same buyer repeatedly — it destroys trust and makes you look like a spammer. |
| 9 | **Web interface & reporting** | Upload lead files, review contact records, run classification and see what is happening. |

### Summary of the dashboard requirement (in one line)

*A dashboard that finds buyers in the US or any country for one product, collects their maximum
possible details (name, company, email, phone), guarantees the emails are valid and non-duplicate,
and sends them a personalised email with the product presentation attached.*

---

## 4. Manual tricks for non-IT people

The second half covers how to do the **same job without any coding**, using free tools.

### a) LinkedIn
- Create a good, representable **profile** (photo, details) — people judge you by it.
- Search the **People** section using job titles: *buyer, assistant buyer, home décor buyer,
  purchaser, CEO* combined with the product (*singing bowls, lamps*).
- Keep the **common keyword "buyer"** — titles vary by company and product.
- Send **2–3 connection requests daily** and see who accepts.
- Use browser extensions such as **Lusha** or **Apollo** to fetch contact numbers from profiles
  (they have free monthly limits).

### b) Google Search + Google Maps (narrowing technique)
This is the key trick of the video — **always narrow the geography**:

```
United States  →  too broad (the US spans multiple time zones)
Texas          →  state level, still many results
Houston        →  city level, highly specific and contactable
```

- Search *"home décor showrooms in Houston, Texas"* and the map shows many results.
- Click a listing to get the **contact number**, then open the **website → Contact Us page**
  to find the **email ID**.
- **Copy every detail into a database** — without a database you will have to search the same
  things again and again.
- If no email is available, use the **phone number for cold calling**; the team can call and,
  if the person is interested, obtain the email address that way.

### c) Other buyer sources to research
The video asks viewers to open and evaluate each of these one by one:

- **ImportYeti** — US import shipment data; shows companies importing home décor, their shipment
  counts and recent activity. Some of these "suppliers" also import from India.
- **Trade shows & exhibitor directories** — useful but often paid; decide if the investment is
  worth it at the start.
- **ThomasNet** — US wholesalers, distributors and home furnishing businesses.
- **Alibaba, IndiaMART** — supplier/buyer marketplaces.
- **US business directories, US Yellow Pages, Yelp, Chamber of Commerce directories.**
- **Cold email outreach** — the final step, done once the database exists.

---

## 5. Key takeaways

1. **Pick one product and one market** before doing anything else.
2. **Narrow your search** — country → state → city beats a country-wide search every time.
3. **Collect contacts from many platforms**, not just Google.
4. **Always maintain a database** — data without storage is useless, you will re-do the work.
5. **Validate emails** so you do not send to invalid addresses.
6. **Never duplicate** your outreach — repetition looks like spam and gets you blocked.
7. **Always attach the presentation** and personalise the message.
8. **Phone numbers matter** — even without an email they enable cold calling.
9. **Research every platform individually**; what works differs by product and region.
10. **At last, the target is always the buyer** — every technique exists to reach one.

---

## 6. How this dashboard implements the video

| Video requirement | Where in the app |
| --- | --- |
| Multi-source buyer discovery | **Buyer Discovery** — Google Maps, Google Search, LinkedIn, Facebook, Business Directories, Company Websites, ImportYeti, ThomasNet, Trade Shows, US Business Directories. All selected sources are searched in one run. |
| Country → state → city narrowing | **Buyer Discovery** — cascading Country → State → City selectors, plus a custom location override. |
| Data extraction (name, company, email, phone) | Live scraping of result pages and their Contact Us pages; stored per buyer. |
| Email validation | **Email Validation** — syntax, disposable-domain filter, live DNS MX lookup. |
| Gemini AI classification | **AI Classification** — business vs individual with confidence and reasoning (heuristic fallback when no key). |
| Gmail sender + personalisation | **Outreach / Gmail** — `{{name}}`, `{{company}}`, `{{product}}`, `{{city}}` variables. |
| Presentation PDF attachment | **Outreach / Gmail** — upload PDF, attach to every send. |
| Duplicate prevention | Email + website checks on discovery, CSV import and manual entry. |
| Data storage & email history | JSON storage + full email history table. |
| Web interface & reporting | **Overview**, **Buyers/Leads**, **Reports & Data** — charts, CSV export, activity log. |
