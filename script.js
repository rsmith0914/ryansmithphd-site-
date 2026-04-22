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
  const allItems = Array.from(dataEl.querySelectorAll('li')).map((li, i) => {
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

  // ── Greedy lane assignment — single shared pool across all groups ──
  // Everything stacks upward from the axis line
  const LINE_REM    = 2.5;   // must match .tl-axis__line bottom in CSS
  const SPAN_H_REM  = 0.45;  // must match .tl-span height in CSS
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

    const makeSeg = (startY, endY, isFuture) => {
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = `tl-span tl-span--${it.group}${isFuture ? ' tl-span--future' : ''}`;
      bar.style.left   = yearPos(startY);
      bar.style.width  = spanWidth(startY, endY);
      bar.style.bottom = `${bottomRem}rem`;
      bar.style.top    = 'auto';
      bar.setAttribute('aria-label', `${it.kind}, ${it.year}–${it.yearEnd}: ${it.title}`);
      bar.dataset.id = it.id;
      bar.innerHTML = `
        <span class="tl-dot__tooltip">${it.title}</span>
        <span class="tl-span__mobile-label">
          <strong>${it.year}–${it.yearEnd} · ${it.kind}</strong> — ${it.title}
        </span>`;
      bar.addEventListener('click', () => selectItem(it.id));
      axis.appendChild(bar);
    };

    if (it.yearEnd <= NOW) {
      makeSeg(it.year, it.yearEnd, false);      // fully past
    } else if (it.year >= NOW) {
      makeSeg(it.year, it.yearEnd, true);       // fully future
    } else {
      makeSeg(it.year, NOW, false);             // solid past portion
      makeSeg(NOW, it.yearEnd, true);           // dashed future portion
    }
  });

  // ── Helper: bottom rem where dots should START at a given year ───────
  // Dots sit just above the highest span bar covering that year.
  function spanCeilingRem(year) {
    let maxLane = -1;
    items.filter(isSpan).forEach(it => {
      if (it.year <= year && year < it.yearEnd) {
        const lane = itemLane.get(it.id);
        if (lane > maxLane) maxLane = lane;
      }
    });
    // Bar top = LINE_REM + lane * LANE_STEP + SPAN_H_REM
    // Dot center must be above bar top + gap (0.2rem) + dot radius (0.55rem)
    const DOT_RADIUS = 0.55;  // half of 1.1rem dot diameter
    const BAR_DOT_GAP = 0.2;
    return maxLane === -1
      ? LINE_REM
      : LINE_REM + maxLane * LANE_STEP + SPAN_H_REM + DOT_RADIUS + BAR_DOT_GAP;
  }

  // ── Render dots — stack upward from above any bars at that year ───────
  const DOT_STEP = 1.35; // dot diameter (1.1rem) + gap (0.25rem)

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

      btn.innerHTML = `
        <span class="tl-dot__tooltip">${it.title}</span>
        <span class="tl-dot__mobile-label">
          <strong>${it.year} · ${it.kind}</strong> — ${it.title}
        </span>`;

      btn.addEventListener('click', () => selectItem(it.id));
      axis.appendChild(btn);
    });
  });

  host.appendChild(axis);

  // ── Mobile: flat chronological list (replaces axis on small screens) ──
  const mobileList = document.createElement('ol');
  mobileList.className = 'tl-mobile';
  const kindLabelsShort = {
    paper: 'paper', talk: 'talk',
    grant: 'grant', award: 'award',
    education: 'education', service: 'service',
    research: 'research', teaching: 'teaching',
    rejection: 'rejection',
  };
  // Include everything (prev + axis items), sort by start year ascending, most recent at top
  const mobileItems = [...allItems].sort((a, b) => (b.year - a.year) || ((b.yearEnd || b.year) - (a.yearEnd || a.year)));
  mobileItems.forEach(it => {
    const li = document.createElement('li');
    li.className = `tl-mobile__item tl-mobile__item--${it.group}`;
    li.dataset.id = it.id;
    const yearLabel = it.yearEnd && it.yearEnd !== it.year ? `${it.year}–${it.yearEnd}` : `${it.year}`;
    li.innerHTML = `
      <span class="tl-mobile__pip" aria-hidden="true"></span>
      <div class="tl-mobile__body">
        <span class="tl-mobile__meta">${yearLabel} · ${kindLabelsShort[it.kind] || it.kind}</span>
        <strong class="tl-mobile__title">${it.title}</strong>
      </div>`;
    li.addEventListener('click', () => selectItem(it.id));
    mobileList.appendChild(li);
  });
  host.appendChild(mobileList);

  // Tooltip edge-detection
  requestAnimationFrame(() => {
    const axisRect = axis.getBoundingClientRect();
    host.querySelectorAll('.tl-dot').forEach(dot => {
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

    // Highlight in main axis
    host.querySelectorAll('.tl-dot, .tl-span').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });
    // Highlight in previously panel
    host.querySelectorAll('.tl-prev__entry').forEach(el => {
      el.classList.toggle('is-active', el.dataset.id === id);
    });
    // Highlight in mobile list
    host.querySelectorAll('.tl-mobile__item').forEach(el => {
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
