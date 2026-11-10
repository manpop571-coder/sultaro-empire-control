# SULTARO Telegram dashboard

Static, responsive Telegram Mini App for the Days of Empire bot. It uses plain HTML, CSS and JavaScript and needs no build step or Node dependencies. Publish **only this directory** to the public GitHub Pages repository.

## Public configuration

Set `window.SULTARO_CONFIG` in `config.js`:

```js
window.SULTARO_CONFIG = Object.freeze({
  apiBaseUrl: 'https://your-api-host.example',
  botUsername: 'YourSultaroBot',
  supportUrl: 'https://t.me/sultaro'
});
```

The API URL and bot username are public values. **Never put the BotFather token, database credentials, sessions or game account data in this directory.** GitHub Pages hosts the page; the authenticated Python API runs separately over HTTPS. Configure its allowed origin to the GitHub Pages origin, such as `https://your-name.github.io` (no trailing slash or repository path). Register the full Pages URL as the bot's Mini App/menu-button URL.

The frontend sends Telegram's signed `Telegram.WebApp.initData` in the `Authorization: tma ...` header. The server validates it and restricts every request to that Telegram user's farms. `initDataUnsafe` is never used for identity. The page cannot load private dashboard data outside Telegram. Game passwords are masked, cleared after submission, and never saved in browser storage. Existing passwords are not returned or displayed.

## Pages and controls

- Overview: own Telegram ID, farms, progress, concurrency and function failures.
- My farms: view farms assigned by the operator, edit ONE MT credentials, enable farms and capture sessions. Customers cannot create or delete farms.
- Functions: all 21 tasks, filters, execution order, mutually exclusive castle/resource upgrades; castle target, cart speedups, merchant and pet settings.
- Farm settings: gathering (six marches), seven research fields, fountain resource and selected hero XP upgrades.
- Run & logs: farm range, workers, start gap, single/repeated cycles, cycle gap, start, safe stop and recent activity.

Edits lock while a job runs, while navigation and scrolling stay available. Status refreshes every eight seconds while the page is visible. Mutations are not automatically retried. Versioned farm/preference saves surface conflicts for the user to reload instead of overwriting another edit.

## Languages

The native language selector supports Traditional Chinese, Simplified Chinese, English, Indonesian, French, German, Thai, Portuguese, Spanish, Turkish, Italian, Russian, Vietnamese, Japanese, Korean and Arabic. Authenticated changes use `PATCH /api/me` with `{locale: code}`; the same saved locale is used by the Telegram bot. Arabic switches the page to RTL while account addresses, passwords and numeric identifiers retain LTR display. User names and email values are never translated.

`locales.js` is the complete compiled public text catalog. `i18n.js` translates fixed interface copy, placeholders, status events and API errors. Translation generation is a development-only operation (`compile_locales.py`); no translation request occurs in the user's browser. The initial translations were generated from public interface strings, with manual Arabic terminology/copy overrides in `locale-overrides.json`. All 16 catalogs are checked for completeness and matching placeholders.

Public deployment files are `index.html`, `config.js`, `ui.js`, `i18n.js`, `locales.js`, `app.js`, `style.css`, and `mark.svg`. Intermediate `locale-*.json`, test files and the translation build script are development assets, not required by GitHub Pages. Public config is loaded with a per-page cache-busting query so a restarted API tunnel does not keep an old address in a cached script.

## Preview and checks

Open `index.html?preview=1` through any local HTTP server to view a clearly marked **read-only preview**. Add `&lang=ar` (or any supported code) for localized previews. Its example farms use reserved `example.test` addresses. Preview data remains local; it never calls the API, even if opened inside Telegram. Opening the normal URL without Telegram shows the connection screen instead.

```powershell
node --check telegram_web/app.js
node telegram_web/test-ui.js
python -m http.server 8099 --directory telegram_web
```

Then browse `http://localhost:8099/?preview=1`. For local development only, an HTTP API URL is accepted when both the page and API use localhost/127.0.0.1. Public deployments require HTTPS. The optional Google font has system-font fallbacks. The official Telegram bridge script is the only required third-party integration.

## API contract

Every endpoint returns `{ "ok": true, "data": ... }`, or `{ "ok": false, "error": { "code": "...", "message": "..." } }`. See `empire_headless/telegram_api.py` for the complete contract. Frontend calls are under `/api/`: `me`, `catalog`, `farms`, `functions`, `settings`, `status`, `logs`, `run`, `stop`, and farm-specific `preferences`/`capture` routes.

This folder contains no server secret, user export, database, game session or production fixture. The preview is presentation-only and must not be used as an authentication mechanism.
