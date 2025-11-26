# 🚀 Render Deployment Instructions for PrepInt

## Your Deployment Details

- **App Name:** prepint
- **Repository:** https://github.com/NitinRaj2005/prep4int-
- **Branch:** main
- **MongoDB URI:** Ready (will be set as environment variable)

---

## Step-by-Step Deployment to Render

### 1. Go to Render Dashboard
**URL:** https://render.com

### 2. Sign In with GitHub
- Click "Sign up" or "Login"
- Choose "GitHub"
- Authorize Render access to your GitHub

### 3. Create New Web Service
- Click **"New +"** button
- Select **"Web Service"**

### 4. Connect Your Repository
- Search for: **prep4int-**
- Select the repository
- Click "Connect"

### 5. Configure Your Service

Fill in the following:

**Name:** 
```
prepint
```

**Environment:**
```
Node
```

**Build Command:**
```
cd backend && npm install
```

**Start Command:**
```
cd backend && node app.js
```

**Root Directory:**
```
(Leave empty)
```

### 6. Add Environment Variable

Click **"Advanced"** → **"Add Environment Variable"**

**Key:**
```
MONGODB_URI
```

**Value:**
```
mongodb+srv://itsmeni3raj21_db_user:EJug6dBJAZj3VyfN@cluster0.ns5ffy5.mongodb.net/?appName=Cluster0
```

Click **"Add"**

### 7. Click Deploy

Click the **"Create Web Service"** button

### 8. Wait for Deployment

Render will:
1. Clone your repository
2. Run build command (npm install)
3. Start the server
4. Show deployment logs

Expected output:
```
Server is running on http://localhost:8000
```

---

## After Deployment

### Your Live App URL
Will be something like:
```
https://prepint.onrender.com
```

(You'll see the exact URL in Render dashboard)

### Test Your App
Visit the URL and test:
- ✅ Can you see registration page?
- ✅ Can you register new user?
- ✅ Can you login?
- ✅ Can you access /que.html page?
- ✅ Do CSS and images load?
- ✅ Does contact form work?

### Monitor Deployment
- Render will show deployment logs
- Look for any errors
- Check "Events" tab for build status

---

## Troubleshooting

### Build Failed?
- Check build command: `cd backend && npm install`
- Check start command: `cd backend && node app.js`
- Look at build logs for error messages

### App Won't Start?
- Check MONGODB_URI env variable is set correctly
- Check logs for connection errors
- Verify MongoDB account is active

### 404 Errors for CSS/Images?
- Check frontend folder exists
- Check staticPath in app.js points to ../frontend
- Clear browser cache

### Can't Access App?
- Wait 2-3 minutes for first deployment
- Check if service is running (green status in Render)
- Check URL is correct

---

## Your MongoDB Credentials (For Reference)

**Username:** itsmeni3raj21_db_user
**Password:** EJug6dBJAZj3VyfN
**Connection String:** Already set in environment variable

---

## Next Steps After Live Deployment

1. ✅ Share your live URL
2. ✅ Monitor logs in Render dashboard
3. ✅ Test all features on live app
4. ✅ Monitor MongoDB usage
5. ✅ Future updates: Just push to GitHub, Render auto-deploys!

---

## Support Links

- **Render Docs:** https://render.com/docs
- **Render Support:** https://render.com/support
- **MongoDB Atlas:** https://atlas.mongodb.com
- **Your Repository:** https://github.com/NitinRaj2005/prep4int-

---

## 🎉 Your App is Ready!

Everything is prepared. Follow the steps above and your PrepInt app will be live in a few minutes!

Good luck! 🚀
