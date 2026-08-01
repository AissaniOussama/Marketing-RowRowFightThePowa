// Same-origin by default: works out of the box when the Express backend
// serves this folder (docker-compose). If you host this folder separately
// (e.g. GitHub Pages) and run the backend elsewhere, point this at it —
// otherwise the app quietly falls back to local-only (per-browser) profiles.
window.LERNSPRINT_API_BASE = '';
