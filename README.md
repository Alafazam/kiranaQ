# KiranaQ

KiranaQ is a stock-log and reorder app for a small kirana store owner.
The owner takes a photo of the shelf. A vision model lists the items and counts.
The server computes days of cover and a suggested order.

## Parts

- `server/`: Node 22, Express, SQLite. It also serves the web UI.
- `web/`: React, Vite, Tailwind. Builds into `server/public`.
- `shell/`: small Android WebView app that shows the web UI.
- `specs/`: specs for each change.

## Run

```bash
cp .env.example server/.env   # then add your keys
cd server && pnpm install && cd ../web && pnpm install && pnpm build
cd ../server && pnpm start    # http://localhost:3000
```

For web development, run `pnpm dev` in `web/` (port 5173, proxies `/api`).

## Test

```bash
cd server && pnpm test
```

## Android

```bash
cd shell && ./gradlew assembleDebug -PserverUrl=http://10.0.2.2:3000
```

The default `SERVER_URL` is `http://10.0.2.2:3000` (the host from the emulator).
