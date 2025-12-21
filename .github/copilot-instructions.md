# Copilot Instructions for this Codebase

These rules help AI coding agents work productively in this project. They reflect current architecture, workflows, and patterns observed in the repo.

## Big Picture
- Monorepo with React frontend (root `src/`) and Express backend (`restaurant-backend/`).
- Frontend talks to backend via Axios services in `src/services/api.js`; default base URL resolves to `window.origin + /api` with CRA `proxy` to port 5000.
- Backend exposes REST endpoints under `/api/*` (menu, orders, feedback, qr, health). Database via Sequelize + Postgres in `restaurant-backend/config/database.js`.
- Offline/DB-down resilience: both frontend and backend provide mock/fallback data and short timeouts.

## Run/Dev Workflow
- Frontend (CRA): in repo root, run `npm start` (or `npm run dev`) to start at port 3000.
- Backend: in `restaurant-backend/`, run `npm run dev` (nodemon) or `npm start` to start at port 5000.
- Proxy: root `package.json` sets `"proxy": "http://localhost:5000"` so `/api/*` requests from the frontend are forwarded to backend in dev.
- Health/test: backend has `GET /api/health`, `GET /api/test`, and `GET /api/menu/test` for smoke checks.

## Environment & Config
- Frontend base URL: `REACT_APP_API_URL` overrides auto base URL in `src/services/api.js`.
- Backend DB: `.env` variables `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` used by Sequelize; SSL enabled with `rejectUnauthorized: false` (dev-friendly).
- CORS: backend `server.js` allows origins `[http://localhost:3000, 5000, 3001, 5173]` and common methods/headers.

## Key Patterns
- Axios client (`src/services/api.js`) with request/response logging and a `timeout: 10000`.
- Frontend dev mocks: on `ERR_NETWORK` in development, `getMockResponse()` returns realistic data (orders, menu).
- Backend route-level fallbacks: `menuRoutes.js` returns cached `mockMenuItems` immediately to prevent hangs when DB is unreachable.
- Defensive SQL via `sequelize.query` with `bind` params; responses shaped for UI (e.g., `items` aggregates, camelCase mapping).
- Admin-only DB endpoints (`restaurant-backend/routes/databaseRoutes.js`) use a simple token check under production; in dev, open.
- QR generation (`restaurant-backend/routes/qrRoutes.js`) uses `qrcode` and returns data URLs; if the module is missing, responds 501 with install instructions.

## Contracts & Examples
- Menu: `GET /api/menu` returns an array of items with `{id, name, description, price, category, image_url, is_available, rating}` (mock or DB-backed). `GET /api/menu/items/:id` returns one item.
- Orders: `POST /api/orders` expects `{customerSessionId, paymentMethod, items: [{menuItemId, quantity, specialInstructions?}]}`. See `orderApi.create()` usage in `src/services/api.js`.
- Feedback: `POST /api/feedback` expects `{orderId, rating, comment?}`; manager views via `GET /api/feedback` with pagination in query.
- Health: `GET /api/health` responds with uptime/status for quick checks.

## Where to Look
- Backend entry: `restaurant-backend/server.js` mounts `/api/menu`, `/api/orders`, `/api/feedback`, `/api/qr`.
- Database config and test: `restaurant-backend/config/database.js`, `restaurant-backend/routes/databaseRoutes.js`.
- Frontend entry: `src/index.js`, app layout in `src/app.js`, customer flows in `src/components/customer/*`.
- API client: `src/services/api.js` (`orderApi`, `menuApi`, `qrApi`, `feedbackApi`, `healthApi`).

## Gotchas
- Duplicate `package.json` exists at repo root and at `src/`; use root for CRA dev scripts.
- Backend uses short timeouts (`setTimeout 5000`) and mock responses to avoid hanging; keep this behavior when adding routes.
- If `qrcode` is not installed, `/api/qr/*` returns 501; `npm install qrcode` resolves.
- In production, tighten auth for `databaseRoutes` and consider CORS origin restrictions.

## Useful Dev Actions
- Add a new endpoint: create a route in `restaurant-backend/routes/*`, mount under `/api/*` in `server.js`, return JSON shaped for existing UI patterns.
- Add a new service call: extend `src/services/api.js` with a method that uses `api.get/post`, align response shape with components.
- Validate DB connectivity quickly with `GET /api/health` and `GET /api/db/test-db` (dev). If DB is down, rely on mock fallbacks.
