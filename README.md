# Prep4Int – Interview Preparation Portal

Prep4Int is a full-stack interview-preparation website with account registration and login, DSA topic pages, and a contact form.

## Tech stack

- Backend: Node.js 18+, Express, Handlebars
- Database: MongoDB with Mongoose
- Frontend: HTML, CSS, JavaScript

## Run locally

1. Install the backend dependencies:

   ```powershell
   cd backend
   npm install
   ```

2. Create `backend/.env` using the root `.env.example` as a template, set `MONGODB_URI` to a reachable MongoDB database, and use `NODE_ENV=development` for local work. In development, the server generates a temporary session secret if `SESSION_SECRET` is not set; set a stable random secret if you need sessions to survive restarts.

3. Start the server from the project root:

   ```bash
   # PowerShell
   $env:NODE_ENV = "development"
   npm run dev
   ```

4. Visit [http://localhost:8000](http://localhost:8000).

Production deployments must set both `MONGODB_URI` and a strong, private `SESSION_SECRET`. The session cookie is HTTP-only and uses the secure flag in production.

## Account and form safeguards

- New passwords are stored as bcrypt hashes; existing plaintext passwords are upgraded to hashes when the account next logs in successfully.
- Email and username values are normalized, checked for duplicates, and protected by unique database indexes.
- Registration, login, and contact form inputs are validated on the server. Login and registration attempts are rate-limited.
- Logged-in users can mark DSA questions solved; their progress is stored on their account and restored when they return to the question page.
