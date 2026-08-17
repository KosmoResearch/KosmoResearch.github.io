# Kosmo Research Project Pages

Purely static project pages for:

- `/GeoWeaver/`
- `/UniQuery4R/`

No build step or server runtime is required.

## Local preview

Run this command from the repository root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, select the default
branch, and use `/ (root)` as the publishing directory.

## Cloudflare Pages

Connect the repository and use:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`

The two project pages use relative asset URLs, so they work under both a custom
domain and GitHub Pages subpaths.

## Publication safety

Manuscript formats and supplementary-only directories are excluded by
`.gitignore`. Before every push, confirm that the staged file list contains no
paper source or PDF:

```bash
git status --short
```
