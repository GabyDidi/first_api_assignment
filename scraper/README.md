## Target classification

- **Site:** Books to Scrape (https://books.toscrape.com)
- **Why:** It's a public sandbox explicitly built for practicing web scraping — not a real business's site.
- **Scope:** Only the first 3 catalogue pages, and the 60 book detail pages linked from them.
- **Data collected:** Book title, price, availability, rating, and description — all publicly displayed text, nothing behind a login.
- **robots.txt result:** No robots.txt file found (404) — its absence is not permission, just a missing file. Proceeding cautiously, limited strictly to the practice sandbox's intended use.

I will not reuse this code on another site without checking its rules and terms first.

## How to run it:

cd scraper
npm install
node src/index.js 


Outputs `output/books.json` (60 validated records), `output/errors.json` (any invalid records + reason), and `output/run-report.json` (a summary of the run).

## Politeness rules followed

- Identifying `User-Agent` header on every request, naming the project and linking to this repo
- 5-second timeout on every request — never hangs forever
- At least 500ms delay between real (non-cached) requests
- Status code checked before trusting any response
- Development reads from a local `cache/` folder instead of re-hitting the site every run

## Record schema

Each validated record in `books.json` has: `title`, `product_url` (canonical identity), `price_gbp` (number), `price_text` (original), `availability_text`, `rating_text`, `description` (nullable), `source_page`, `fetched_at`.

## Handling failures

Each book page is fetched independently — one broken page is logged and skipped, the rest of the run continues. Server errors (5xx) or network timeouts get one automatic retry; a 404 or 403 is not retried, since asking again won't help and repeatedly hitting a site that said no is impolite.

## Sample run report

```json
{
  "start_time": "2026-09-05T20:08:28.408Z",
  "duration_ms": 2043,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```

## Ethics note

This scraper only touches a public practice sandbox built for this exact purpose. In general: use an official API when one exists, never bypass logins or paywalls, and only collect what's actually needed.