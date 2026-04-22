# ryansmithphd.com

Personal academic site. Plain HTML/CSS/JS — no build step, no dependencies.

## Local preview

Just open `index.html` in a browser. Or, for nicer local serving:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying to GitHub Pages

### Option A — user site at `yourusername.github.io`

1. Create a public repo named exactly `yourusername.github.io`.
2. Push these files to the `main` branch.
3. GitHub Pages will serve it automatically. Go to **Settings → Pages** to confirm — you should see it published within a minute.

### Option B — project site at `yourusername.github.io/site-name`

1. Create a public repo (any name).
2. Push these files to `main`.
3. **Settings → Pages → Source** → pick `Deploy from a branch` → `main` / `/ (root)` → Save.
4. Wait ~1 minute, then visit `https://yourusername.github.io/repo-name/`.

### Option C — keep your custom domain `ryansmithphd.com`

1. Do Option A or B first.
2. **Settings → Pages → Custom domain** → enter `ryansmithphd.com` → Save.
3. At your domain registrar, point an `ALIAS`/`ANAME` or `A` record at GitHub's IPs (GitHub's docs will show the current ones).
4. Enable "Enforce HTTPS" once the cert provisions.
5. GitHub will create a `CNAME` file in the repo for you.

## Editing content

Everything lives in one place:

- **`index.html`** — all text content (about, research, projects, publications, grants, contact).
- **`style.css`** — colors and fonts live in the `:root` block at the top. Swap `--accent` to change the accent color site-wide.
- **`script.js`** — tiny, just handles the mobile nav and scroll reveals.

### Adding a new publication

Find the `#publications` section in `index.html`. Copy one of the existing `<li class="pub">` blocks and edit. Add a new year group with a `<div class="pubs__group">` if needed.

### Adding a new project

Find `#projects`. Copy one of the existing `<article class="project">` blocks.

## Replacing placeholder images

The `/images/` folder currently contains labeled SVG placeholders. Drop your real files in and **update the `src` paths in `index.html`** (search for `.svg` — there are 10 image references).

Expected slots:

| Filename          | Where it shows up                     | Recommended crop |
|-------------------|---------------------------------------|------------------|
| `hero.*`          | Hero section (hiking photo)           | 4:5 portrait     |
| `about-suit.*`    | About section (suit photo)            | 4:5 portrait     |
| `research.*`      | Research section (scrubs photo)       | 4:5 portrait     |
| `sketch-1..4.*`   | Health story sketching gallery        | 4:3 landscape    |
| `prototype-1..2.*`| Medical form prototype gallery        | 4:3 landscape    |
| `award.*`         | Grants & awards section               | 4:5 portrait     |

You can use `.jpg`, `.png`, or `.webp` — just match the extension in `index.html`.

## Adding your CV

The hero has a "Download CV" button that looks for `cv.pdf` in the repo root. Drop your CV there and it'll Just Work. If you want a different filename, edit the `href` on the button in `index.html` (search for `cv.pdf`).

## Favicon, OG image, 404

Already wired up:

- `favicon.svg` — the "RS" monogram you see in the nav. Edit the SVG to change the color.
- `apple-touch-icon.png` — 180×180 PNG for iOS home screens, generated from the favicon.
- `og-image.svg` / `og-image.png` — the social card that shows when you share the site on Twitter, LinkedIn, Slack, etc. Preview it with a tool like [opengraph.xyz](https://www.opengraph.xyz/) after deploying. The PNG is what social platforms actually fetch; the SVG is there as an editable source.
- `404.html` — a matching-voice Not Found page. GitHub Pages serves it automatically.

**If you update your tagline or affiliation**, edit both `index.html` (meta tags at the top) and `og-image.svg`, then re-export the PNG:

```bash
# requires cairosvg: pip install cairosvg
python3 -c "import cairosvg; cairosvg.svg2png(url='og-image.svg', write_to='og-image.png', output_width=1200)"
```

## Colophon / repo link

The footer has a "View source on GitHub" link that defaults to `#`. Once the repo exists, edit the `href` on `#repo-link` in `index.html`.

## Accessibility / perf notes

- Respects `prefers-reduced-motion`.
- Semantic HTML, single `<h1>`, section landmarks, `aria-expanded` on the nav toggle.
- No tracking, no cookies, no analytics.
- Fonts are the only external request (Google Fonts). If you'd rather self-host them, download from [Fontsource](https://fontsource.org/) and swap the `<link>` tag in `index.html`.
