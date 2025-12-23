# Restaurant Management System

A robust, full-stack restaurant management platform designed for modern dining experiences. This monorepo includes a React (Vite + TypeScript) frontend and an Express/Node.js backend, with PostgreSQL for persistent storage. The system supports menu management, order processing, feedback collection, QR code generation, and is built for resilience with mock/offline data handling.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Overview](#api-overview)
- [Testing & Diagnostics](#testing--diagnostics)
- [Docker & Deployment](#docker--deployment)
- [Development Notes](#development-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Features
- **Modern React Frontend**: Built with Vite, TypeScript, and Tailwind CSS for fast, maintainable UI.
- **Express Backend**: RESTful API with robust error handling and mock data fallbacks.
- **PostgreSQL Database**: Managed via Sequelize ORM, with scripts for setup, seeding, and diagnostics.
- **Menu & Orders**: Full menu CRUD, order creation, and real-time order status.
- **Feedback System**: Collect and manage customer feedback.
- **QR Code Generation**: For table/session management and contactless ordering.
- **Offline/Mock Resilience**: Both frontend and backend provide mock data and short timeouts for DB-down scenarios.
- **Comprehensive Testing**: Integration, diagnostic, and e2e scripts included.
- **Docker & Nginx**: Ready for containerized deployment and reverse proxying.

---

## Architecture

- **Frontend**: React (Vite, TypeScript, Tailwind)
  - Talks to backend via Axios (`src/services/api.js`)
  - Dev server: port 3000
- **Backend**: Express (Node.js)
  - REST API under `/api/*`
  - Dev server: port 5000
  - Sequelize ORM for PostgreSQL
- **Database**: PostgreSQL
- **Proxy**: Nginx (optional, for production)
- **Testing**: Node.js scripts, Jest, Vitest

---

## Project Structure

```
.
├── frontend/                # React app (Vite + TypeScript)
│   └── src/
├── restaurant-backend/      # Express backend (Node.js)
│   └── routes/
│   └── config/
│   └── db/
├── public/                  # Static assets
├── test-scripts/            # Integration and diagnostic scripts
├── Dockerfile, docker-compose.nginx.yml, nginx.conf
├── requirements.txt, package.json, etc.
```

---

## Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- npm
- PostgreSQL
- Docker (optional, for containerized setup)

### 1. Clone the repository
```sh
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 2. Install dependencies
- Frontend:
  ```sh
  cd frontend
  npm install
  ```
- Backend:
  ```sh
  cd ../restaurant-backend
  npm install
  ```

---

## Environment Configuration

- **Frontend**: Uses `REACT_APP_API_URL` to override API base URL (default: `/api`).
- **Backend**: Create `.env` in `restaurant-backend/`:
  ```
  DB_HOST=localhost
  DB_NAME=restaurant_db
  DB_USER=youruser
  DB_PASSWORD=yourpassword
  DB_PORT=5432
  ```

---

## Database Setup

- Run the SQL scripts in `restaurant-backend/db/` to initialize and seed the database:
  ```sh
  cd restaurant-backend/db
  # Example: psql -U youruser -d restaurant_db -f init-database.sql
  # Then seed: psql -U youruser -d restaurant_db -f seed-data-3nf.sql
  ```
- Use provided Node.js scripts for validation and diagnostics:
  ```sh
  node restaurant-backend/check-db-tables.js
  node restaurant-backend/diagnose-startup.js
  ```

---

## Running the Application

### Development
- **Backend**:
  ```sh
  cd restaurant-backend
  npm run dev
  ```
- **Frontend** (in a new terminal):
  ```sh
  cd frontend
  npm run dev
  ```
- The frontend runs on [http://localhost:3000](http://localhost:3000) and proxies API requests to the backend on port 5000.

### Production
- Build frontend:
  ```sh
  cd frontend
  npm run build
  ```
- Serve with Nginx or your preferred web server.

---

## API Overview

- `GET /api/menu` — List menu items
- `GET /api/menu/items/:id` — Get menu item by ID
- `POST /api/orders` — Create order
- `POST /api/feedback` — Submit feedback
- `GET /api/feedback` — List feedback (admin)
- `GET /api/qr/:id` — Generate QR code
- `GET /api/health` — Health check

See `restaurant-backend/routes/` for more endpoints and details.

---

## Testing & Diagnostics

- Test scripts are in `test-scripts/` and `restaurant-backend/test/`.
- Run integration tests:
  ```sh
  node test-scripts/integration-test.js
  ```
- Diagnostic scripts:
  ```sh
  node test-scripts/check-system-status.js
  node restaurant-backend/diagnose-orders.js
  ```
- Frontend tests:
  ```sh
  cd frontend
  npm test
  # or
  npm run test
  ```

---

## Docker & Deployment
- Although deployment scripts are included for future work, the project is currently not deployed as the database is local and does not have a cloud counterpart which can be linked to the docker container.

- Build and run all services with Docker Compose:
  ```sh
  docker-compose -f docker-compose.nginx.yml up --build
  ```
- Nginx is configured to reverse proxy frontend and backend.
- Environment variables can be set in Docker Compose or `.env` files.

---

## Development Notes

- **Mock Data**: Both frontend and backend provide mock data if the database is unreachable (see `src/services/api.js` and backend route fallbacks).
- **Timeouts**: Short timeouts prevent UI/backend hangs if DB is down.
- **CORS**: Backend allows local dev origins; tighten for production.
- **Admin Endpoints**: Some DB endpoints are open in dev, protected in production.
- **QR Codes**: If `qrcode` module is missing, backend returns 501 with install instructions.
- **Scripts**: Use scripts in `test-scripts/` and `restaurant-backend/` for diagnostics, validation, and DB management.

---

## Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/foo`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

[MIT](LICENSE)

---

## Acknowledgements
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Express](https://expressjs.com/)
- [Sequelize](https://sequelize.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker](https://www.docker.com/)
- [Nginx](https://nginx.org/)

---

For questions or support, please open an issue on GitHub.
