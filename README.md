# BASELINE tracker

Quarterly tracker for the BASELINE workout: 4 × (1 km + 60 s rest) then 50 wall balls, for Run, Ski and Row.

**Each Run, Ski and Row time is the full block total, including the 50 wall balls.**

## How it works
```
Dashboard page (form + leaderboard + chart)
   │ submit
   ▼
Google Form ──(script commits a row)──▶ data/results.csv ──(Action)──▶ GitHub Pages
```
- **One link for everyone**: the GitHub Pages site has the entry form, the leaderboard and the line chart. No accounts needed.
- **Google Form**: works behind the scenes only. The page submits to it and its script commits each result to the repo. It's also a backup entry link.
- **`data/results.csv`**: the data. Every result is a commit, so you get full history. Fix a typo by editing the file on github.com.
- **GitHub Actions + Pages**: `.github/workflows/pages.yml` republishes the site whenever the CSV or site changes (about 1 minute).

Names are matched case-insensitively; the latest entry per person per quarter counts. Times are stored in seconds.

> This repo is **public**, so the dashboard and CSV (names + times) are public too.

## Setup (≈15 min)
**GitHub**
1. Settings → Pages → Source: **GitHub Actions**.
2. Create a fine-grained token: Settings → Developer settings → Fine-grained tokens → *Repository access: only this repo*, *Permissions → Contents: Read and write*. Pick a long expiry and note the date.

**Google Form**
3. Go to script.google.com → New project. Paste `google-form/Code.gs`.
4. Project Settings → Script properties: `GITHUB_TOKEN` = the token, `GITHUB_REPO` = `brodeurbenjamin/baseline`.
5. Select `setup` and click **Run**; approve the permissions. The log prints a `window.BASELINE_CONFIG = {...}` block.
6. Replace the contents of `site/config.js` with that block and commit to `main`. (Lost it? Run `printConfig`.)

Share the site URL (https://baseline.hybridbyben.com). Preview locally by opening `site/index.html` (demo data).

**Token expired?** Submissions from the page still land in the Form's Responses tab; create a new token, update `GITHUB_TOKEN`, and add any missed rows to the CSV.

**Don't edit the Form's questions** (order, type or adding new ones). The page relies on them. To change them, update `setup()`, run it again, and paste the new config.

## Copyright
© 2026 Hybrid_by_Ben. All rights reserved. See [LICENSE](LICENSE). The code is visible, but not licensed for reuse.
