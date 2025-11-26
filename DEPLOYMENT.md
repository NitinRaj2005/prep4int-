# Deployment Guide for Prep4Int

## Prerequisites
- Node.js >= 14.0.0
- npm >= 6.0.0
- MongoDB Atlas account (free tier available)
- Git account (GitHub)

---

## Quick Setup (Local Testing)

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Create .env file
cp ../.env.example .env

# Edit .env with your MongoDB URI
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# Run server
npm start
```

Visit: `http://localhost:8000`

---

## Deployment Platforms

### **Option 1: Deploy to Render.com (Recommended - Free)**

1. **Create Render Account**
   - Go to render.com
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New +" → Web Service
   - Select your GitHub repository
   - Name: `prep4int-backend`

3. **Configure Render Settings**
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `node app.js`
   - **Root Directory:** `backend`

4. **Add Environment Variables**
   - Click "Environment" in Render dashboard
   - Add variable:
     - Key: `MONGODB_URI`
     - Value: `mongodb+srv://username:password@cluster.mongodb.net/prep4int`

5. **Deploy**
   - Click "Create Web Service"
   - Render will auto-deploy on every push to main branch

---

### **Option 2: Deploy to Heroku**

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create Heroku App**
   ```bash
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/prep4int"
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **View Logs**
   ```bash
   heroku logs --tail
   ```

---

### **Option 3: Deploy to Railway.app**

1. **Connect GitHub**
   - Go to railway.app
   - Sign in with GitHub
   - Select your repository

2. **Configure**
   - Railway auto-detects Node.js project
   - Add Environment: `MONGODB_URI`

3. **Deploy**
   - Auto-deploys on GitHub push

---

### **Option 4: Deploy to Fly.io**

1. **Install Flyctl**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create App**
   ```bash
   fly apps create your-app-name
   ```

3. **Set Secrets**
   ```bash
   fly secrets set MONGODB_URI="your-mongodb-uri"
   ```

4. **Deploy**
   ```bash
   fly deploy
   ```

---

## Environment Variables

Create a `.env` file in the `backend` folder:

```env
PORT=8000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prep4int
NODE_ENV=production
```

---

## MongoDB Setup (Atlas)

1. **Create Free Account**
   - Go to mongodb.com/cloud/atlas
   - Sign up for free

2. **Create Cluster**
   - Choose Free tier (M0)
   - Select region closest to you

3. **Create Database User**
   - Go to Database Access
   - Add new user (remember username & password)

4. **Get Connection String**
   - Go to Databases
   - Click "Connect"
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<username>`, `<password>`, `<clustername>`

Example:
```
mongodb+srv://nitin:secure-password@cluster0.s2jvkgz.mongodb.net/prep4int?retryWrites=true&w=majority
```

---

## Project Structure for Deployment

```
prep4int-/
├── backend/
│   ├── app.js
│   ├── package.json
│   ├── db/
│   │   └── db/
│   │       └── conn.js
│   ├── models/
│   │   ├── registers.js
│   │   └── contactus.js
│   └── views/
│       ├── register.hbs
│       ├── login.hbs
│       ├── index.hbs
│       └── css/
├── frontend/
│   ├── index.html
│   ├── que.html
│   ├── alltopics.html
│   ├── rec.html
│   ├── prep4int.js
│   ├── css/
│   └── img/
├── .env.example
├── .gitignore
├── Procfile
├── package.json
└── README.md
```

---

## Troubleshooting

### Port Already in Use
```bash
# On Linux/Mac
lsof -i :8000
kill -9 <PID>

# On Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### MongoDB Connection Error
- Check `.env` file has correct `MONGODB_URI`
- Verify IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 for development)
- Check username/password in connection string

### Deployment Issues
- Ensure all dependencies are in `package.json`
- Check logs with `heroku logs --tail` or platform-specific logs
- Verify Node version compatibility (>=14.0.0)

---

## Security Checklist Before Production

- [ ] Never commit `.env` file
- [ ] Use `.gitignore` to exclude sensitive files
- [ ] Hash passwords (add bcrypt package)
- [ ] Validate user input
- [ ] Use HTTPS (automatic on most platforms)
- [ ] Set MongoDB IP whitelist properly
- [ ] Use environment variables for all secrets
- [ ] Enable CORS if frontend is separate domain

---

## Post-Deployment

1. **Test Your App**
   - Visit your deployed URL
   - Test registration/login
   - Test contact form

2. **Monitor Logs**
   - Check platform logs for errors
   - Monitor MongoDB usage

3. **Set Up Custom Domain** (Optional)
   - Add custom domain in platform settings
   - Update DNS records

---

## Support

For issues, check:
- Platform documentation (Render, Heroku, Railway, Fly.io)
- MongoDB Atlas docs
- Express.js documentation
