## Chillers POS

Full-stack POS with inventory and sales. Backend: Express + Prisma (Postgres). Frontend: React + Vite. Ready for Railway.

### Local dev
1. Copy `.env` with `DATABASE_URL` pointing to Postgres.
2. Install: `npm install`
3. Push schema and seed: `npm run db:push && npm run seed`
4. Run dev (server + client): `npm run dev`

### Build
`npm run build`

### Production
Server serves files from `dist`. Start with `npm run railway-start`.

### API
- `GET /api/items` list items
- `POST /api/items/bulk` upsert items
- `POST /api/sales` create sale and decrement inventory
- `GET /api/inventory` view inventory



