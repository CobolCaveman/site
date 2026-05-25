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
          ${r.stars > 0 ? `<span class="badge"><span class="badge-glyph">★</span>${r.stars}</span>` : ''}
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
          ${p.reactions > 0 ? `<span class="badge"><span class="badge-glyph">♥</span>${p.reactions}</span>` : ''}
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
        <div class="play-btn" aria-hidden="true"></div>
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

// ── Late cave night: WebGL fire (bottom) + starfield (top) ─────────────────────
// Raw WebGL, no library. One fullscreen triangle, one fragment shader (FBM flame
// + procedural stars), one rAF loop. Desktop only, skipped under reduced motion,
// and paused when the tab is hidden — keeps it cheap.
const FIRE_FS = `
precision mediump float;
uniform float time;
uniform vec2  res;

float rand(vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
float noise(vec2 p){
  vec2 ip = floor(p); vec2 u = fract(p); u = u*u*(3.0-2.0*u);
  float r = mix(mix(rand(ip),            rand(ip+vec2(1.0,0.0)), u.x),
                mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
  return r*r;
}
float fbm(vec2 x){
  float v = 0.0; float a = 0.5; vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++){ v += a*noise(x); x = rot*x*2.0 + shift; a *= 0.5; }
  return v;
}

float hash11(float n){ return fract(sin(n) * 43758.5453); }

// One shooting star per ~4s window: random launch time (so spacing feels ~3-5s),
// random start x and direction, a bright head with a fading tail.
vec3 shootingStar(vec2 uv, float t){
  float period = 4.0;
  float idx = floor(t / period);
  float lt  = fract(t / period);
  float r1 = hash11(idx * 1.73);
  float r2 = hash11(idx * 3.31 + 2.0);
  float r3 = hash11(idx * 5.91 + 7.0);
  float startT = 0.20 + r1 * 0.25;          // launch moment within the window
  float prog = (lt - startT) / 0.16;        // flight ~0.64s
  if (prog < 0.0 || prog > 1.0) return vec3(0.0);
  vec2 start = vec2(0.05 + r2 * 0.55, 0.92);
  vec2 dir   = normalize(vec2(0.45 + r3 * 0.5, -0.55 - r2 * 0.25));
  vec2 pos   = start + dir * prog * 0.8;
  vec2 d = uv - pos;
  float along = dot(d, -dir);
  float perp  = length(d + dir * along);
  float head  = smoothstep(0.010, 0.0, length(d));
  float tail  = smoothstep(0.0035, 0.0, perp) * smoothstep(0.14, 0.0, along) * step(0.0, along);
  float bright = max(head, tail * 0.75);
  bright *= smoothstep(0.0, 0.12, prog) * smoothstep(1.0, 0.65, prog);  // fade in/out
  bright *= smoothstep(0.22, 0.55, uv.y);                              // upper sky only
  return vec3(1.0, 0.96, 0.85) * bright;
}

void main(){
  vec2 uv = gl_FragCoord.xy / res;   // 0..1, y up
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  // --- fire, anchored to the bottom, scrolling upward ---
  vec2 p = vec2(uv.x * 3.0, uv.y * 4.0);
  float n = fbm(p + vec2(0.0, -time * 0.6) + fbm(p));
  float flame = pow(smoothstep(0.5, 0.0, uv.y) * n, 1.25);
  vec3 ember = vec3(0.40, 0.09, 0.0);
  vec3 fire  = vec3(0.95, 0.35, 0.05);
  vec3 gold  = vec3(1.00, 0.72, 0.28);
  vec3 fcol = mix(ember, fire, smoothstep(0.0, 0.40, flame));
  fcol = mix(fcol, gold, smoothstep(0.45, 0.95, flame));
  float glow = smoothstep(0.85, 0.0, uv.y) * 0.18;   // soft bloom-ish lift
  col += fcol * flame + fire * glow;
  alpha = clamp(flame + glow * 0.7, 0.0, 1.0);

  // --- stars: each twinkles on its own phase + speed, dimming but never vanishing ---
  vec2 gp = uv * vec2(55.0, 80.0);
  vec2 gi = floor(gp);
  float rr = rand(gi);
  if (rr > 0.955) {
    vec2 gf = fract(gp) - 0.5;
    float ph  = rand(gi + 13.1) * 6.2831;          // independent phase (full circle)
    float spd = 1.0 + rand(gi + 4.7) * 1.6;        // varied twinkle speed
    float tw  = 0.62 + 0.38 * sin(time * spd + ph); // floor 0.24 — shimmers, never off
    float s = smoothstep(0.13, 0.0, length(gf)) * tw * smoothstep(0.22, 0.70, uv.y);
    col += vec3(1.0, 0.95, 0.85) * s;
    alpha = max(alpha, s);
  }

  // --- shooting star ---
  vec3 ss = shootingStar(uv, time);
  col += ss;
  alpha = max(alpha, max(ss.r, max(ss.g, ss.b)));

  gl_FragColor = vec4(col, alpha);
}`;

function initFire(): void {
  const canvas = document.querySelector('.fire-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  if (!window.matchMedia('(min-width: 900px)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return;

  const compile = (type: number, src: string): WebGLShader | null => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };

  const vs = compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}');
  const fs = compile(gl.FRAGMENT_SHADER, FIRE_FS);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'time');
  const uRes  = gl.getUniformLocation(prog, 'res');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const t0 = performance.now();
  let raf = 0;
  const frame = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (w && h && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, (performance.now() - t0) * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  const start = (): void => { if (!raf) raf = requestAnimationFrame(frame); };
  const stop  = (): void => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
}

document.addEventListener('DOMContentLoaded', () => {
  loadActivity();
  initScrollSpy();
  initFire();
});
