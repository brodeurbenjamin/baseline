# BASELINE tracker

Quarterly tracker for the BASELINE workout: 4 × (1 km + 60 s rest) then 50 wall balls, for Run, Ski and Row.

**Each Run, Ski and Row time is the full block total, including the 50 wall balls.**

## How it works
```
Google Form ──(script commits a row)──▶ data/results.csv ──(Action)──▶ GitHub Pages dashboard
```
- **Google Form** – the only Google piece. Members log results with the Google account they already have.
- **`data/results.csv`** – the data, in this repo. Every result is a commit, so you get full history. Fix a typo by editing the file on github.com.
- **GitHub Actions + Pages** – `.github/workflows/pages.yml` republishes the dashboard whenever the CSV or site changes.
- **Dashboard** (`site/`) – leaderboard per quarter with change vs. previous quarter, and a line chart (Total / Run / Ski / Row).

Names are matched case-insensitively; the latest entry per person per quarter counts. Times are stored in seconds.

> This repo is **public**, so the dashboard and CSV (names + times) are public too.

## Setup (≈15 min)
**GitHub**
1. Settings → Pages → Source: **GitHub Actions**.
2. Create a fine-grained token: Settings → Developer settings → Fine-grained tokens → *Repository access: only this repo*, *Permissions → Contents: Read and write*. Pick a long expiry and note the date.

**Google Form**
3. Go to script.google.com → New project. Paste `google-form/Code.gs`.
4. Project Settings → Script properties: `GITHUB_TOKEN` = the token, `GITHUB_REPO` = `brodeurbenjamin/baseline`.
5. Select `setup` and click **Run**; approve the permissions. The log prints the form link.
6. Paste the form link into `site/config.js` (`FORM_URL`) and commit to `main`.

Share the GitHub Pages URL (shown in Settings → Pages). Preview locally by opening `site/index.html` (demo data).

**Token expired?** Submissions still land in the Form's Responses tab; create a new token, update `GITHUB_TOKEN`, and add any missed rows to the CSV.
