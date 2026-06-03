const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3400;
const ROOT = __dirname;
const CONTENT_FILE = path.join(ROOT, 'content.json');

app.use(express.json());
app.use(express.static(ROOT, { extensions: ['html'] }));

// Upload assets
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(ROOT, 'assets')),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// --- Content API ---

app.get('/api/content', (req, res) => {
  res.json(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')));
});

app.post('/api/content', (req, res) => {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(req.body, null, 2));
  res.json({ ok: true });
});

// --- Assets API ---

app.get('/api/assets', (req, res) => {
  const files = fs.readdirSync(path.join(ROOT, 'assets'))
    .filter(f => /\.(png|jpg|jpeg|gif|mp4|mov|webm|svg|webp)$/i.test(f))
    .map(f => ({ name: f, path: `assets/${f}` }));
  res.json(files);
});

app.post('/api/upload', upload.array('files'), (req, res) => {
  res.json({ files: req.files.map(f => `assets/${f.filename}`) });
});

// --- Homepage Generator ---
app.post('/api/generate-homepage', (req, res) => {
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

  const articles = content.homepage.map((item, i) => {
    const isVideo = item.type === 'video' || /\.(mp4|mov|webm)$/i.test(item.asset);
    const media = isVideo
      ? `<video class="case-image case-video" src="${item.asset}" muted autoplay playsinline webkit-playsinline loop></video>`
      : `<img class="case-image" src="${item.asset}" alt="${item.title}" />`;
    return `    <article class="case" data-index="${i}">
      <a href="cases/${item.id}.html" class="case-link">
        <div class="case-image-wrap">
          ${media}
        </div>
        <div class="case-meta">
          <h2 class="case-title">${item.title}</h2>
        </div>
      </a>
    </article>`;
  }).join('\n\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Peder Anzén</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css?v=8" />
  <link rel="icon" href="/logo.svg" type="image/svg+xml" />
</head>
<body>

  <header class="site-header">
    <a href="/" class="logo-link">
      <img src="logo.svg" alt="Peder Anzén" class="logo" />
    </a>
    <nav class="site-nav">
      <a href="/" style="text-decoration: underline; text-underline-offset: 4px;">Work</a>
      <a href="/about.html">About</a>
    </nav>
  </header>

  <main class="cases">

${articles}

  </main>

  <footer class="site-footer reveal">
    <span class="footer-name">
      <img src="logo.svg" alt="" class="footer-logo" />
      Peder Anzén
    </span>
    <a class="footer-linkedin" href="https://www.linkedin.com/in/pederanzen" target="_blank" rel="noopener" aria-label="LinkedIn">
      <svg width="28" height="28" viewBox="0 0 64 64" fill="currentColor">
        <rect x="20.4" y="26.6" width="5.4" height="17.4"/>
        <circle cx="23.1" cy="21.2" r="3.1"/>
        <path d="M29.2,26.6h5.2V29h0.1c0.7-1.4,2.5-2.8,5.1-2.8c5.5,0,6.5,3.6,6.5,8.3V44h-5.4v-8.4c0-2,0-4.6-2.8-4.6c-2.8,0-3.2,2.2-3.2,4.5V44h-5.4V26.6z"/>
      </svg>
    </a>
    <a class="footer-hello" href="mailto:hey@peder.design">Say Hello!</a>
  </footer>

  <script src="main.js?v=11"></script>
  <script>
    let lastY = 0;
    const header = document.querySelector('.site-header');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const scrollingDown = y > lastY;
      header.classList.toggle('hidden', scrollingDown && y > 80);
      header.classList.toggle('has-bg', !scrollingDown && y > 80);
      lastY = y;
    }, { passive: true });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  res.json({ ok: true, file: 'index.html' });
});

// --- HTML Generator ---
app.post('/api/generate/:id', (req, res) => {
  const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  const id = req.params.id;
  const c = content.cases[id];
  if (!c) return res.status(404).json({ error: 'Case not found' });

  // Auto-compute prev/next from homepage order
  const order = content.homepage.map(h => h.id);
  const idx = order.indexOf(id);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx < order.length - 1 ? order[idx + 1] : null;
  const prevCase = prevId ? content.cases[prevId] : null;
  const nextCase = nextId ? content.cases[nextId] : null;

  const isVideo = src => /\.(mp4|mov|webm)$/i.test(src);
  const mediaTag = src => isVideo(src)
    ? `<video class="case-img case-video" src="../${src}" muted autoplay playsinline webkit-playsinline loop></video>`
    : `<img class="case-img" src="../${src}" alt="" />`;

  const rows = (c.rows || []).map(row => {
    const files = Array.isArray(row) ? row : (row.files || []);
    const captions = Array.isArray(row) ? [] : (row.captions || (row.caption ? [row.caption] : []));
    const layout = Array.isArray(row) ? null : (row.layout || null);

    let inner;

    if (layout === 'masonry') {
      const makeItem = (src, i) => {
        const cap = captions[i];
        return `          <div class="case-masonry-item">\n            ${mediaTag(src)}${cap ? `\n            <p class="case-caption">${cap}</p>` : ''}\n          </div>`;
      };
      const col1 = files.filter((_, i) => i % 2 === 0).map((src, j) => makeItem(src, j * 2)).join('\n');
      const col2 = files.filter((_, i) => i % 2 === 1).map((src, j) => makeItem(src, j * 2 + 1)).join('\n');
      inner = `<div class="case-masonry">\n        <div class="case-masonry-col">\n${col1}\n        </div>\n        <div class="case-masonry-col">\n${col2}\n        </div>\n      </div>`;
    } else if (files.length === 2) {
      // Images first (share equal height in grid row 1), captions below (grid row 2)
      const imgs = files.map(src => `        ${mediaTag(src)}`).join('\n');
      const caps = files.map((_, i) => `        <p class="case-caption">${captions[i] || ''}</p>`).join('\n');
      const hasCaptions = captions.some(Boolean);
      inner = `<div class="case-img-row">\n${imgs}${hasCaptions ? '\n' + caps : ''}\n      </div>`;
    } else {
      const cap = captions[0];
      inner = mediaTag(files[0]) + (cap ? `\n        <p class="case-caption">${cap}</p>` : '');
    }

    return `      <div class="case-media-block reveal">\n        ${inner}\n      </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${c.title} — Peder Anzén</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Inter+Tight:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../case.css" />
</head>
<body>

  <header class="site-header">
    <a href="/" class="logo-link">
      <img src="../logo.svg" alt="Peder Anzén" class="logo" />
    </a>
    <nav class="site-nav">
      <a href="/">Work</a>
      <a href="/about.html">About</a>
    </nav>
  </header>

  <main>
    <section class="case-hero">
      <h1 class="case-hero-title reveal">${c.title}</h1>
    </section>

    <section class="case-intro reveal">
      <div class="case-intro-left">
        <p class="case-role">${c.role}</p>
        ${c.description.map(p => `<p class="case-body">${p}</p>`).join('\n        ')}
      </div>
    </section>

    <div class="case-images">
${rows}
    </div>
  </main>

  <nav class="case-nav">
    <a class="case-nav-prev" href="${prevId ? `${prevId}.html` : '#'}">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><line x1="16" y1="10" x2="4" y2="10" stroke="#2D2B2A" stroke-width="1.2"/><polyline points="9,5 4,10 9,15" stroke="#2D2B2A" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="case-nav-title">${prevCase ? prevCase.title : 'Back'}</span>
    </a>
    <a class="case-nav-next" href="${nextId ? `${nextId}.html` : '/'}">
      <span class="case-nav-title">${nextCase ? nextCase.title : 'All Work'}</span>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><line x1="4" y1="10" x2="16" y2="10" stroke="#2D2B2A" stroke-width="1.2"/><polyline points="11,5 16,10 11,15" stroke="#2D2B2A" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </nav>

  <footer class="site-footer">
    <span class="footer-name">
      <img src="../logo.svg" alt="" class="footer-logo" />
      Peder Anzén
    </span>
    <a class="footer-linkedin" href="https://www.linkedin.com/in/pederanzen" target="_blank" rel="noopener" aria-label="LinkedIn">
      <svg width="28" height="28" viewBox="0 0 64 64" fill="currentColor"><rect x="20.4" y="26.6" width="5.4" height="17.4"/><circle cx="23.1" cy="21.2" r="3.1"/><path d="M29.2,26.6h5.2V29h0.1c0.7-1.4,2.5-2.8,5.1-2.8c5.5,0,6.5,3.6,6.5,8.3V44h-5.4v-8.4c0-2,0-4.6-2.8-4.6c-2.8,0-3.2,2.2-3.2,4.5V44h-5.4V26.6z"/></svg>
    </a>
    <a class="footer-hello" href="mailto:hey@peder.design">Say Hello!</a>
  </footer>

  <script src="../case.js"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(ROOT, 'cases', `${id}.html`), html);
  res.json({ ok: true, file: `cases/${id}.html` });
});

app.listen(PORT, () => console.log(`Portfolio running at http://localhost:${PORT}\nAdmin at http://localhost:${PORT}/admin.html`));
