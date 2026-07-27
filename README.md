# Game Linktree

Vue 3 + Vite frontend, modular Google Apps Script backend, and Cloudflare Worker-native full proxy.

## Local

```bash
npm install
npm test
npm run build
```

## GAS

Target script ID is kept in local `.clasp.json` (gitignored).

```bash
clasp push
clasp version "release"
clasp deploy --description "release"
```

Set Script Property `ADMIN_KEY` to a random value of at least 16 characters before using `/admin`. Drive Folder ID and Spreadsheet ID are managed in the admin UI and are never emitted into Worker source.

## Cloudflare Worker

```bash
cd worker
npx wrangler secret put GAS_URL
npx wrangler deploy
```

`GAS_URL` is the deployed `/exec` URL. Route the desired custom path to this Worker. Browser RPC stays same-origin at `?<__gas_rpc=1>` (without angle brackets).

## Security

Public reads are allowlisted. Writes require `ADMIN_KEY`, schema/URL validation, a 100 KB payload cap, and a coarse script-wide rate limit. Rotate `ADMIN_KEY` if exposed.
