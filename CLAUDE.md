# Kitsap Jail Roster — Project Context

## What it is
A public jail roster monitor for Kitsap County, WA. Scrapes the sheriff's site every 30 minutes, tracks bookings and releases, and displays them on a public website.

## URLs
- **Live site:** https://theonlytacocat.github.io/ksco-scraper/
- **GitHub repo:** https://github.com/theonlytacocat/ksco-scraper
- **Source data:** Kitsap County Sheriff's Office public roster

## Architecture
- **Scraper:** `scrape.js` — standalone Node.js script, runs via GitHub Actions cron every 30 min
- **Frontend:** React + Vite, served as static files on GitHub Pages (`gh-pages` branch)
- **Data storage:** JSON files committed to git in `data/` — no server, no database
- **Hosting cost:** $0 (moved off Railway May 2026)

## Key files
- `scrape.js` — scraper (extracted from server.js, also writes stats.json + status.json)
- `server.js` — old Express server (kept for reference, no longer running)
- `scrapers/kitsap.js` — actual scraping logic (Cheerio/axios, HTML not PDF)
- `stats.js` — all stat aggregation functions
- `utils.js` — `nowPST()` timestamp helper (uses hourCycle h23 to avoid midnight 24:xx bug)
- `data/change_log.json` — full history of all bookings/releases since Mar 24 2026
- `data/roster.json` — current roster state
- `data/stats.json` — precomputed stats (regenerated each scrape)
- `data/status.json` — {inCustody, lastUpdated}
- `.github/workflows/scrape.yml` — GitHub Actions workflow (scrape + build + deploy)
- `frontend/src/App.jsx` — React app, HashRouter, fetches from ./data/*.json static files
- `frontend/vite.config.js` — base: './' for GitHub Pages compatibility

## Data format
- `change_log.json` is an array of booking entries, newest first
- Each entry has: bookingNumber, name, status (in_custody/released), firstSeen, releasedAt, charges[], age, sex, race, height, weight, etc.
- `firstSeen` format: "MM/DD/YYYY, HH:MM:SS" (PST)

## Related project
- **Mason County Jail Roster** — separate repo, still on Railway (~$0.87/mo), PDF-based scraper, much more complex. Repo: https://github.com/theonlytacocat/mason-jail-roster. Live at https://alexasroster.com
