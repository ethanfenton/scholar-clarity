# Scholar Author Filter

A Chrome extension that supercharges Google Scholar author profile pages with authorship filters, live stats, and publication analytics.

## Features

- **Authorship filters** — filter papers by 1st author, senior/last author, or middle author (multi-select)
- **Type filters** — filter by Primary article, Review, Preprint, or Patent (multi-select)
- **Auto-loads all papers** — clicks "Show more" automatically so stats cover the full publication list
- **Live filtered stats** — recalculates total citations, h-index, and i10-index for whatever is visible
- **Six analytics charts:**
  - Authorship position from front (1st, 2nd, 3rd–5th, …)
  - Authorship position from back (Last/Senior, 2nd-to-last, …)
  - Top journals / venues
  - Papers per year
  - Citations by publication year
  - Frequent co-authors

All filters combine: e.g. "Senior/Last + Primary only" works together and updates every chart.

## Install (Chrome / Edge)

1. [Download the ZIP](../../archive/refs/heads/main.zip) and unzip it  
   — or clone: `git clone https://github.com/YOUR_USERNAME/scholar-author-filter.git`
2. Open **chrome://extensions** in Chrome (or **edge://extensions** in Edge)
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** and select the unzipped folder
5. Navigate to any Google Scholar author profile page — the filter bar appears automatically

## Usage

Go to a Google Scholar author profile (`scholar.google.com/citations?user=...`).

- Click any chip to activate it (blue = active). Click again to deactivate.
- **Authorship** chips are OR-combined: selecting `1st Author` + `Senior / Last` shows papers in either role.
- **Type** chips are OR-combined: selecting `Primary` + `Review` shows everything except preprints and patents.
- The two groups combine as AND: e.g. `Senior / Last` + `Primary` = senior-authored primary articles only.
- Click **Hide charts** to collapse the analytics panel.

## Notes

- **Review detection is a heuristic** — it checks title keywords ("review", "meta-analysis", "systematic review") and journal names ("Annual Review of…", "Current Opinion in…"). It won't catch everything.
- **Preprint detection** looks for bioRxiv, medRxiv, arXiv, chemRxiv, SSRN in the venue field.
- **Co-author grouping** normalizes names to first-initial + last-name, so "J. Smith" and "John Smith" are counted together (may occasionally over-merge common names).
- **Truncated author lists** — Scholar sometimes shows "…" for very long author lists. Papers where the author's position can't be determined appear in "All" but not in specific authorship filters.
