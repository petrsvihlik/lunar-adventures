# Lunar Adventures — notes for Claude

A static PWA hosted on GitHub Pages. The default branch is `main`; pushes to
`main` auto-deploy to Pages.

## Service worker — bump the cache when shipping changes

`sw.js` uses a cache-first fetch handler keyed by a version string at the top
of the file:

```js
const CACHE = 'lunar-adventures-vN';
```

Old caches are only purged when this name changes (the `activate` handler
deletes any cache key that doesn't match the current `CACHE`). If you ship
a change to any file in the `FILES` precache list (HTML, CSS, JS, icons,
manifest) without bumping `CACHE`, installed PWAs and tabs with an active
service worker will keep serving the stale version indefinitely.

**Rule:** any commit that modifies a precached file must also bump `CACHE`
to the next version (`v2` -> `v3` -> ...). When you add a new file that
should be precached, add it to `FILES` and bump `CACHE` in the same commit.

Files outside `FILES` are still cached opportunistically by the runtime
fetch handler, so when in doubt, bump.
