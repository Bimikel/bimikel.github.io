# Visit counter

A tiny Cloudflare Worker that stores the site's visit count and shows it on the home page.

```
visitor opens home page
   → script.js sends POST /hit   (at most once per browser per 30 min)
   → Worker adds 1 in a Durable Object, returns {"views": 1285}
   → page shows "👀 1,285 visits"
```

## Deploy (one time)

1. Make a free account at https://dash.cloudflare.com/sign-up
2. From this `counter/` folder, run:
   ```
   npx wrangler login     # opens a browser to approve
   npx wrangler deploy    # prints your URL, e.g. https://site-counter.<you>.workers.dev
   ```
3. Paste that URL into `COUNTER_URL` near the top of `../script.js`, then commit and push.

## Try it

```
curl https://site-counter.<you>.workers.dev/count
```

## Test locally

```
npx wrangler dev          # Worker on http://localhost:8787
```
Set `COUNTER_URL` to `http://localhost:8787`, serve the site with `python3 -m http.server 8000`,
and open http://localhost:8000. (Don't commit the localhost URL.)

## Notes

- Free plan covers 100,000 requests/day.
- Only https://bimikel.github.io (and localhost:8000) may bump the count. Someone could still fake
  requests with curl; that's an accepted tradeoff for a personal site.
- To change the count by hand (e.g. reset it), use Cloudflare's dashboard or redeploy with a new
  `idFromName("...")` name in `src/index.js`, which starts a fresh counter at 0.
