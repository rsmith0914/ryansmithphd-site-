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
  '.section, .project, .hero__photo, .about__photo, .research__photo, .awards__photo'
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

// ---------- PUBLICATIONS LIST ----------
(function buildPubList() {
  const dataEl   = document.getElementById('timeline-data');
  const listPri  = document.getElementById('publist-primary');
  const listSec  = document.getElementById('publist-secondary');
  if (!dataEl || !listPri || !listSec) return;

  const papers = Array.from(dataEl.querySelectorAll('li[data-kind="paper"], li[data-kind="talk"][data-role]'))
    .map(li => ({
      year:  parseInt(li.dataset.year, 10),
      role:  li.dataset.role || 'primary',
      title: li.dataset.title,
      html:  li.innerHTML,
    }))
    .sort((a, b) => b.year - a.year);

  const primary   = papers.filter(p => p.role === 'primary');
  const secondary = papers.filter(p => p.role !== 'primary');

  function render(list, items) {
    if (!items.length) return;
    list.innerHTML = '';
    items.forEach(p => {
      const li = document.createElement('li');
      li.className = 'publist__item';
      li.innerHTML = `<span class="publist__year">${p.year}</span>${p.html}`;
      li.querySelectorAll('.detail__links, .pub__links').forEach(el => {
        el.classList.add('publist__links');
        el.classList.remove('detail__links', 'pub__links');
      });
      list.appendChild(li);
    });
  }

  render(listPri, primary);
  render(listSec, secondary);
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
    research:  'other',   teaching: 'other',
    rejection: 'rejection',
  };

  // Groups that render as horizontal span bars (the rest are dots)
  const spanGroups = new Set(['education', 'other', 'service']);

  // Parse all items
  const allItems = Array.from(dataEl.querySelectorAll(':scope > li')).map((li, i) => {
    const year    = parseInt(li.dataset.year, 10);
    const yearEnd = li.dataset.yearEnd ? parseInt(li.dataset.yearEnd, 10) : null;
    const kind    = li.dataset.kind;
    const group   = kindToGroup[kind] || kind;
    return { id: `tl-${i}`, year, yearEnd, kind, group, title: li.dataset.title, html: li.innerHTML };
  }).sort((a, b) => a.year - b.year || (a.yearEnd || a.year) - (b.yearEnd || b.year));

  if (!allItems.length) return;

  // Split: items before 2019 go in the "previously" panel; 2019+ on the main axis
  const AXIS_START = 2019;
  const prevItems = allItems.filter(it => (it.yearEnd || it.year) <= AXIS_START && it.year < AXIS_START);
  const items     = allItems.filter(it => it.year >= AXIS_START || (it.yearEnd && it.yearEnd > AXIS_START));

  // Fixed axis range: 2019–2027, all years labelled
  const minYear = AXIS_START;
  const maxYear = 2027;
  const sortedYears = [];
  for (let y = minYear + 1; y <= maxYear; y++) sortedYears.push(y);

  // ── Position helpers (power-of-1.7: compresses sparse early years) ──
  const yearPct = (y) => {
    const clamped = Math.max(minYear, Math.min(maxYear, y));
    return Math.pow((clamped - minYear) / (maxYear - minYear), 1.7);
  };
  const yearPos   = (y) => `calc(2.25rem + (100% - 4.5rem) * ${yearPct(y).toFixed(5)})`;
  const spanWidth = (s, e) => `calc((100% - 4.5rem) * ${(yearPct(e) - yearPct(s)).toFixed(5)})`;

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

  // ── Build axis ──────────────────────────────────────────────────────
  const axis = document.createElement('div');
  axis.className = 'tl-axis';
  axis.innerHTML = `<div class="tl-axis__line"></div>`;

  // All years 2019–2027
  sortedYears.forEach(y => {
    const el = document.createElement('div');
    el.className = 'tl-year';
    el.style.left = yearPos(y);
    el.innerHTML = `<span class="tl-year__tick"></span><span class="tl-year__label">${y}</span>`;
    axis.appendChild(el);
  });

  // Hand-drawn annotations — stand in for the old PhD education bar.
  // A thin line drops from the text down toward the axis, marking start + end.
  // SVG path with two gentle control points — reads as hand-drawn because it
  // wobbles off a perfectly straight line. viewBox 32×85 matches the CSS
  // container ratio (2rem × 5.3rem) so the stroke stays uniform.
  const linePath = 'M 3 82 Q 7 60, 14 38 Q 20 20, 28 4';
  const makeAnnot = (year, text, side) => {
    const a = document.createElement('div');
    a.className = `tl-annot tl-annot--${side}`;
    a.style.left = yearPos(year);
    a.innerHTML = `<span class="tl-annot__text">${text}</span>` +
      `<svg class="tl-annot__line" viewBox="0 0 32 85" preserveAspectRatio="none" aria-hidden="true">` +
      `<path d="${linePath}"/></svg>`;
    axis.appendChild(a);
  };
  makeAnnot(2022, 'started my PhD', 'left');
  makeAnnot(2027, 'ending my PhD (hopefully)', 'right');

  // ── Greedy lane assignment — single shared pool across all groups ──
  // Everything stacks upward from the axis line
  const LINE_REM    = 2.5;   // must match .tl-axis__line bottom in CSS
  const SPAN_H_REM  = 1.1;   // must match .tl-span height in CSS
  const LANE_GAP    = 0.2;
  const LANE_STEP   = SPAN_H_REM + LANE_GAP;  // 0.65rem per lane

  // Cutoff between solid "already happened" and dashed "planned/upcoming"
  const NOW = 2026 + 4/12;   // May 2026

  const sharedSlots = [];  // array-of-arrays of {s, e}
  function assignLane(s, e) {
    for (let i = 0; i < sharedSlots.length; i++) {
      if (!sharedSlots[i].some(b => b.s < e && s < b.e)) {
        sharedSlots[i].push({ s, e });
        return i;
      }
    }
    sharedSlots.push([{ s, e }]);
    return sharedSlots.length - 1;
  }

  const isSpan = (it) => spanGroups.has(it.group) && it.yearEnd && it.yearEnd > it.year;

  // Pre-assign lanes for span items (sorted by start year for deterministic packing)
  const itemLane = new Map();
  items.filter(isSpan).forEach(it => {
    itemLane.set(it.id, assignLane(it.year, it.yearEnd));
  });

  // ── Render span bars (split into solid past + dashed future at NOW) ──
  items.filter(isSpan).forEach(it => {
    const lane      = itemLane.get(it.id);
    const bottomRem = LINE_REM + lane * LANE_STEP;

    const makeSeg = (startY, endY, isFuture, withTooltip) => {
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = `tl-span tl-span--${it.group}${isFuture ? ' tl-span--future' : ''}`;
      bar.style.left   = yearPos(startY);
      bar.style.width  = spanWidth(startY, endY);
      bar.style.bottom = `${bottomRem}rem`;
      bar.style.top    = 'auto';
      bar.setAttribute('aria-label', `${it.kind}, ${it.year}–${it.yearEnd}: ${it.title}`);
      bar.dataset.id = it.id;
      // Tooltip only on the start segment — otherwise split spans show the
      // label at both their start and end, which reads as duplicate.
      bar.innerHTML = withTooltip ? `<span class="tl-dot__tooltip">${it.title}</span>` : '';
      bar.addEventListener('click', () => selectItem(it.id));
      axis.appendChild(bar);
    };

    if (it.yearEnd <= NOW) {
      makeSeg(it.year, it.yearEnd, false, true);     // fully past
    } else if (it.year >= NOW) {
      makeSeg(it.year, it.yearEnd, true, true);      // fully future
    } else {
      makeSeg(it.year, NOW, false, true);            // solid past portion — tooltip lives here
      makeSeg(NOW, it.yearEnd, true, false);         // dashed future portion — no tooltip
    }
  });

  // ── Helper: bottom rem where dots should START at a given year ───────
  // Dots sit just above the highest span bar covering that year.
  function spanCeilingRem(year) {
    let maxLane = -1;
    items.filter(isSpan).forEach(it => {
      // `<=` on both ends: a span that ends exactly at `year` still visually
      // reaches the dot, so we push the dot above it.
      if (it.year <= year && year <= it.yearEnd) {
        const lane = itemLane.get(it.id);
        if (lane > maxLane) maxLane = lane;
      }
    });
    // Bar top = LINE_REM + lane * LANE_STEP + SPAN_H_REM
    // Dot center must be above bar top + gap (0.2rem) + dot radius (0.6875rem)
    const DOT_RADIUS = 0.6875;  // half of 1.375rem dot diameter
    const BAR_DOT_GAP = 0.2;
    return maxLane === -1
      ? LINE_REM
      : LINE_REM + maxLane * LANE_STEP + SPAN_H_REM + DOT_RADIUS + BAR_DOT_GAP;
  }

  // ── Render dots — stack upward from above any bars at that year ───────
  const DOT_STEP = 1.625; // dot diameter (1.375rem) + gap (0.25rem)

  const dotsByYear = {};
  items.filter(it => !isSpan(it)).forEach(it => {
    (dotsByYear[it.year] = dotsByYear[it.year] || []).push(it);
  });

  Object.keys(dotsByYear).sort((a, b) => +a - +b).forEach(y => {
    const baseBottom = spanCeilingRem(+y);
    dotsByYear[y].forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tl-dot tl-dot--${it.group}`;
      btn.style.left   = yearPos(+y);
      btn.style.bottom = `${(baseBottom + idx * DOT_STEP).toFixed(3)}rem`;
      btn.style.top    = 'auto';
      btn.setAttribute('aria-label', `${it.kind}, ${it.year}: ${it.title}`);
      btn.dataset.id = it.id;

      btn.innerHTML = `<span class="tl-dot__tooltip">${it.title}</span>`;

      btn.addEventListener('click', () => selectItem(it.id));
      axis.appendChild(btn);
    });
  });

  host.appendChild(axis);

  // ── Mobile: vertical axis — same semantics as desktop, rotated 90° ────
  // Time flows top-to-bottom on the left side; detail panel sits below.
  const axisV = document.createElement('div');
  axisV.className = 'tl-axis-vert';
  axisV.innerHTML = `<div class="tl-axis-vert__line"></div>`;

  // Vertical position along the axis uses the same easing, applied to Y.
  // The axis line is inset 1rem from top/bottom of the 44rem container.
  const yearPosV   = (y) => `calc(1rem + (100% - 2rem) * ${yearPct(y).toFixed(5)})`;
  const spanHeightV = (s, e) => `calc((100% - 2rem) * ${(yearPct(e) - yearPct(s)).toFixed(5)})`;

  // Year labels on the left
  sortedYears.forEach(y => {
    const el = document.createElement('div');
    el.className = 'tl-year tl-year--vert';
    el.style.top = yearPosV(y);
    el.innerHTML = `<span class="tl-year__label">${y}</span><span class="tl-year__tick"></span>`;
    axisV.appendChild(el);
  });

  // Mobile annotations — same text as desktop, laid out horizontally.
  // Container is 3rem wide × 3.2rem tall → viewBox 85 × 85 (square-ish).
  // Top variant: starts at top-left (tick corner) and curves down-right to
  //   the vertical middle (where the text is).
  // Bottom variant: starts at bottom-left (tick corner) and curves up-right
  //   to the vertical middle.
  // Both land at (82, 42) so the line enters the text's vertical centerline.
  const linePathVTop    = 'M 4 6 Q 22 18, 42 30 Q 62 40, 82 42';
  const linePathVBottom = 'M 4 80 Q 22 68, 42 54 Q 62 44, 82 42';
  const makeAnnotV = (year, text, side) => {
    const a = document.createElement('div');
    a.className = `tl-annot tl-annot--vert tl-annot--${side}`;
    a.style.top = yearPosV(year);
    const path = side === 'top' ? linePathVTop : linePathVBottom;
    a.innerHTML =
      `<svg class="tl-annot__line tl-annot__line--vert" viewBox="0 0 85 85" ` +
        `preserveAspectRatio="none" aria-hidden="true"><path d="${path}"/></svg>` +
      `<span class="tl-annot__text tl-annot__text--vert">${text}</span>`;
    axisV.appendChild(a);
  };
  makeAnnotV(2022, 'started my PhD', 'top');
  makeAnnotV(2027, 'ending my PhD (hopefully)', 'bottom');

  // Vertical layout constants — rightward stacking instead of upward
  const V_AXIS_LEFT_REM  = 3.25;              // matches .tl-axis-vert__line left
  const V_MARK_START_REM = V_AXIS_LEFT_REM + 0.85;  // marks sit right of the line, not on it
  const V_SPAN_W_REM     = 1.1;               // vertical bar width (matches dot diameter)
  const V_LANE_GAP       = 0.2;
  const V_LANE_STEP      = V_SPAN_W_REM + V_LANE_GAP;
  const V_DOT_STEP       = 1.475;             // dot diameter (1.375) + small gap

  // Render span bars vertically, splitting past/future at NOW (same as desktop)
  items.filter(isSpan).forEach(it => {
    const lane    = itemLane.get(it.id);
    const leftRem = V_MARK_START_REM + lane * V_LANE_STEP;

    const makeSegV = (startY, endY, isFuture, withTooltip) => {
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = `tl-span tl-span--vert tl-span--${it.group}${isFuture ? ' tl-span--future' : ''}`;
      bar.style.top    = yearPosV(startY);
      bar.style.height = spanHeightV(startY, endY);
      bar.style.left   = `${leftRem.toFixed(3)}rem`;
      bar.setAttribute('aria-label', `${it.kind}, ${it.year}–${it.yearEnd}: ${it.title}`);
      bar.dataset.id = it.id;
      bar.innerHTML = withTooltip ? `<span class="tl-dot__tooltip">${it.title}</span>` : '';
      bar.addEventListener('click', () => selectItem(it.id));
      axisV.appendChild(bar);
    };

    if (it.yearEnd <= NOW)       makeSegV(it.year, it.yearEnd, false, true);
    else if (it.year >= NOW)     makeSegV(it.year, it.yearEnd, true, true);
    else { makeSegV(it.year, NOW, false, true); makeSegV(NOW, it.yearEnd, true, false); }
  });

  // For vertical mode, dots at a given year sit just right of any covering spans
  function spanCeilingLeftRem(year) {
    let maxLane = -1;
    items.filter(isSpan).forEach(it => {
      if (it.year <= year && year <= it.yearEnd) {
        const lane = itemLane.get(it.id);
        if (lane > maxLane) maxLane = lane;
      }
    });
    const DOT_RADIUS = 0.6875;
    const BAR_DOT_GAP = 0.25;
    return maxLane === -1
      ? V_MARK_START_REM
      : V_MARK_START_REM + maxLane * V_LANE_STEP + (V_SPAN_W_REM / 2) + BAR_DOT_GAP + DOT_RADIUS;
  }

  Object.keys(dotsByYear).sort((a, b) => +a - +b).forEach(y => {
    const baseLeft = spanCeilingLeftRem(+y);
    dotsByYear[y].forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tl-dot tl-dot--vert tl-dot--${it.group}`;
      btn.style.top  = yearPosV(+y);
      btn.style.left = `${(baseLeft + idx * V_DOT_STEP).toFixed(3)}rem`;
      btn.setAttribute('aria-label', `${it.kind}, ${it.year}: ${it.title}`);
      btn.dataset.id = it.id;
      btn.innerHTML = `<span class="tl-dot__tooltip">${it.title}</span>`;
      btn.addEventListener('click', () => selectItem(it.id));
      axisV.appendChild(btn);
    });
  });

  host.appendChild(axisV);

  // Tooltip edge-detection (desktop axis only — vertical axis uses its own layout)
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
    const yearStr = it.yearEnd && it.yearEnd !== it.year
      ? `${it.year}–${it.yearEnd}` : `${it.year}`;

    detail.innerHTML = `
      <span class="detail__kind detail__kind--${it.kind}">${kindLabels[it.kind] || it.kind}</span>
      <span class="detail__year">${yearStr}</span>
      <div class="detail__body">${it.html}</div>`;

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
