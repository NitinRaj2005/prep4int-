# Deploy Prep4Int to Render

1. In Render, create or open a Web Service connected to the `main` branch of this repository.
2. Use the repository root as the service root directory.
3. Set the build command to `cd backend && npm install`.
4. Set the start command to `cd backend && node app.js`.
5. Add these environment variables in the Render dashboard:
   - `MONGODB_URI`: your MongoDB connection string. Enter it only in Render's environment settings.
   - `SESSION_SECRET`: a private random value of at least 32 bytes. Generate a unique value for this service.
   - `NODE_ENV`: `production`.
6. Deploy the latest commit and check the Render Events and Logs tabs for a successful start.
7. Open the public URL shown on the Render service page. Test `/`, `/que.html`, and `/rec.html`.

Do not put database credentials, session secrets, or connection strings in this repository. If a credential was committed previously, rotate it in the provider before using it again; deleting it from a later commit does not erase Git history.
