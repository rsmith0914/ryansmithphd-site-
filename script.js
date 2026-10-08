// ---------- footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- mobile nav ----------
const toggle = document.querySelector('.nav__toggle');
const links  = document.getElementById('nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    links.classList.toggle('is-open', !open);
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
    });
  });
}

// ---------- generic reveal-on-scroll ----------
const revealTargets = document.querySelectorAll(
  '.section, .project, .hero__photo, .about__photo, .awards__photo'
);
revealTargets.forEach(el => el.classList.add('reveal'));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  revealTargets.forEach(el => io.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('is-visible'));
}

// (handwritten aside animation removed — captions render statically)

// Publication-type badge labels (data-pubtype on <li> in #timeline-data)
const pubtypeLabels = {
  full:     'Full Paper',
  short:    'Short Paper',
  workshop: 'Workshop Paper',
  poster:   'Poster',
};

// Bump whenever any poster PNG changes — busts browser/CDN cache
const POSTER_ASSET_VERSION = '2026-05-13b';

// Parse one #timeline-data <li>. The hidden .pub__abstract is pulled out so it
// never leaks into the citation or the raw detail-panel HTML.
function parseDataItem(li) {
  const clone = li.cloneNode(true);
  const absEl = clone.querySelector('.pub__abstract');
  const abstract = absEl ? absEl.innerHTML.trim() : '';
  if (absEl) absEl.remove();
  return {
    year:    parseFloat(li.dataset.year),
    yearEnd: li.dataset.yearEnd ? parseFloat(li.dataset.yearEnd) : null,
    kind:    li.dataset.kind,
    role:    li.dataset.role || null,
    pubtype: li.dataset.pubtype || null,
    teaser:  li.dataset.teaser || null,
    short:   li.dataset.short || null,
    title:   li.dataset.title,
    abstract,
    html:    clone.innerHTML.trim(),
  };
}

const escAttr = (s) => (s || '').replace(/"/g, '&quot;');

// Preview for a publication: teaser figure, or poster PNG (same stem as the
// poster PDF, in images/), followed by the abstract. `cls` picks the
// publist-card or timeline-detail styling.
function pubPreviewHTML(p, cls) {
  const parts = [];
  if (p.teaser) {
    parts.push(`<figure class="${cls}__teaser"><img src="${p.teaser}" alt="${escAttr(p.title)} — figure" loading="lazy"/></figure>`);
  } else if (p.pubtype === 'poster') {
    const tmp = document.createElement('div');
    tmp.innerHTML = p.html;
    const a = Array.from(tmp.querySelectorAll('a')).find(el => /\.pdf$/i.test(el.getAttribute('href') || ''));
    if (a) {
      const pdfHref = a.getAttribute('href');
      const pngHref = `images/${pdfHref.replace(/\.pdf$/i, '')}.png?v=${POSTER_ASSET_VERSION}`;
      parts.push(`<figure class="${cls}__poster"><a href="${pdfHref}" target="_blank" rel="noopener"><img src="${pngHref}" alt="${escAttr(p.title)} — poster preview" loading="lazy"/></a></figure>`);
    }
  }
  if (p.abstract) parts.push(`<p class="${cls}__abstract"><strong>Abstract.</strong> ${p.abstract}</p>`);
  return parts.join('');
}

// ---------- PUBLICATIONS LIST ----------
(function buildPubList() {
  const dataEl   = document.getElementById('timeline-data');
  const subs     = document.querySelectorAll('.publist__sub[data-pubgroup]');
  if (!dataEl || !subs.length) return;

  const papers = Array.from(dataEl.querySelectorAll('li[data-kind="paper"], li[data-kind="talk"][data-role]'))
    .map(parseDataItem)
    .sort((a, b) => b.year - a.year);


  // Split each pub's html into citation + links (links go in the card body)
  function splitCitation(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const linksEl = tmp.querySelector('.detail__links, .pub__links');
    let linksHTML = '';
    if (linksEl) {
      linksEl.classList.add('publist__links');
      linksEl.classList.remove('detail__links', 'pub__links');
      linksHTML = linksEl.outerHTML;
      linksEl.remove();
    }
    return { citationHTML: tmp.innerHTML.trim(), linksHTML };
  }

  function buildBody(p, linksHTML) {
    return pubPreviewHTML(p, 'pub-card') + (linksHTML || '');
  }

  function render(list, items) {
    if (!items.length) return;
    list.innerHTML = '';
    items.forEach(p => {
      const { citationHTML, linksHTML } = splitCitation(p.html);
      const badge = p.pubtype
        ? `<span class="pub-badge pub-badge--${p.pubtype}">${pubtypeLabels[p.pubtype]}</span>`
        : '';
      const li = document.createElement('li');
      li.className = 'pub-card';
      li.innerHTML = `
        <button type="button" class="pub-card__head" aria-expanded="false">
          <span class="pub-card__meta">
            <span class="publist__year">${Math.floor(p.year)}</span>
            ${badge}
          </span>
          <span class="pub-card__citation">${citationHTML}</span>
          <span class="pub-card__chevron" aria-hidden="true">›</span>
        </button>
        <div class="pub-card__body" hidden></div>
      `;
      const body = li.querySelector('.pub-card__body');
      // Stash for lazy build on first open
      body.dataset.deferred = '1';
      body._buildArgs = { p, linksHTML };
      list.appendChild(li);
    });
  }

  // All publications split into full papers / workshop papers / posters;
  // bolded "R. Smith" in each citation shows authorship
  const pubGroupOf = (p) => p.pubtype === 'full' ? 'full'
    : (p.pubtype === 'workshop' || p.pubtype === 'short') ? 'workshop'
    : 'poster';
  subs.forEach(sub => {
    const items = papers.filter(p => pubGroupOf(p) === sub.dataset.pubgroup);
    if (items.length) render(sub.querySelector('.publist__list'), items);
    else sub.hidden = true;
  });

  // Single-open accordion across the entire publication list
  const cards = document.querySelectorAll('.pub-card');
  const heads = document.querySelectorAll('.pub-card__head');
  heads.forEach(head => {
    head.addEventListener('click', () => {
      const card = head.parentElement;
      const body = card.querySelector('.pub-card__body');
      const isOpen = head.getAttribute('aria-expanded') === 'true';
      // Close all
      cards.forEach(c => {
        const h = c.querySelector('.pub-card__head');
        const b = c.querySelector('.pub-card__body');
        if (h && b) {
          h.setAttribute('aria-expanded', 'false');
          b.hidden = true;
        }
      });
      if (!isOpen) {
        // Lazy-build body content on first open
        if (body.dataset.deferred === '1') {
          body.innerHTML = buildBody(body._buildArgs.p, body._buildArgs.linksHTML);
          body.dataset.deferred = '0';
        }
        head.setAttribute('aria-expanded', 'true');
        body.hidden = false;
      }
    });
  });
})();

// ---------- TIMELINE ----------
(function buildTimeline() {
  const dataEl = document.getElementById('timeline-data');
  const host   = document.getElementById('timeline');
  const detail = document.getElementById('timeline-detail');
  if (!dataEl || !host || !detail) return;

  // kind → visual group
  const kindToGroup = {
    paper: 'publication', talk: 'publication',
    grant: 'funding',     award: 'award',
    education: 'education',
    service:   'service',
    teaching:  'teaching',
    research:  'other',
    rejection: 'rejection',
  };

  // Parse all items
  const allItems = Array.from(dataEl.querySelectorAll(':scope > li')).map((li, i) => {
    const it = parseDataItem(li);
    return { ...it, id: `tl-${i}`, group: kindToGroup[it.kind] || it.kind };
  }).sort((a, b) => a.year - b.year || (a.yearEnd || a.year) - (b.yearEnd || b.year));

  if (!allItems.length) return;

  // Split: items before 2019 go in the "previously" panel; 2019+ on the main axis
  const AXIS_START = 2019;
  const prevItems = allItems.filter(it => (it.yearEnd || it.year) <= AXIS_START && it.year < AXIS_START);
  const items     = allItems.filter(it => it.year >= AXIS_START || (it.yearEnd && it.yearEnd > AXIS_START));

  // Fixed axis range 2019–2027; power-of-1.7 easing compresses the sparse early years
  const minYear = AXIS_START;
  const maxYear = 2027;
  const yearPct = (y) => {
    const clamped = Math.max(minYear, Math.min(maxYear, y));
    return Math.pow((clamped - minYear) / (maxYear - minYear), 1.7);
  };
  // Plot insets come from CSS (--tl-l holds the row-label column on desktop)
  const xPos = (y) => `calc(var(--tl-l) + (100% - var(--tl-l) - var(--tl-r)) * ${yearPct(y).toFixed(5)})`;
  const xLen = (s, e) => `calc((100% - var(--tl-l) - var(--tl-r)) * ${(yearPct(e) - yearPct(s)).toFixed(5)})`;

  // Cutoff between solid "already happened" and dashed "planned/upcoming"
  const today = new Date();
  const NOW = today.getFullYear() + today.getMonth() / 12;
  const isMobile = window.matchMedia('(max-width: 720px)').matches;

  // ── Previously panel ─────────────────────────────────────────────────
  if (prevItems.length) {
    const panel = document.createElement('div');
    panel.className = 'tl-previously';
    panel.innerHTML = `<span class="tl-prev__label">previously</span>`;
    prevItems.forEach(it => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tl-prev__entry';
      btn.dataset.id = it.id;
      const endLabel = it.yearEnd ? `${it.year}–${it.yearEnd}` : `${it.year}`;
      btn.innerHTML = `<strong>${it.title}</strong><span>${endLabel}</span>`;
      btn.addEventListener('click', () => selectItem(it.id));
      panel.appendChild(btn);
    });
    host.appendChild(panel);
  }

  // ── Swimlanes: one labeled row per category ─────────────────────────
  const ROWS = [
    { label: 'publications',    groups: ['publication', 'rejection'], spans: false },
    { label: 'grants & awards', groups: ['funding', 'award'],         spans: false },
    { label: 'service',         groups: ['service'],                  spans: true  },
    { label: 'teaching',        groups: ['teaching'],                 spans: true  },
    { label: 'research',        groups: ['other'],                    spans: true  },
  ];
  // Vertical rhythm (rem)
  const ANNOT_H   = 1.75;  // band for "started / ending my PhD"
  const LABEL_H   = 1.15;  // one line of full-paper labels
  const ROW_GAP   = 1.1;   // between rows (mobile row labels sit here)
  const ROW_PAD   = 0.3;
  const LANE      = 0.55;  // span lane step
  const STACK     = 1.05;  // same-date marks stack step
  const YEAR_H    = 1.6;

  const fullPapers = items.filter(it => it.group === 'publication' && it.pubtype === 'full');
  const labelLines = isMobile ? 0 : Math.min(fullPapers.length, 3);

  const axis = document.createElement('div');
  axis.className = 'tl-axis';

  const add = (cls, style, html = '') => {
    const el = document.createElement('div');
    el.className = cls;
    for (const [k, v] of Object.entries(style)) {
      if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
    }
    el.innerHTML = html;
    axis.appendChild(el);
    return el;
  };

  function makeMark(it, topRem) {
    const btn = document.createElement('button');
    btn.type = 'button';
    let cls = `tl-dot tl-dot--${it.group}`;
    if (it.group === 'publication') {
      if (it.pubtype === 'full') cls += ' tl-dot--full';
      if (it.role && it.role !== 'primary') cls += ' tl-dot--coauthor';
    }
    btn.className = cls;
    btn.style.left = xPos(it.year);
    btn.style.top  = `${topRem.toFixed(3)}rem`;
    btn.setAttribute('aria-label', `${it.kind}, ${it.year}: ${it.title}`);
    btn.dataset.id = it.id;
    btn.innerHTML = `<span class="tl-dot__tooltip">${it.title}</span>`;
    btn.addEventListener('click', () => selectItem(it.id));
    axis.appendChild(btn);
    return btn;
  }

  function makeSpan(it, startY, endY, centerRem, isFuture, withTooltip) {
    const bar = document.createElement('button');
    bar.type = 'button';
    bar.className = `tl-span tl-span--${it.group}${isFuture ? ' tl-span--future' : ''}`;
    bar.style.left  = xPos(startY);
    bar.style.width = xLen(startY, endY);
    bar.style.top   = `${centerRem.toFixed(3)}rem`;
    bar.setAttribute('aria-label', `${it.kind}, ${it.year}–${it.yearEnd}: ${it.title}`);
    bar.dataset.id = it.id;
    bar.innerHTML = withTooltip ? `<span class="tl-dot__tooltip">${it.title}</span>` : '';
    bar.addEventListener('click', () => selectItem(it.id));
    axis.appendChild(bar);
  }

  let y = ANNOT_H + labelLines * LABEL_H;
  const plotTop = ANNOT_H - 0.2;
  const paperMarks = [];   // [item, button, centerRem] for full-paper labels

  ROWS.forEach((row, ri) => {
    const rowItems = items.filter(it => row.groups.includes(it.group));
    const rowTop = y + (ri === 0 ? 0.2 : ROW_GAP);
    let height;

    if (row.spans) {
      // Greedy lane packing within the row
      const lanes = [];
      const laneOf = new Map();
      rowItems.filter(it => it.yearEnd).sort((a, b) => a.year - b.year).forEach(it => {
        let i = lanes.findIndex(l => !l.some(b => b.s < it.yearEnd && it.year < b.e));
        if (i === -1) { lanes.push([]); i = lanes.length - 1; }
        lanes[i].push({ s: it.year, e: it.yearEnd });
        laneOf.set(it.id, i);
      });
      rowItems.filter(it => it.yearEnd).forEach(it => {
        const cy = rowTop + ROW_PAD + (laneOf.get(it.id) + 0.5) * LANE;
        if (it.yearEnd <= NOW)   makeSpan(it, it.year, it.yearEnd, cy, false, true);
        else if (it.year >= NOW) makeSpan(it, it.year, it.yearEnd, cy, true, true);
        else { makeSpan(it, it.year, NOW, cy, false, true); makeSpan(it, NOW, it.yearEnd, cy, true, false); }
      });
      height = 2 * ROW_PAD + Math.max(lanes.length, 1) * LANE;
    } else {
      // Point marks; same-date marks stack downward (full papers first)
      const rank = (it) => it.group === 'publication' ? (it.pubtype === 'full' ? 0 : 1) : 2;
      const byDate = {};
      rowItems.forEach(it => (byDate[it.year.toFixed(2)] = byDate[it.year.toFixed(2)] || []).push(it));
      let maxStack = 1;
      Object.values(byDate).forEach(list => {
        list.sort((a, b) => rank(a) - rank(b));
        maxStack = Math.max(maxStack, list.length);
        list.forEach((it, k) => {
          const cy = rowTop + ROW_PAD + (k + 0.5) * STACK;
          const btn = makeMark(it, cy);
          if (it.group === 'publication' && it.pubtype === 'full') paperMarks.push([it, btn, cy]);
        });
      });
      height = 2 * ROW_PAD + maxStack * STACK;
    }

    // Row label + faint separator
    const mid = rowTop + height / 2;
    add('tl-rowlabel', { '--row-top': `${rowTop}rem`, '--row-mid': `${mid}rem` }, row.label);
    if (ri > 0) add('tl-rowline', { top: `${(rowTop - ROW_GAP / 2).toFixed(3)}rem` });
    y = rowTop + height;
  });

  const plotBottom = y + 0.35;

  // Year gridlines, ticks and labels; baseline
  for (let yr = minYear + 1; yr <= maxYear; yr++) {
    add('tl-grid', { left: xPos(yr), top: `${plotTop}rem`, height: `${plotBottom - plotTop}rem` });
    add(`tl-year${(yr - minYear) % 2 === 0 ? ' tl-year--minor' : ''}`,
        { left: xPos(yr), top: `${plotBottom + 0.3}rem` }, yr);
  }
  add('tl-axis__line', { top: `${plotBottom}rem` });

  // PhD start / end: dashed rule through every row, handwritten label on top
  const annot = (yr, text, side) => {
    add(`tl-annot tl-annot--${side}`, { left: xPos(yr), top: `${plotTop - 1.45}rem`, height: `${plotBottom - plotTop + 1.45}rem` },
        `<span class="tl-annot__text">${text}</span>`);
  };
  annot(2022.67, 'started my PhD', 'left');
  annot(2027, 'ending my PhD (hopefully)', 'right');

  axis.style.height = `${plotBottom + YEAR_H}rem`;
  host.appendChild(axis);

  // Full-paper labels above the papers row, leader line down to the mark.
  // Placed after layout so overlapping labels can drop to the next line.
  if (labelLines) {
    const placed = [];
    paperMarks.sort((a, b) => b[0].year - a[0].year).forEach(([it, btn, cy]) => {
      const short = it.short || it.title.split(':')[0];
      const lab = add('tl-plabel', { left: xPos(it.year) }, short);
      const lr = lab.getBoundingClientRect();
      let line = 0;
      while (line < labelLines - 1 && placed.some(p => p.line === line && p.l < lr.right + 8 && lr.left < p.r + 8)) line++;
      placed.push({ line, l: lr.left, r: lr.right });
      const labTop = ANNOT_H + line * LABEL_H;
      lab.style.top = `${labTop}rem`;
      add('tl-leader', { left: xPos(it.year), top: `${labTop + 0.95}rem`, height: `${Math.max(cy - labTop - 0.95 - 0.4, 0.2)}rem` });
    });
  }

  // Tooltip edge-detection: pin tooltips near the ends of the axis
  requestAnimationFrame(() => {
    const axisRect = axis.getBoundingClientRect();
    axis.querySelectorAll('.tl-dot').forEach(dot => {
      const r = dot.getBoundingClientRect();
      if (r.left - axisRect.left < 120)  dot.classList.add('tl-dot--tip-left');
      if (axisRect.right - r.right < 120) dot.classList.add('tl-dot--tip-right');
    });
  });

  // ── Detail panel ──────────────────────────────────────────────────────
  setEmpty();

  function setEmpty() {
    detail.classList.add('timeline__detail--empty');
    detail.innerHTML = `<span>Pick a dot or bar to see details →</span>`;
  }

  const kindLabels = {
    paper: 'Paper', talk: 'Talk',
    grant: 'Grant', award: 'Award',
    education: 'Education', service: 'Service',
    research: 'Research', teaching: 'Teaching',
    rejection: 'Not accepted',
  };

  function selectItem(id) {
    const it = allItems.find(x => x.id === id);
    if (!it) return;

    // Highlight in main + vertical axis (both use .tl-dot / .tl-span)
    host.querySelectorAll('.tl-dot, .tl-span').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });
    // Highlight in previously panel
    host.querySelectorAll('.tl-prev__entry').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });

    detail.classList.remove('timeline__detail--empty');
    // Encode "yyyy.mm/12" → "Mon YYYY"; integer years → "YYYY".
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    function fmtDate(y) {
      if (y == null) return '';
      const yr = Math.floor(y);
      const frac = y - yr;
      if (frac < 0.001) return String(yr);
      const m = Math.round(frac * 12);          // 0–11
      return `${MONTH_NAMES[Math.min(11, Math.max(0, m))]} ${yr}`;
    }
    function fmtRange(start, end) {
      if (end == null || end === start) return fmtDate(start);
      const sy = Math.floor(start), ey = Math.floor(end);
      const sFrac = start - sy, eFrac = end - ey;
      // Same year, both have months → "Sep – Dec 2023"
      if (sy === ey && sFrac >= 0.001 && eFrac >= 0.001) {
        const sm = Math.round(sFrac * 12), em = Math.round(eFrac * 12);
        return `${MONTH_NAMES[sm]} – ${MONTH_NAMES[em]} ${sy}`;
      }
      return `${fmtDate(start)} – ${fmtDate(end)}`;
    }
    const yearStr = fmtRange(it.year, it.yearEnd);

    const badgeMod   = it.pubtype || it.kind;
    const badgeLabel = (it.pubtype && pubtypeLabels[it.pubtype]) || kindLabels[it.kind] || it.kind;
    const roleLabel  = it.group === 'publication' && it.role
      ? `<span class="detail__role">${it.role === 'primary' ? 'first author' : 'co-author'}</span>`
      : '';

    detail.innerHTML = `
      <span class="detail__kind detail__kind--${badgeMod}">${badgeLabel}</span>${roleLabel}
      <span class="detail__year">${yearStr}</span>
      <div class="detail__body">${it.html}${pubPreviewHTML(it, 'detail')}</div>`;

    detail.querySelectorAll('.pub__links, .detail__links').forEach(el => {
      el.classList.add('detail__links');
    });
  }

  // ── Keyboard navigation ───────────────────────────────────────────────
  host.addEventListener('keydown', (e) => {
    const active = host.querySelector('.tl-dot.is-active, .tl-span.is-active');
    if (!active) return;
    const all = Array.from(host.querySelectorAll('.tl-dot, .tl-span'));
    const idx = all.indexOf(active);
    if (e.key === 'ArrowRight' && idx < all.length - 1) {
      e.preventDefault();
      all[idx + 1].focus();
      selectItem(all[idx + 1].dataset.id);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      all[idx - 1].focus();
      selectItem(all[idx - 1].dataset.id);
    }
  });
})();

