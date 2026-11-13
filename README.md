# MaziwaTrack

A milk collection and payment management system for dairy cooperatives in Kenya.

Built with **React 19 + Vite** (frontend) and **Express 5 + PostgreSQL** (backend).

---

## Getting Started

### Prerequisites
- Node.js ≥ 20.19
- A PostgreSQL database (Supabase recommended)

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd Maziwa_Track_IS

# 2. Create your environment file
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET in .env

# 3. Install dependencies
npm install

# 4. Set up the database
# Run db/schema.sql in your Supabase SQL Editor

# 5. Start the API server
npm run server

# 6. Start the frontend (separate terminal)
npm run dev
```

The API runs at `http://localhost:5000` and the frontend at `http://localhost:5173`.

---

## User Roles

| Role | What they can do |
|---|---|
| `farmer` | Record milk deliveries, view own delivery history |
| `grader` | View incoming deliveries, record quality test results |
| `admin` | View all batches, approve payments, generate reports, view audit logs |

---

## Documentation

| Resource | Link |
|---|---|
| 📖 **Interactive API Docs (Swagger UI)** | [https://cs-star-korir.github.io/Maziwa_Track_IS/api-docs](https://cs-star-korir.github.io/Maziwa_Track_IS/api-docs) |
| 📄 **OpenAPI Spec** | [docs/openapi.yaml](docs/openapi.yaml) |
| 🗄️ **Database Reference** | [docs/database.md](docs/database.md) |
| 🖼️ **ER Diagram** | [docs/er-diagram.png](docs/er-diagram.png) |

---

## Project Structure

```
├── server/          # Express API
│   ├── routes/      # auth, batches, payments, reports, config, health, audit
│   ├── app.js       # middleware and route mounting
│   ├── db.js        # PostgreSQL connection pool
│   └── index.js     # server entry point
├── src/             # React frontend
│   ├── components/
│   ├── pages/
│   └── services/
├── db/              # SQL schema and seed files
└── docs/            # Database reference and ER diagram
```
