// Activity fetcher — CobolCaveman
// Hugo's js.Build compiles this; window.WORKER_URL is set in baseof.html.

declare const window: Window & { WORKER_URL: string };

// ── Types ──────────────────────────────────────────────────────────────────────
interface GithubRepo {
  name:        string;
  description: string | null;
  url:         string;
  stars:       number;
  language:    string | null;
  pushed_at:   string;
  topics:      string[];
}

interface DevtoPost {
  title:                string;
  url:                  string;
  published_at:         string;
  tags:                 string[];
  reactions:            number;
  cover_image:          string | null;
  reading_time_minutes: number;
}

interface YoutubeVideo {
  title:        string;
  url:          string;
  thumbnail:    string;
  published_at: string;
  video_id:     string;
}

interface ActivityResponse {
  github:     GithubRepo[];
  devto:      DevtoPost[];
  youtube:    YoutubeVideo[];
  fetched_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff   = Date.now() - new Date(dateStr).getTime();
  const mins   = Math.floor(diff / 60000);
  const hours  = Math.floor(mins  / 60);
  const days   = Math.floor(hours / 24);
  const months = Math.floor(days  / 30);
  const years  = Math.floor(months / 12);
  if (years  > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (days   > 0) return `${days}d ago`;
  if (hours  > 0) return `${hours}h ago`;
  return 'just now';
}

function langColor(lang: string | null): string {
  const map: Record<string, string> = {
    'COBOL':      '#f97316',
    'Python':     '#3b82f6',
    'JavaScript': '#eab308',
    'TypeScript': '#06b6d4',
    'Go':         '#22d3ee',
    'Rust':       '#f97316',
    'C':          '#6b7280',
    'C++':        '#9333ea',
    'Shell':      '#84cc16',
    'Ruby':       '#ef4444',
    'Java':       '#f59e0b',
  };
  return lang ? (map[lang] ?? '#78716c') : '#57534e';
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Renderers ──────────────────────────────────────────────────────────────────
function renderGithub(repos: GithubRepo[]): void {
  const el = document.getElementById('github-cards');
  if (!el) return;
  if (!repos.length) { showEmpty(el, 'No recent repos found.'); return; }

  el.innerHTML = repos.map(r => `
    <a href="${esc(r.url)}" target="_blank" rel="noopener" class="card">
      <div class="card-inner">
        <div class="card-header">
          <span class="card-title">${esc(r.name)}</span>
          ${r.stars > 0 ? `<span class="badge">★ ${r.stars}</span>` : ''}
        </div>
        ${r.description ? `<p class="card-desc">${esc(r.description)}</p>` : ''}
        <div class="card-footer">
          ${r.language
            ? `<span class="lang-dot" style="background:${langColor(r.language)}"></span>
               <span class="card-meta">${esc(r.language)}</span>`
            : ''}
          <span class="card-meta ml-auto">${timeAgo(r.pushed_at)}</span>
        </div>
      </div>
    </a>
  `).join('');
}

function renderDevto(posts: DevtoPost[]): void {
  const el = document.getElementById('devto-cards');
  if (!el) return;
  if (!posts.length) { showEmpty(el, 'No posts found.'); return; }

  el.innerHTML = posts.map(p => `
    <a href="${esc(p.url)}" target="_blank" rel="noopener" class="card">
      ${p.cover_image
        ? `<img src="${esc(p.cover_image)}" alt="" class="card-cover" loading="lazy">`
        : ''}
      <div class="card-inner">
        <div class="card-header">
          <span class="card-title">${esc(p.title)}</span>
          ${p.reactions > 0 ? `<span class="badge">♥ ${p.reactions}</span>` : ''}
        </div>
        <div class="card-footer">
          <span class="card-meta">${p.reading_time_minutes} min read</span>
          <span class="card-meta ml-auto">${timeAgo(p.published_at)}</span>
        </div>
        ${p.tags.length
          ? `<div class="card-tags">${p.tags.slice(0,3).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>`
          : ''}
      </div>
    </a>
  `).join('');
}

function renderYoutube(videos: YoutubeVideo[]): void {
  const el = document.getElementById('youtube-cards');
  if (!el) return;
  if (!videos.length) { showEmpty(el, 'No videos found.'); return; }

  el.innerHTML = videos.map(v => `
    <a href="${esc(v.url)}" target="_blank" rel="noopener" class="card card-video">
      <div class="video-thumb-wrap">
        <img src="${esc(v.thumbnail)}" alt="${esc(v.title)}" class="video-thumb" loading="lazy">
        <div class="play-btn" aria-hidden="true">▶</div>
      </div>
      <div class="card-inner">
        <div class="card-header">
          <span class="card-title">${esc(v.title)}</span>
        </div>
        <div class="card-footer">
          <span class="card-meta">${timeAgo(v.published_at)}</span>
        </div>
      </div>
    </a>
  `).join('');
}

function showEmpty(el: HTMLElement, msg: string): void {
  el.innerHTML = `<p class="error-msg">${msg}</p>`;
}

function showError(id: string, msg: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<p class="error-msg">${msg}</p>`;
}

// ── Demo content ─────────────────────────────────────────────────────────────
// Shown on localhost only (the worker's CORS allows the production origin, not
// localhost, so a real fetch would fail in dev). Lets you preview the card
// design + scroll-spy with realistic heights. Production always uses the worker.
const daysAgo  = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();
const hoursAgo = (n: number): string => new Date(Date.now() - n * 3_600_000).toISOString();
const MASCOT   = '/img/caveman-idle.png';

const DEMO: ActivityResponse = {
  github: [
    { name: 'cobol-rosetta',     description: 'Type-safe bindings that drag COBOL copybooks into the modern era.', url: 'https://github.com/CobolCaveman/cobol-rosetta',     stars: 342, language: 'COBOL',      pushed_at: hoursAgo(6),  topics: ['cobol', 'codegen'] },
    { name: 'ember-forge',       description: 'Zero-dependency build tool for static cave dwellings.',              url: 'https://github.com/CobolCaveman/ember-forge',       stars: 128, language: 'TypeScript', pushed_at: daysAgo(3),   topics: ['build', 'tooling'] },
    { name: 'flintlock',         description: 'Tiny, fast feature-flag daemon. Bangs rocks together quickly.',      url: 'https://github.com/CobolCaveman/flintlock',         stars: 89,  language: 'Rust',       pushed_at: daysAgo(9),   topics: ['flags', 'edge'] },
    { name: 'tarpit',            description: 'Honeypot that traps lazy crawlers in primordial ooze.',              url: 'https://github.com/CobolCaveman/tarpit',            stars: 256, language: 'Python',     pushed_at: daysAgo(14),  topics: ['security'] },
    { name: 'monolith-migrator', description: 'Strangler-fig toolkit for breaking up the big stone monolith.',      url: 'https://github.com/CobolCaveman/monolith-migrator', stars: 67,  language: 'Go',         pushed_at: daysAgo(21),  topics: ['migration'] },
    { name: 'stonecutter',       description: 'Deterministic asset hasher — chisels filenames so caches never go stale.', url: 'https://github.com/CobolCaveman/stonecutter',  stars: 41,  language: 'Go',         pushed_at: daysAgo(33),  topics: ['caching', 'cli'] },
  ],
  devto: [
    { title: 'Why I Still Write COBOL in 2026 (and You Might Too)', url: 'https://dev.to/cobolcaveman/cobol-2026',        published_at: daysAgo(2),  tags: ['cobol', 'legacy', 'career'],      reactions: 214, cover_image: null, reading_time_minutes: 7 },
    { title: 'Debugging a Batch Job Older Than I Am',               url: 'https://dev.to/cobolcaveman/old-batch-job',     published_at: daysAgo(6),  tags: ['debugging', 'mainframe'],         reactions: 156, cover_image: null, reading_time_minutes: 11 },
    { title: 'Cache Busting Without Losing Your Mind',              url: 'https://dev.to/cobolcaveman/cache-busting',     published_at: daysAgo(12), tags: ['webperf', 'caching', 'hugo'],     reactions: 98,  cover_image: null, reading_time_minutes: 6 },
    { title: 'The Stack: No Node, No node_modules, No Regrets',     url: 'https://dev.to/cobolcaveman/the-stack',         published_at: daysAgo(18), tags: ['tooling', 'hugo', 'minimalism'],  reactions: 187, cover_image: null, reading_time_minutes: 9 },
    { title: 'Reading 40-Year-Old Code Like Cave Paintings',       url: 'https://dev.to/cobolcaveman/code-archaeology', published_at: daysAgo(27), tags: ['legacy', 'archaeology'],          reactions: 73,  cover_image: null, reading_time_minutes: 5 },
    { title: 'Static Sites Are a Cheat Code',                      url: 'https://dev.to/cobolcaveman/static-cheat',      published_at: daysAgo(40), tags: ['hugo', 'cloudflare', 'jamstack'], reactions: 142, cover_image: null, reading_time_minutes: 4 },
  ],
  youtube: [
    { title: 'I Rewrote a COBOL Payroll System in a Weekend',        url: 'https://www.youtube.com/watch?v=demo1', thumbnail: MASCOT, published_at: daysAgo(3),  video_id: 'demo1' },
    { title: 'Banging Rocks Together: Building a Worker from Scratch', url: 'https://www.youtube.com/watch?v=demo2', thumbnail: MASCOT, published_at: daysAgo(12), video_id: 'demo2' },
    { title: "Why Your Mainframe Isn't Going Anywhere",             url: 'https://www.youtube.com/watch?v=demo3', thumbnail: MASCOT, published_at: daysAgo(24), video_id: 'demo3' },
    { title: 'Cave Tour: My Zero-JavaScript Dev Setup',             url: 'https://www.youtube.com/watch?v=demo4', thumbnail: MASCOT, published_at: daysAgo(40), video_id: 'demo4' },
  ],
  fetched_at: new Date().toISOString(),
};

function renderAll(data: ActivityResponse): void {
  renderGithub(data.github);
  renderDevto(data.devto);
  renderYoutube(data.youtube);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function loadActivity(): Promise<void> {
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') {
    renderAll(DEMO);
    return;
  }

  const workerURL = window.WORKER_URL?.replace(/\/$/, '');
  if (!workerURL) {
    console.warn('[activity] WORKER_URL not set');
    return;
  }

  try {
    const res = await fetch(`${workerURL}/api/activity`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ActivityResponse = await res.json();
    renderGithub(data.github);
    renderDevto(data.devto);
    renderYoutube(data.youtube);
  } catch (err) {
    console.error('[activity] fetch failed:', err);
    const msg = 'Caveman dropped rocks. Try again later.';
    showError('github-cards',  msg);
    showError('devto-cards',   msg);
    showError('youtube-cards', msg);
  }
}

// ── Scroll-spy ───────────────────────────────────────────────────────────────
// Lights the dot for the section currently crossing an activation line ~35% down
// the viewport, and marks earlier sections "passed". Scroll-position based (not
// IntersectionObserver) so that on short pages the LAST section still activates
// when you reach the bottom — otherwise a short final section never enters the
// band. rAF-throttled with a passive listener, so it's cheap.
function initScrollSpy(): void {
  const links = Array.from(
    document.querySelectorAll<HTMLElement>('[data-spy-link]')
  );
  if (!links.length) return;

  const ids  = links.map(l => l.dataset.spyLink as string);
  const byId = new Map(links.map(l => [l.dataset.spyLink as string, l]));
  const sections = ids
    .map(id => document.getElementById(id))
    .filter((s): s is HTMLElement => s !== null);
  if (!sections.length) return;

  function setActive(activeId: string): void {
    const activeIdx = ids.indexOf(activeId);
    ids.forEach((id, i) => {
      const link = byId.get(id);
      if (!link) return;
      link.dataset.active = id === activeId ? 'true' : 'false';
      link.dataset.passed = i < activeIdx ? 'true' : 'false';
    });
  }

  let ticking = false;
  function update(): void {
    ticking = false;
    const line     = window.innerHeight * 0.35;
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2;

    let active = ids[0];
    if (atBottom) {
      active = ids[ids.length - 1];        // reaching the end always lights the last
    } else {
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) active = ids[i];
      }
    }
    setActive(active);
  }

  function onScroll(): void {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

document.addEventListener('DOMContentLoaded', () => {
  loadActivity();
  initScrollSpy();
});
