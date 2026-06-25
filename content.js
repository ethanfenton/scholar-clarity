(function () {
  'use strict';
  if (!window.location.href.includes('/citations')) return;

  const profileNameEl = document.getElementById('gsc_prf_in');
  if (!profileNameEl) return;

  const fullName    = profileNameEl.textContent.trim();
  const nameParts   = fullName.split(/\s+/);
  const lastName    = nameParts[nameParts.length - 1].toLowerCase();
  const firstInitial = nameParts[0][0].toLowerCase();

  function nameMatches(candidate) {
    const c = candidate.toLowerCase().trim();
    if (!c.includes(lastName)) return false;
    return (
      c.startsWith(firstInitial) ||
      c.includes(' ' + firstInitial + '.') ||
      c.includes(' ' + firstInitial + ' ')
    );
  }

  // Strip trailing volume/issue: "Cell 155 (7)" → "Cell"
  function normalizeJournal(raw) {
    if (!raw) return '';
    return raw.replace(/\s+\d+(\s*\(\d+\))?$/, '').trim();
  }

  // Normalize to "first-initial last" for co-author grouping
  function coauthorKey(name) {
    const parts = name.trim().replace(/\./g, '').split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const last  = parts[parts.length - 1].toLowerCase();
    const first = parts[0].toLowerCase();
    return parts.length === 1 ? last : first[0] + ' ' + last;
  }

  // ── Row data (cached) ──────────────────────────────────────────────────────
  const rowCache = new WeakMap();

  function parseRow(row) {
    if (rowCache.has(row)) return rowCache.get(row);

    const grayEls     = row.querySelectorAll('.gs_gray');
    const authorText  = grayEls[0] ? grayEls[0].textContent : '';
    const journalText = grayEls[1] ? grayEls[1].textContent : '';

    const isTruncated = authorText.includes('…') || authorText.includes('...');
    const rawAuthors  = authorText.split(',')
      .map(a => a.trim())
      .filter(a => a && a !== '…' && a !== '...');
    const n = rawAuthors.length;

    let posFromFront = -1;
    for (let i = 0; i < rawAuthors.length; i++) {
      if (nameMatches(rawAuthors[i])) { posFromFront = i; break; }
    }
    const posFromBack = (posFromFront >= 0 && !isTruncated) ? (n - 1 - posFromFront) : -1;

    const frontBucket =
      posFromFront < 0   ? 'unknown'  :
      posFromFront === 0 ? '1st'      :
      posFromFront === 1 ? '2nd'      :
      posFromFront <= 4  ? '3rd–5th'  :
      posFromFront <= 9  ? '6th–10th' : '11th+';

    const backBucket =
      posFromBack < 0   ? 'unknown'          :
      posFromBack === 0 ? 'Last'             :
      posFromBack === 1 ? '2nd-to-last'      :
      posFromBack <= 4  ? '3rd–5th-to-last'  :
      posFromBack <= 9  ? '6th–10th-to-last' : '11th+-to-last';

    // Senior (last) beats first when both apply
    const filterBucket =
      posFromFront < 0   ? 'unknown' :
      posFromBack === 0  ? 'last'    :
      posFromFront === 0 ? 'first'   : 'middle';

    const citeEl    = row.querySelector('.gsc_a_c a');
    const citations = citeEl ? (parseInt(citeEl.textContent.replace(/\D/g, '')) || 0) : 0;

    const yearEl = row.querySelector('.gsc_a_y span');
    const year   = yearEl ? (parseInt(yearEl.textContent) || 0) : 0;

    const rawJournal  = journalText.split(',')[0].trim();
    const journalName = normalizeJournal(rawJournal);

    const titleEl = row.querySelector('.gsc_a_at');
    const title   = titleEl ? titleEl.textContent.trim() : '';

    // Type flags — priority: patent > preprint > review > primary
    const isPatent   = /\bpatent\b|google patents/i.test(rawJournal) ||
                       /\bpatent\b/i.test(journalText);
    const isPreprint = !isPatent &&
                       /biorxiv|medrxiv|arxiv|chemrxiv|ssrn|preprint/i.test(rawJournal);
    const isReview   = !isPatent && !isPreprint && (
      /\breview\b|\bmeta.?analy|\bsystematic.+review\b|\boverview\b|\bsurvey of\b/i.test(title) ||
      /\breview[s]?\b|annual review|current opinion|trends in/i.test(journalName)
    );
    // Everything else is "primary"

    // Derived type key (single, exclusive)
    const typeKey = isPatent ? 'patent' : isPreprint ? 'preprint' : isReview ? 'review' : 'primary';

    const coauthors = rawAuthors
      .filter(a => !nameMatches(a))
      .map(a => ({ key: coauthorKey(a), display: a.trim() }))
      .filter(c => c.key);

    const data = {
      posFromFront, posFromBack, n, isTruncated,
      frontBucket, backBucket, filterBucket,
      citations, year, journalName, title,
      isPatent, isPreprint, isReview, typeKey,
      coauthors,
    };
    rowCache.set(row, data);
    return data;
  }

  // ── Filter state — Sets; empty Set = no restriction ────────────────────────
  // Authorship: 'first' | 'last' | 'middle'
  // Types:      'primary' | 'review' | 'preprint' | 'patent'
  const selectedAuthorships = new Set();
  const selectedTypes       = new Set();
  let filtering = false;
  let loading   = false;
  let chartsVisible = true;

  function rowPasses(row) {
    const d = parseRow(row);
    // Authorship OR: if any selected, row must match one
    if (selectedAuthorships.size > 0 && !selectedAuthorships.has(d.filterBucket)) return false;
    // Type OR: if any selected, row must match one
    if (selectedTypes.size > 0 && !selectedTypes.has(d.typeKey)) return false;
    return true;
  }

  function applyAll() {
    filtering = true;
    const visible = [];
    document.querySelectorAll('tr.gsc_a_tr').forEach(row => {
      const passes = rowPasses(row);
      row.style.display = passes ? '' : 'none';
      if (passes) visible.push(row);
    });
    updateStats(visible);
    updateCharts(visible);
    filtering = false;
  }

  // ── Auto-load all papers ───────────────────────────────────────────────────
  let statusEl = null;

  async function loadAllPapers() {
    loading = true;
    statusEl = document.createElement('span');
    statusEl.style.cssText = 'color:#1a73e8;font-size:11px;font-style:italic';
    bar.appendChild(statusEl);

    while (true) {
      const btn = document.getElementById('gsc_bpf_more');
      if (!btn || btn.disabled || btn.offsetParent === null) break;
      const before = document.querySelectorAll('tr.gsc_a_tr').length;
      statusEl.textContent = `Loading… (${before} papers)`;
      btn.click();
      await new Promise(r => setTimeout(r, 800));
      const after = document.querySelectorAll('tr.gsc_a_tr').length;
      if (after === before) break;
    }

    const total = document.querySelectorAll('tr.gsc_a_tr').length;
    statusEl.textContent = `${total} papers loaded`;
    setTimeout(() => { statusEl && statusEl.remove(); statusEl = null; }, 2000);
    loading = false;
    applyAll();
  }

  // ── Stats panel ────────────────────────────────────────────────────────────
  const statsEl = document.createElement('div');
  statsEl.style.cssText = [
    'padding:7px 16px',
    'background:#fff',
    'border-bottom:1px solid #dadce0',
    'font-family:Google Sans,Roboto,sans-serif',
    'font-size:13px',
    'display:flex',
    'gap:20px',
    'align-items:center',
    'flex-wrap:wrap',
  ].join(';');

  function updateStats(rows) {
    const cites = rows.map(r => parseRow(r).citations).sort((a, b) => b - a);
    const total = cites.reduce((s, c) => s + c, 0);
    let h = 0;
    for (let i = 0; i < cites.length; i++) {
      if (cites[i] >= i + 1) h = i + 1; else break;
    }
    const i10 = cites.filter(c => c >= 10).length;
    statsEl.innerHTML =
      `<span style="color:#5f6368;font-weight:600">Filtered stats:</span>` +
      `<span><b>${rows.length}</b>&nbsp;papers</span>` +
      `<span><b>${total.toLocaleString()}</b>&nbsp;citations</span>` +
      `<span>h-index&nbsp;<b>${h}</b></span>` +
      `<span>i10-index&nbsp;<b>${i10}</b></span>`;
  }

  // ── Charts panel ───────────────────────────────────────────────────────────
  const chartsEl = document.createElement('div');
  chartsEl.style.cssText = [
    'padding:12px 16px',
    'background:#fafafa',
    'border-bottom:1px solid #dadce0',
    'display:grid',
    'grid-template-columns:repeat(auto-fill,minmax(210px,1fr))',
    'gap:16px',
    'font-family:Google Sans,Roboto,sans-serif',
    'font-size:12px',
  ].join(';');

  function barChart(title, data, color, opts = {}) {
    const barH  = opts.compact ? 10 : 14;
    const barMb = opts.compact ? 2  : 3;
    const max   = Math.max(1, ...data.map(d => d.v));

    const wrap = document.createElement('div');
    wrap.style.cssText = 'min-width:0';

    const hd = document.createElement('div');
    hd.textContent = title;
    hd.style.cssText = 'font-weight:600;color:#3c4043;margin-bottom:6px;font-size:12px';
    wrap.appendChild(hd);

    const visible = data.filter(d => opts.showZero ? true : d.v > 0);
    if (visible.length === 0) {
      const e = document.createElement('div');
      e.textContent = 'No data';
      e.style.color = '#9aa0a6';
      wrap.appendChild(e);
      return wrap;
    }

    data.forEach(({ k, v }) => {
      if (!opts.showZero && v === 0) return;
      const pct = (v / max * 100).toFixed(1);
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:5px;margin-bottom:${barMb}px`;
      row.innerHTML =
        `<span title="${k}" style="width:88px;min-width:88px;text-align:right;color:#5f6368;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k}</span>` +
        `<div style="flex:1;background:#e8eaed;border-radius:2px;height:${barH}px;position:relative;min-width:50px">` +
          `<div style="width:${pct}%;background:${color};height:100%;border-radius:2px;transition:width 0.2s"></div>` +
          `<span style="position:absolute;right:3px;top:0;line-height:${barH}px;font-size:10px;color:#3c4043">${v}</span>` +
        `</div>`;
      wrap.appendChild(row);
    });
    return wrap;
  }

  function updateCharts(rows) {
    chartsEl.innerHTML = '';

    const frontKeys = ['1st','2nd','3rd–5th','6th–10th','11th+'];
    const backKeys  = ['Last','2nd-to-last','3rd–5th-to-last','6th–10th-to-last','11th+-to-last'];
    const fc = Object.fromEntries(frontKeys.map(k => [k, 0]));
    const bc = Object.fromEntries(backKeys.map(k => [k, 0]));
    const jc             = {};
    const yearPapers     = {};
    const yearCites      = {};
    const coauthorCounts = {};
    const coauthorBest   = {};

    rows.forEach(row => {
      const d = parseRow(row);
      if (d.frontBucket in fc) fc[d.frontBucket]++;
      if (d.backBucket  in bc) bc[d.backBucket]++;
      if (d.journalName) jc[d.journalName] = (jc[d.journalName] || 0) + 1;
      if (d.year > 0) {
        yearPapers[d.year] = (yearPapers[d.year] || 0) + 1;
        yearCites[d.year]  = (yearCites[d.year]  || 0) + d.citations;
      }
      d.coauthors.forEach(({ key, display }) => {
        coauthorCounts[key] = (coauthorCounts[key] || 0) + 1;
        if (!coauthorBest[key] || display.length > coauthorBest[key].length) {
          coauthorBest[key] = display;
        }
      });
    });

    chartsEl.appendChild(barChart('Position from front', frontKeys.map(k => ({ k, v: fc[k] })), '#1a73e8'));
    chartsEl.appendChild(barChart('Position from back',  backKeys.map(k => ({ k, v: bc[k] })), '#34a853'));

    const topJournals = Object.entries(jc).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => ({ k, v }));
    chartsEl.appendChild(barChart('Top journals / venues', topJournals, '#ea4335'));

    const years = Object.keys(yearPapers).map(Number).sort((a, b) => a - b);
    chartsEl.appendChild(barChart(
      'Papers per year',
      years.map(y => ({ k: String(y), v: yearPapers[y] })),
      '#fbbc04',
      { compact: true },
    ));
    chartsEl.appendChild(barChart(
      'Citations by pub. year',
      years.map(y => ({ k: String(y), v: yearCites[y] || 0 })),
      '#9c27b0',
      { compact: true, showZero: true },
    ));

    const topCoauthors = Object.entries(coauthorCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 20)
      .map(([key, v]) => ({ k: coauthorBest[key] || key, v }));
    chartsEl.appendChild(barChart('Frequent co-authors', topCoauthors, '#00897b'));
  }

  // ── Chip component — toggles membership in a Set ───────────────────────────
  function makeChip(text, set, key) {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = [
      'padding:3px 11px',
      'border:1px solid #dadce0',
      'border-radius:16px',
      'background:#fff',
      'color:#3c4043',
      'cursor:pointer',
      'font-size:12px',
      'transition:background 0.1s,color 0.1s,border-color 0.1s',
    ].join(';');

    function refresh() {
      const on = set.has(key);
      b.style.background  = on ? '#1a73e8' : '#fff';
      b.style.color       = on ? '#fff'    : '#3c4043';
      b.style.borderColor = on ? '#1a73e8' : '#dadce0';
    }

    b.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      if (set.has(key)) set.delete(key); else set.add(key);
      refresh();
      applyAll();
    });

    refresh();
    return b;
  }

  // ── Filter bar ─────────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.style.cssText = [
    'padding:7px 16px',
    'background:#f1f3f4',
    'border-bottom:1px solid #dadce0',
    'display:flex',
    'align-items:center',
    'gap:8px',
    'flex-wrap:wrap',
    'font-family:Google Sans,Roboto,sans-serif',
    'font-size:13px',
    'position:sticky',
    'top:0',
    'z-index:200',
  ].join(';');

  function label(text) {
    const s = document.createElement('span');
    s.textContent = text;
    s.style.cssText = 'color:#5f6368;white-space:nowrap';
    return s;
  }

  function sep() {
    const s = document.createElement('span');
    s.textContent = '|';
    s.style.cssText = 'color:#dadce0;padding:0 2px';
    return s;
  }

  // Authorship chips (multi-select; empty = all)
  bar.appendChild(label('Authorship:'));
  bar.appendChild(makeChip('1st Author',   selectedAuthorships, 'first'));
  bar.appendChild(makeChip('Senior / Last', selectedAuthorships, 'last'));
  bar.appendChild(makeChip('Middle',        selectedAuthorships, 'middle'));

  bar.appendChild(sep());

  // Type chips (multi-select; empty = all)
  bar.appendChild(label('Type:'));
  bar.appendChild(makeChip('Primary',  selectedTypes, 'primary'));
  bar.appendChild(makeChip('Review',   selectedTypes, 'review'));
  bar.appendChild(makeChip('Preprint', selectedTypes, 'preprint'));
  bar.appendChild(makeChip('Patent',   selectedTypes, 'patent'));

  bar.appendChild(sep());

  // Toggle charts visibility
  const toggleBtn = makeChip('Hide charts', new Set(), '__never__');
  // Override the chip behaviour — it's a simple toggle, not a Set member
  toggleBtn.addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    chartsVisible = !chartsVisible;
    chartsEl.style.display = chartsVisible ? 'grid' : 'none';
    toggleBtn.textContent = chartsVisible ? 'Hide charts' : 'Show charts';
  }, true); // capture phase so our listener fires before the chip's own listener
  bar.appendChild(toggleBtn);

  // ── Mount ──────────────────────────────────────────────────────────────────
  const tableBody   = document.getElementById('gsc_a_b');
  const tableAnchor = tableBody
    ? (tableBody.closest('table') || tableBody.parentNode)
    : null;

  if (tableAnchor && tableAnchor.parentNode) {
    const p = tableAnchor.parentNode;
    p.insertBefore(chartsEl, tableAnchor);
    p.insertBefore(statsEl,  chartsEl);
    p.insertBefore(bar,      statsEl);
  } else {
    document.body.prepend(chartsEl);
    document.body.prepend(statsEl);
    document.body.prepend(bar);
  }

  if (tableBody) {
    new MutationObserver(() => {
      if (!filtering && !loading) applyAll();
    }).observe(tableBody, { childList: true, subtree: true });
  }

  loadAllPapers();
})();
