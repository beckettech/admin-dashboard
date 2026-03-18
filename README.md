# FastFlow Admin Dashboard

Admin dashboard for FastFlow - manage leads, demos, and customers.

## Setup

### 1. Create Vercel Postgres Database

```bash
vercel postgres create fastflow-db
vercel postgres connect fastflow-db
```

### 2. Run Schema

Connect to your database and run the SQL in `src/lib/db/schema.sql`, or:

```bash
vercel postgres query fastflow-db < src/lib/db/schema.sql
```

### 3. Set Environment Variables

In Vercel dashboard or via CLI:

```bash
vercel env add ADMIN_PASSWORD
# Enter a secure password

vercel env add ADMIN_JWT_SECRET
# Enter a random 32+ char string

vercel env add DISCORD_WEBHOOK_DEMO_VIEWS
# Your Discord webhook URL (optional, for notifications)
```

### 4. Deploy

```bash
vercel --prod
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ADMIN_PASSWORD` | Password for admin login | Yes |
| `ADMIN_JWT_SECRET` | Secret for JWT signing | Yes |
| `DISCORD_WEBHOOK_DEMO_VIEWS` | Discord webhook for demo view notifications | No |
| `IP_HASH_SALT` | Salt for hashing IP addresses | No |
| `POSTGRES_*` | Auto-added by Vercel Postgres | Yes |

## Features

- **Dashboard** - Overview stats and metrics
- **Leads** - Full CRUD for lead management
- **Demos** - Track demo views with analytics
- **Customers** - Synced from Stripe

## API Endpoints

### Auth
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check auth status

### Demos
- `POST /api/demo/track` - Log a demo view
- `GET /api/demos` - List demo views
- `GET /api/demos?stats=true` - Get demo stats

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads?stats=true` - Get lead stats
- `GET /api/leads/:id` - Get single lead
- `PATCH /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Customers
- `GET /api/customers` - List customers

## Development

```bash
npm run dev
```

Open http://localhost:3000
