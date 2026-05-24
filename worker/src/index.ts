export interface Env {
  YOUTUBE_API_KEY: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const GITHUB_USER    = 'CobolCaveman';
const DEVTO_USER     = 'cobolcaveman';
const YOUTUBE_HANDLE = 'CobolCaveman';
const CACHE_TTL      = 60 * 30; // 30 minutes

const ALLOWED_ORIGINS = [
  'https://cobolcaveman.com',
  'https://www.cobolcaveman.com',
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface GithubRepo {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  pushed_at: string;
  topics: string[];
}

interface DevtoPost {
  title: string;
  url: string;
  published_at: string;
  tags: string[];
  reactions: number;
  cover_image: string | null;
  reading_time_minutes: number;
}

interface YoutubeVideo {
  title: string;
  url: string;
  thumbnail: string;
  published_at: string;
  video_id: string;
}

interface ActivityResponse {
  github: GithubRepo[];
  devto: DevtoPost[];
  youtube: YoutubeVideo[];
  fetched_at: string;
}

// ── Fetchers ───────────────────────────────────────────────────────────────────
async function fetchGithub(): Promise<GithubRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=9&type=public`,
      {
        headers: {
          'User-Agent': `${GITHUB_USER}-site/1.0`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (!res.ok) return [];
    const repos = await res.json() as any[];
    return repos
      .filter((r: any) => !r.fork)
      .slice(0, 6)
      .map((r: any) => ({
        name:        r.name,
        description: r.description ?? null,
        url:         r.html_url,
        stars:       r.stargazers_count ?? 0,
        language:    r.language ?? null,
        pushed_at:   r.pushed_at,
        topics:      r.topics ?? [],
      }));
  } catch {
    return [];
  }
}

async function fetchDevto(): Promise<DevtoPost[]> {
  try {
    const res = await fetch(
      `https://dev.to/api/articles?username=${DEVTO_USER}&per_page=6`
    );
    if (!res.ok) return [];
    const articles = await res.json() as any[];
    return articles.map((a: any) => ({
      title:                a.title,
      url:                  a.url,
      published_at:         a.published_at,
      tags:                 a.tag_list ?? [],
      reactions:            a.positive_reactions_count ?? 0,
      cover_image:          a.cover_image ?? null,
      reading_time_minutes: a.reading_time_minutes ?? 1,
    }));
  } catch {
    return [];
  }
}

async function fetchYoutube(apiKey: string): Promise<YoutubeVideo[]> {
  if (!apiKey) return [];
  try {
    // Step 1: resolve uploads playlist from channel handle
    const chanRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${YOUTUBE_HANDLE}&key=${apiKey}`
    );
    if (!chanRes.ok) return [];
    const chanData = await chanRes.json() as any;
    const uploadsId: string | undefined =
      chanData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return [];

    // Step 2: fetch recent uploads
    const vidRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=4&key=${apiKey}`
    );
    if (!vidRes.ok) return [];
    const vidData = await vidRes.json() as any;

    return (vidData?.items ?? []).map((item: any) => {
      const s       = item.snippet ?? {};
      const videoId = s.resourceId?.videoId ?? '';
      return {
        title:        s.title ?? '',
        url:          `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail:    s.thumbnails?.medium?.url ?? s.thumbnails?.default?.url ?? '',
        published_at: s.publishedAt ?? '',
        video_id:     videoId,
      };
    });
  } catch {
    return [];
  }
}

// ── CORS helper ────────────────────────────────────────────────────────────────
function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary':                         'Origin',
  };
}

// ── Handler ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') ?? ALLOWED_ORIGINS[0];

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname !== '/api/activity') {
      return new Response('Not found', { status: 404 });
    }

    // Check Cloudflare Cache API
    const cache    = caches.default;
    const cacheKey = new Request(url.toString());
    const cached   = await cache.match(cacheKey);
    if (cached) {
      const r = new Response(cached.body, cached);
      r.headers.set('X-Cache', 'HIT');
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => r.headers.set(k, v));
      return r;
    }

    // Fetch all sources in parallel — one failure won't break the rest
    const [github, devto, youtube] = await Promise.all([
      fetchGithub(),
      fetchDevto(),
      fetchYoutube(env.YOUTUBE_API_KEY),
    ]);

    const body: ActivityResponse = {
      github,
      devto,
      youtube,
      fetched_at: new Date().toISOString(),
    };

    const response = new Response(JSON.stringify(body), {
      status:  200,
      headers: {
        ...corsHeaders(origin),
        'Content-Type':  'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
        'X-Cache':       'MISS',
      },
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
