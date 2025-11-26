# Frontend Deployment Guide

## Current Architecture

Your app uses a **Combined Full-Stack Deployment** model:

```
┌─────────────────────────────────────────┐
│  Single Node.js Server (Render/Heroku)  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Express Server (Backend)         │  │
│  │  - Handles API routes             │  │
│  │  - Serves static files            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  Frontend Assets (Static)         │  │
│  │  - HTML files (register, login)   │  │
│  │  - CSS stylesheets                │  │
│  │  - JavaScript files               │  │
│  │  - Images                         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Connected to:                          │
│  └─ MongoDB Atlas (Database)            │
└─────────────────────────────────────────┘
```

---

## ✅ Frontend is Already Configured!

Your backend (`app.js`) already serves the frontend:

```javascript
const staticPath = path.join(__dirname, "../frontend");
app.use(express.static(staticPath));  // Serves all static files
```

This means:
- ✅ HTML files are served as static pages
- ✅ CSS is automatically served
- ✅ Images are accessible
- ✅ JavaScript runs in browser
- ✅ **No separate frontend deployment needed!**

---

## How Frontend Works in Your App

### 1. **Server-Rendered Pages** (Handlebars Templates)
Located in: `/backend/views/`

- `register.hbs` → Rendered at `/` (root)
- `login.hbs` → Rendered at `/login`
- `index.hbs` → Rendered at `/index`

These are **server-side rendered** by Express using Handlebars template engine.

### 2. **Static Frontend Files**
Located in: `/frontend/`

- `index.html` - Main page (static HTML)
- `que.html` - Questions page (static HTML)
- `alltopics.html` - Topics page (static HTML)
- `rec.html` - Recommendations page (static HTML)
- `prep4int.js` - Client-side JavaScript
- `css/` - Stylesheets
- `img/` - Images & logos

These are **served as-is** without any processing.

---

## Deployment Options for Your Frontend

### **Option 1: Keep Current Setup (RECOMMENDED)**
**Pros:**
- Simple single deployment
- No CORS issues
- Everything works together
- Easier to maintain

**What happens:**
1. You deploy backend to Render/Heroku
2. Backend automatically serves frontend files
3. Everything is at the same domain
4. Single deployment, single URL

**Cost:** Free (same as backend)

---

### **Option 2: Separate Frontend Deployment**
**Pros:**
- Can use free CDN (Vercel, Netlify)
- Faster static file delivery
- Independent frontend updates

**Cons:**
- Need to handle CORS
- More complex setup
- Two deployments to manage

**How it works:**

```
Frontend (Vercel)          Backend (Render)        Database (MongoDB)
  .com                       .onrender.com            Atlas
  ↓                          ↓                        ↓
index.html    →API calls→  Node.js Server    →  MongoDB
CSS, JS                      Express                 
Images                       Routes
```

---

## Detailed Steps for Current Setup (Keep Everything Together)

### Step 1: Verify Frontend Structure
```bash
# Check frontend files are in place
ls -la frontend/
```

You should see:
```
alltopics.html
prep4int.js
que.html
rec.html
css/
img/
```

### Step 2: Check Backend Configuration
The `app.js` already has:
```javascript
const staticPath = path.join(__dirname, "../frontend");
app.use(express.static(staticPath));
```

### Step 3: Deploy Everything Together
Just follow the regular deployment steps:
```bash
npm run install-all
npm start  # Tests locally
git push origin main  # Push to GitHub
# Then deploy to Render/Heroku (both frontend + backend together)
```

### Step 4: Access Your App
After deployment, visit your URL (e.g., `https://prep4int.onrender.com`):

- `https://prep4int.onrender.com/` → Server-rendered register page
- `https://prep4int.onrender.com/login` → Server-rendered login page
- `https://prep4int.onrender.com/index` → Server-rendered main page
- `https://prep4int.onrender.com/que.html` → Static questions page
- `https://prep4int.onrender.com/alltopics.html` → Static topics page

All CSS and images load from the same domain ✅

---

## If You Want Separate Frontend Deployment (Advanced)

### Deploy Frontend to Vercel (Free)

1. **Prepare frontend folder**
```bash
# Create a separate repository for frontend only
mkdir prep4int-frontend
cd prep4int-frontend
cp -r ../prep4int-/frontend/* .
```

2. **Create `vercel.json` for routing**
```json
{
  "rewrites": [
    {
      "source": "/que.html",
      "destination": "/que.html"
    },
    {
      "source": "/alltopics.html", 
      "destination": "/alltopics.html"
    }
  ]
}
```

3. **Deploy to Vercel**
- Go to vercel.com
- Click "Import Project"
- Select frontend repository
- Deploy

4. **Update backend to accept requests from Vercel**
Add CORS to `backend/app.js`:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://prep4int.vercel.app',
  credentials: true
}));
```

5. **Update API calls in frontend**
Change all API URLs from relative to absolute:
```javascript
// Before (relative)
fetch('/login', {...})

// After (absolute)
fetch('https://prep4int.onrender.com/login', {...})
```

---

## Frontend File Locations & Roles

| File | Type | Location | Served From | Purpose |
|------|------|----------|-------------|---------|
| `register.hbs` | Template | `backend/views/` | Express renders | Registration page |
| `login.hbs` | Template | `backend/views/` | Express renders | Login page |
| `index.hbs` | Template | `backend/views/` | Express renders | Main page |
| `que.html` | Static | `frontend/` | Static file server | Questions page |
| `alltopics.html` | Static | `frontend/` | Static file server | Topics page |
| `rec.html` | Static | `frontend/` | Static file server | Recommendations |
| `prep4int.js` | Script | `frontend/` | Static file server | Client-side logic |
| `css/*.css` | Styles | `frontend/css/` | Static file server | Styling |
| `img/*` | Images | `frontend/img/` | Static file server | Assets |

---

## Testing Frontend Locally

```bash
# Start server
npm start

# Open browser and test:
# - http://localhost:8000/          (register page - server-rendered)
# - http://localhost:8000/login     (login page - server-rendered)
# - http://localhost:8000/index     (main page - server-rendered)
# - http://localhost:8000/que.html  (questions - static)
# - http://localhost:8000/css/      (CSS folder)
# - http://localhost:8000/img/      (Images folder)
```

---

## Troubleshooting Frontend Issues

### CSS/Images Not Loading
**Problem:** 404 errors in browser console for CSS or images

**Solutions:**
1. Verify files exist in `/frontend/` folder:
   ```bash
   ls -la frontend/css/
   ls -la frontend/img/
   ```

2. Check `staticPath` in `app.js`:
   ```javascript
   const staticPath = path.join(__dirname, "../frontend");  // Correct
   ```

3. Check file references in HTML:
   ```html
   <!-- Correct (relative) -->
   <link rel="stylesheet" href="css/style.css">
   <img src="img/logo.png">
   
   <!-- Wrong (absolute) -->
   <link rel="stylesheet" href="/frontend/css/style.css">
   ```

### JavaScript Not Running
**Solutions:**
1. Check file path: `frontend/prep4int.js`
2. Verify script is referenced in HTML
3. Check browser console for errors

### Hbs Pages Not Rendering
**Problem:** Can't access `/` or `/login` or `/index`

**Solutions:**
1. Check `app.js` routes are defined
2. Verify `.hbs` files exist in `backend/views/`
3. Verify `app.set("view engine", "hbs")` is set

---

## Performance Tips

### For Current Setup (Backend Serves Both)
1. **Minify CSS & JavaScript** (optional)
   ```bash
   # Install minifiers
   npm install --save-dev terser cssnano
   ```

2. **Compress images**
   - Use tools like TinyPNG for `.png` files
   - Use ImageOptim for `.jpg` files

3. **Enable caching**
   - Add to `app.js`:
   ```javascript
   app.use(express.static(staticPath, { maxAge: '1d' }));
   ```

### For Separate Frontend Deployment
- Use Vercel/Netlify CDN (automatic)
- Images served from CDN
- Faster loading globally

---

## Summary

### Your Current Setup ✅
- **Frontend location:** `/frontend/` folder
- **Served by:** Express backend
- **Deployment:** Single deployment with backend
- **URL:** All at same domain
- **Status:** Ready to deploy as-is!

### To Deploy
1. Make sure all frontend files are in `/frontend/` folder
2. Deploy backend (which includes frontend)
3. Everything works automatically!

### No Changes Needed!
Your frontend is **already configured for deployment**. Just follow the regular deployment steps in `QUICK_DEPLOY.md` and your frontend will deploy automatically! 🎉

---

## Next Steps

1. ✅ Verify frontend files are in `/frontend/`
2. ✅ Test locally: `npm start`
3. ✅ Deploy to Render/Heroku
4. ✅ Test live app

That's it! No separate frontend deployment needed. Everything deploys together! 🚀
