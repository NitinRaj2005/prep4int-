# Deployment Readiness Checklist

## ✓ Project Preparation (COMPLETED)

- [x] Separated backend and frontend directories
- [x] Updated `app.js` to serve from `/frontend`
- [x] Fixed static path configuration
- [x] Added proper error logging to console output
- [x] Updated all `package.json` files with proper metadata
- [x] Added Node version constraints (>=14.0.0)
- [x] Added `dotenv` support for environment variables
- [x] Secured MongoDB connection with environment variables
- [x] Created `.env.example` template
- [x] Created `.gitignore` to protect secrets
- [x] Updated `Procfile` for Heroku deployment
- [x] Created `render.yaml` for Render deployment
- [x] Added startup script (`setup.sh`)
- [x] Created comprehensive DEPLOYMENT.md guide

---

## ✓ Before You Deploy

### 1. MongoDB Setup
- [ ] Create MongoDB Atlas account (mongodb.com/cloud/atlas)
- [ ] Create free M0 cluster
- [ ] Create database user with username & password
- [ ] Whitelist IP addresses (0.0.0.0/0 for easy access, restrict later)
- [ ] Copy connection string

### 2. Environment Variables
- [ ] Create `.env` file in `backend/` folder:
  ```env
  PORT=8000
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/prep4int
  NODE_ENV=production
  ```
- [ ] Never commit `.env` to git (already in .gitignore)

### 3. Local Testing
- [ ] Run: `npm run install-all`
- [ ] Run: `npm start`
- [ ] Test at: `http://localhost:8000`
- [ ] Test registration page
- [ ] Test login page
- [ ] Test contact form
- [ ] Check MongoDB is storing data

### 4. Code Quality
- [ ] No hardcoded credentials in code
- [ ] No `console.log()` debugging statements (optional cleanup)
- [ ] All `require()` paths are correct
- [ ] No missing dependencies in `package.json`

### 5. Git Repository
- [ ] All changes committed
- [ ] Run: `git status` (should be clean)
- [ ] `.env` is not staged/committed
- [ ] `.env.example` is committed

---

## 🚀 Choose Your Deployment Platform

### Option A: Render.com (Recommended for Beginners)
**Pros:** Free, Easy GitHub integration, Auto-deploy on push
**Cons:** Requires always-on dyno for production

**Steps:**
1. Go to render.com
2. Sign in with GitHub
3. Click "New +" → "Web Service"
4. Select your repository
5. Build Command: `cd backend && npm install`
6. Start Command: `cd backend && node app.js`
7. Add environment variable: `MONGODB_URI`
8. Click "Create Web Service"

**Post-Deploy:**
- [ ] Test your deployed URL
- [ ] Check logs in Render dashboard
- [ ] Enable auto-deployments (optional)

---

### Option B: Heroku (Classic, Still Free for Learning)
**Note:** Heroku removed free tier in 2022, but still offers paid options starting at $7/month

**Steps:**
```bash
npm install -g heroku
heroku login
heroku create your-app-name
heroku config:set MONGODB_URI="your-mongodb-uri"
git push heroku main
heroku logs --tail
```

---

### Option C: Railway.app (Modern Alternative)
**Pros:** Simple setup, $5 free credit/month
**Cons:** Credit-based billing

**Steps:**
1. Go to railway.app
2. Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add `MONGODB_URI` environment variable
6. Deploy

---

### Option D: Fly.io (Fast, Global)
**Pros:** Fast deployment, free tier available
**Cons:** Slightly steeper learning curve

**Steps:**
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
fly apps create your-app-name
fly secrets set MONGODB_URI="your-mongodb-uri"
fly deploy
```

---

## 📋 Post-Deployment Checklist

- [ ] Application starts without errors
- [ ] Can access home page (register.hbs)
- [ ] Registration form works and saves to MongoDB
- [ ] Login functionality works
- [ ] Contact us form saves messages to MongoDB
- [ ] Frontend assets (CSS, images) load correctly
- [ ] No 404 errors in browser console
- [ ] Database connection successful (check logs)

---

## 🔐 Security After Deployment

- [ ] MongoDB IP whitelist is configured properly (not 0.0.0.0/0 in production)
- [ ] Environment variables are set in deployment platform
- [ ] `.env` file is NOT committed to git
- [ ] Consider adding bcrypt for password hashing (future enhancement)
- [ ] Set up SSL/HTTPS (automatic on most platforms)
- [ ] Enable CORS only for your domain if needed

---

## 📊 Monitoring & Maintenance

### Regular Checks
- [ ] Monitor application logs
- [ ] Check MongoDB usage/quota
- [ ] Monitor error rates
- [ ] Test critical user flows monthly

### Future Improvements
- [ ] Add password hashing with bcrypt
- [ ] Implement proper error handling & custom error pages
- [ ] Add input validation with joi/yup
- [ ] Add JWT authentication
- [ ] Create admin dashboard
- [ ] Add email verification for registration
- [ ] Implement rate limiting

---

## 🆘 Common Issues & Solutions

### "Cannot find module 'express'"
**Solution:** Run `cd backend && npm install`

### "MongoDB connection failed"
**Solution:** 
1. Check MONGODB_URI in .env
2. Verify IP whitelist in MongoDB Atlas
3. Ensure database user credentials are correct

### "Port 8000 already in use"
**Solution:**
```bash
# Find and kill process
lsof -i :8000
kill -9 <PID>
```

### "Static files not found (CSS, images)"
**Solution:** Ensure `staticPath` in app.js points to `/frontend` directory

### Build fails on Render/Heroku
**Solution:**
1. Check `Procfile` syntax
2. Ensure `package.json` has correct start script
3. Check logs for missing dependencies

---

## 📞 Support Resources

- **Render.com Docs:** render.com/docs
- **Heroku Docs:** devcenter.heroku.com
- **MongoDB Atlas:** docs.atlas.mongodb.com
- **Express.js:** expressjs.com
- **Node.js:** nodejs.org/docs

---

## ✨ You're Ready to Deploy!

Once you complete the checklist above, your application is ready for production. Good luck! 🚀
