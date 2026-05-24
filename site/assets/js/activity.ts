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

// ── Main ───────────────────────────────────────────────────────────────────────
async function loadActivity(): Promise<void> {
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

document.addEventListener('DOMContentLoaded', loadActivity);
