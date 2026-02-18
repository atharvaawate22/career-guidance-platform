# Backend Setup Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Environment Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure the following variables:
   - `DB_PASSWORD`: Your PostgreSQL password
   - `JWT_SECRET`: A secure random string (minimum 32 characters)
   - `ADMIN_EMAIL`: Email for the initial admin user (optional)
   - `ADMIN_PASSWORD`: Password for the initial admin user (optional)
   - Other optional services (Google Calendar, Email)

## Database Setup

### Option 1: Using provided SQL scripts (Recommended)

1. Create the database:

   ```bash
   psql -U postgres
   CREATE DATABASE career_guidance;
   \q
   ```

2. Run the schema creation script:

   ```bash
   psql -U postgres -d career_guidance -f src/config/schema.sql
   ```

3. (Optional) Load sample data:
   ```bash
   psql -U postgres -d career_guidance -f src/config/seed.sql
   ```

### Option 2: Automatic initialization

The application will automatically create tables on startup if they don't exist. However, using the SQL scripts is recommended for production.

## Installation

```bash
npm install
```

## Running the Server

### Development mode (with hot reload):

```bash
npm run dev
```

### Production mode:

```bash
npm run build
npm start
```

## Admin User Creation

### During Server Startup

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file. The server will create this admin user automatically on first startup if it doesn't exist.

### Manual Creation

You can also create admin users directly in the database:

```sql
INSERT INTO admin_users (email, password_hash, role)
VALUES (
  'your_email@example.com',
  -- Generate hash using bcrypt with cost factor 10
  'your_bcrypt_hashed_password',
  'admin'
);
```

## API Documentation

The API runs on `http://localhost:5000` by default.

Main endpoints:

- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/updates` - Get all updates
- `GET /api/cutoffs` - Get cutoff data (with filters)
- `POST /api/predict` - Predict college options
- `GET /api/guides` - Get available guides
- `POST /api/guides/download` - Download a guide
- `POST /api/bookings` - Create a booking
- `POST /api/admin/login` - Admin login

Protected admin endpoints (require JWT):

- `POST /api/admin/updates` - Create update
- `POST /api/admin/cutoffs` - Bulk insert cutoffs
- `POST /api/admin/guides` - Create guide

## Testing

### TypeScript Type Checking

```bash
npx tsc --noEmit
```

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # Database connection
│   │   ├── schema.sql       # Database schema
│   │   └── seed.sql         # Sample data
│   ├── middleware/
│   │   ├── authMiddleware.ts
│   │   └── errorHandler.ts
│   ├── modules/
│   │   ├── auth/            # Authentication module
│   │   ├── booking/         # Booking management
│   │   ├── cutoffs/         # Cutoff data
│   │   ├── guides/          # Guide downloads
│   │   ├── predictor/       # College predictor
│   │   └── updates/         # CET updates
│   ├── utils/
│   │   └── logger.ts        # Logging utility
│   └── server.ts            # Application entry point
├── scripts/                 # Utility scripts
├── .env.example            # Environment template
├── package.json
└── tsconfig.json
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check database exists: `psql -U postgres -l`
- Verify credentials in `.env`

### Admin Login Issues

- Ensure JWT_SECRET is set in `.env`
- Verify admin user exists in database
- Check password hashing (bcrypt with cost factor 10)

### Port Already in Use

Change the `PORT` variable in `.env` to use a different port.

## Security Notes

- Never commit `.env` file to version control
- Use strong JWT secrets (minimum 32 random characters)
- Use strong admin passwords
- Enable HTTPS in production
- Keep dependencies updated
