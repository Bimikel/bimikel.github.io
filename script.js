// Shared behavior for every page: dark mode + nav highlighting.
// Loaded in <head> so the theme is set before the page paints (no light-mode flash).

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
