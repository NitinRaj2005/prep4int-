

# Prep4Int – Interview Preparation Portal

**Author:** Nitin Raj

Prep4Int is a simple full-stack web application designed to help students prepare for coding interviews.
It provides user authentication, topic pages for DSA practice, and a contact form to connect with the admin.

---

## ✨ Features

* **User Registration & Login** – Create an account, log in using email and password.
* **DSA Topic Pages** – Static HTML pages for arrays, stacks, queues, recursion, dynamic programming, graphs, and more.
* **Contact Us** – Form to submit queries, stored in MongoDB.
* **Responsive UI** – Built using custom CSS, Tailwind CDN, and Font Awesome icons.
* **Simple Navigation** – Home page with About, Practice, and Contact sections.

---

## 🛠 Tech Stack

* **Backend:** Node.js, Express
* **Frontend:** Handlebars (hbs), HTML, CSS, JavaScript
* **Database:** MongoDB with Mongoose
* **Utilities:** validator, chalk

---

## 📂 Project Structure

```
public/       # Static HTML, CSS, JS, images
src/
  app.js      # Express app setup & routes
  db/conn.js  # MongoDB connection
  models/     # Mongoose schemas
views/        # Handlebars templates
```

---

## 🚀 Setup & Run

1. Install dependencies:

   ```bash
   npm install
   ```
2. Configure MongoDB connection in `src/db/conn.js` or via `MONGODB_URI` env variable.
3. Start the server:

   ```bash
   node src/app.js
   ```
4. Visit: [http://localhost:8000](http://localhost:8000)

---


---

