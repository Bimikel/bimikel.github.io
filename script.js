// Shared behavior for every page: analytics, visit counter, dark mode, nav highlighting.
// Loaded in <head> so the theme is set before the page paints (no light-mode flash).

// ---- Visitor tracking (Google Analytics) ----
// Lives here so every page that loads script.js is counted.
// Skipped on localhost so your own testing doesn't inflate the numbers.
(function () {
    const GA_ID = 'G-DQSFRR6M8D';
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === 'file:') return;

    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(tag);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
})();

// ---- Visit counter (shown on the home page) ----
// Talks to the Cloudflare Worker in counter/. Paste its URL here after deploying,
// e.g. 'https://site-counter.yourname.workers.dev'. Empty = counter stays hidden.
const COUNTER_URL = 'https://site-counter.bimikel.workers.dev';

document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('visitCount');
    if (!el || !COUNTER_URL) return;

    // Count one "visit" per browser per 30 minutes, so refreshing or
    // clicking around the site doesn't inflate the number.
    const WINDOW_MS = 30 * 60 * 1000;
    let last = 0;
    try { last = Number(localStorage.getItem('visitCountedAt')) || 0; } catch (e) {}
    const isNewVisit = Date.now() - last > WINDOW_MS;

    // Testing on your own computer only reads the count, unless you're
    // also running the Worker locally (npx wrangler dev).
    const isLocal = function (host) { return /^(localhost|127\.0\.0\.1)$/.test(host); };
    const testingLocally = isLocal(location.hostname) && !isLocal(new URL(COUNTER_URL).hostname);
    const shouldCount = isNewVisit && !testingLocally;

    fetch(COUNTER_URL + (shouldCount ? '/hit' : '/count'), {
        method: shouldCount ? 'POST' : 'GET',
        signal: AbortSignal.timeout(4000),
    })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function (data) {
            if (shouldCount) {
                try { localStorage.setItem('visitCountedAt', String(Date.now())); } catch (e) {}
            }
            el.textContent = '👀 ' + data.views.toLocaleString('en-US') + ' visits';
            el.hidden = false;
        })
        .catch(function () {
            // Blocked or offline: leave the counter hidden rather than show something broken.
        });
});

(function () {
    const root = document.documentElement;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // ---- Theme ----

    // localStorage can throw (private windows, blocked storage), so wrap it.
    function savedTheme() {
        try {
            const t = localStorage.getItem('theme');
            return t === 'light' || t === 'dark' ? t : null;
        } catch (e) {
            return null;
        }
    }

    // A theme the visitor picked wins; otherwise follow their system setting.
    root.setAttribute('data-theme', savedTheme() || (darkQuery.matches ? 'dark' : 'light'));

    // If the system setting changes and the visitor never picked a theme, follow it.
    darkQuery.addEventListener('change', function (e) {
        if (!savedTheme()) {
            root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });

    function toggleTheme() {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
    }

    // ---- Navigation ----

    // Which top-level section a path belongs to. Checks path segments
    // (not just the start) so it also works when opened from a local folder.
    const SECTIONS = ['resume', 'courses', 'favorites', 'blog'];
    function sectionOf(path) {
        const parts = path.split('/');
        return SECTIONS.find(function (s) { return parts.includes(s); }) || 'home';
    }

    // "/resume/index.html", "/resume/" and "/resume" all mean the same page.
    function normalize(path) {
        return path.replace(/index\.html$/, '').replace(/\/$/, '');
    }

    document.addEventListener('DOMContentLoaded', function () {
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.addEventListener('click', toggleTheme);

        const currentSection = sectionOf(location.pathname);
        const currentPage = normalize(location.pathname);

        document.querySelectorAll('.navis a').forEach(function (link) {
            // link.pathname is the fully resolved path, so "../resume" and "/resume" both work.
            link.classList.toggle('active', sectionOf(link.pathname) === currentSection);

            // Clicking the link for the page you're already on scrolls to the top
            // instead of reloading. (Blog stays a real link on a blog post page.)
            link.addEventListener('click', function (e) {
                if (normalize(link.pathname) === currentPage) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    });
})();
