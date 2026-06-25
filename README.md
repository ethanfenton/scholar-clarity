# Scholar Clarity

A Chrome extension that adds authorship filters, live publication stats, and analytics charts to Google Scholar author profile pages — so you can instantly see a researcher's output as first author, senior author, or any role you care about.

---

## Features

| | |
|---|---|
| **Authorship filters** | Filter by 1st Author, Senior/Last, or Middle (multi-select, OR logic) |
| **Type filters** | Filter by Primary article, Review, Preprint, or Patent (multi-select, OR logic) |
| **Auto-loads all papers** | Automatically clicks "Show more" until the full publication list is visible |
| **Live filtered stats** | Total citations, h-index, and i10-index recalculated for the visible set |
| **6 analytics charts** | Position from front · Position from back · Top journals · Papers per year · Citations by pub. year · Frequent co-authors |

Filters combine across dimensions: e.g. **Senior/Last + Primary** shows only senior-authored primary research articles, with all charts and stats updating instantly.

---

## Install

> No account or sign-in needed. Works in Chrome and any Chromium-based browser (Edge, Brave, Arc).

1. **[Download the ZIP](https://github.com/ethanfenton/scholar-clarity/archive/refs/heads/main.zip)** and unzip it
2. Open **`chrome://extensions`** in your browser
3. Enable **Developer mode** (toggle, top-right corner)
4. Click **Load unpacked** and select the unzipped `scholar-clarity-main` folder
5. Navigate to any Google Scholar author profile — the filter bar appears automatically

> **Tip:** The extension only activates on `scholar.google.com/citations*` pages (author profiles). It does not run anywhere else.

---

## Usage

Go to a Google Scholar author profile, e.g. `https://scholar.google.com/citations?user=...`

The extension adds three panels above the publication list:

### Filter bar
Click any chip to activate it (blue = active, click again to deactivate):

- **Authorship:** `1st Author` · `Senior / Last` · `Middle`
- **Type:** `Primary` · `Review` · `Preprint` · `Patent`

Within each group, multiple selections are OR'd. Across groups, they are AND'd.

### Stats bar
Shows paper count, total citations, h-index, and i10-index computed only from the currently visible (filtered) papers.

### Charts
Six bar charts update live with the active filters:
- **Position from front** — how often this author appears as 1st, 2nd, 3rd–5th, etc.
- **Position from back** — how often they appear as last (senior), 2nd-to-last, etc.
- **Top journals / venues** — most frequent publication venues
- **Papers per year** — publication volume over time
- **Citations by publication year** — which cohort of papers drives the most citations
- **Frequent co-authors** — top collaborators by paper count

Click **Hide charts** to collapse the panel.

---

## Notes

- **Review detection is a heuristic** — checks title keywords (*review*, *meta-analysis*, *systematic review*, *overview*) and journal names (*Annual Review of…*, *Current Opinion in…*, *Trends in…*). Won't catch everything.
- **Preprint detection** looks for bioRxiv, medRxiv, arXiv, chemRxiv, SSRN in the venue field.
- **Patent detection** looks for "patent" or "Google Patents" in the venue field.
- **Co-author grouping** normalizes to first-initial + last-name, so "J. Smith" and "John Smith" are counted together. May occasionally merge distinct people with similar names.
- **Truncated author lists** — Scholar sometimes shows "…" for very long author lists. These papers appear under **All** but their authorship position can't be determined, so they're excluded from specific authorship filters.

---

## Contributing

Pull requests welcome. The entire extension is a single content script (`content.js`) with no build step or dependencies.

```
scholar-clarity/
├── manifest.json   # Chrome extension manifest (MV3)
├── content.js      # All logic — parsing, filtering, stats, charts
├── icon16.png
├── icon48.png
└── icon128.png
```
