const path = require("path");
const crypto = require("crypto");
const express = require("express");
const hbs = require("hbs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const validator = require("validator");
const passwordForBcrypt = require("./utils/password");
const { mongoURI, connectToDatabase } = require("./db/db/conn");
const Register = require("./models/models/registers");
const ContactUs = require("./models/models/contactus");

const app = express();
const port = process.env.PORT || 8000;
const staticPath = path.join(__dirname, "../frontend");
const sessionSecret = process.env.SESSION_SECRET || (
    process.env.NODE_ENV === "production" ? "" : crypto.randomBytes(32).toString("hex")
);

if (!sessionSecret) {
    throw new Error("SESSION_SECRET must be configured.");
}
if (process.env.NODE_ENV === "production" && Buffer.byteLength(sessionSecret) < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes in production.");
}
if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is unset; using a temporary development-only session key.");
}

if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
hbs.registerPartials(path.join(__dirname, "views", "partials"));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb", parameterLimit: 20 }));
app.use(session({
    name: "prep4int.sid",
    secret: sessionSecret,
    store: MongoStore.create({
        mongoUrl: mongoURI,
        collectionName: "sessions",
        ttl: 14 * 24 * 60 * 60
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 14 * 24 * 60 * 60 * 1000
    }
}));
app.use(express.static(staticPath, {
    maxAge: process.env.NODE_ENV === "production" ? "1d" : "0",
    setHeaders: (res, filePath) => {
        if (/\.(?:html|css|js)$/i.test(filePath)) {
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
        }
    }
}));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Too many attempts. Please try again later."
});

const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Too many registration attempts. Please try again later."
});

const cleanString = (value) => (
    typeof value === "string" ? value.trim() : ""
);

const normalizePhone = (value) => (
    typeof value === "string" ? value.trim().replace(/[\s()-]/g, "") : ""
);

const isValidPhone = (phone) => /^\+?[1-9]\d{6,14}$/.test(phone);

const establishSession = async (req, userId) => {
    await new Promise((resolve, reject) => {
        req.session.regenerate((error) => error ? reject(error) : resolve());
    });
    req.session.userId = userId.toString();
    await new Promise((resolve, reject) => {
        req.session.save((error) => error ? reject(error) : resolve());
    });
};

const requireAuthenticatedUser = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Log in to save your question progress." });
    }
    return next();
};

app.get("/", (req, res) => {
    res.render("register");
});

app.get("/index", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/api/questions/progress", requireAuthenticatedUser, async (req, res) => {
    try {
        const user = await Register.findById(req.session.userId).select("solvedQuestions");
        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "Log in to save your question progress." });
        }
        return res.json({ solvedQuestionIds: user.solvedQuestions });
    } catch (error) {
        console.error("Loading question progress failed:", error.message);
        return res.status(500).json({ error: "Unable to load question progress." });
    }
});

app.put("/api/questions/progress", requireAuthenticatedUser, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const questionId = body.questionId;
    if (
        typeof questionId !== "string" ||
        questionId.length > 120 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(questionId) ||
        typeof body.solved !== "boolean"
    ) {
        return res.status(400).json({ error: "Invalid question progress update." });
    }

    try {
        const update = body.solved
            ? { $addToSet: { solvedQuestions: questionId } }
            : { $pull: { solvedQuestions: questionId } };
        const user = await Register.findByIdAndUpdate(
            req.session.userId,
            update,
            { new: true, projection: { solvedQuestions: 1 } }
        );
        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "Log in to save your question progress." });
        }
        return res.json({ solvedQuestionIds: user.solvedQuestions });
    } catch (error) {
        console.error("Saving question progress failed:", error.message);
        return res.status(500).json({ error: "Unable to save question progress." });
    }
});

app.post("/login", loginLimiter, async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const email = cleanString(body.mail).toLowerCase();
        const password = typeof body.pass === "string" ? body.pass : "";
        if (email.length > 254 || !validator.isEmail(email) || !password || password.length > 128) {
            return res.status(400).send("Invalid email or password.");
        }

        const user = await Register.findOne({ email })
            .collation({ locale: "en", strength: 2 })
            .select("+password");
        if (!user) {
            return res.status(401).send("Invalid email or password.");
        }

        let authenticated = false;
        if (/^\$2[aby]\$/.test(user.password)) {
            authenticated = await bcrypt.compare(passwordForBcrypt(password), user.password);
        } else {
            const storedPassword = Buffer.from(user.password);
            const submittedPassword = Buffer.from(password);
            if (storedPassword.length === submittedPassword.length) {
                authenticated = crypto.timingSafeEqual(storedPassword, submittedPassword);
                if (authenticated) {
                    user.password = password;
                    await user.save();
                }
            }
        }

        if (!authenticated) {
            return res.status(401).send("Invalid email or password.");
        }

        await establishSession(req, user._id);
        return res.status(200).render("index");
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).send("Unable to log in right now. Please try again.");
    }
});

app.post("/", registrationLimiter, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fullname = cleanString(body.fullname);
    const username = cleanString(body.username).toLowerCase();
    const email = cleanString(body.email).toLowerCase();
    const phone = normalizePhone(body.phone);
    const password = typeof body.password === "string" ? body.password : "";
    const confirm = typeof body.confirm === "string" ? body.confirm : "";

    if (
        !fullname ||
        fullname.length > 100 ||
        !/^[a-z0-9_-]{3,30}$/.test(username) ||
        email.length > 254 ||
        !validator.isEmail(email) ||
        !isValidPhone(phone) ||
        password.length < 12 ||
        password.length > 128 ||
        password !== confirm
    ) {
        return res.status(400).send(
            "Check your name, username, email, phone number, and password. Passwords must match and be 12-128 characters."
        );
    }

    try {
        const existingUser = await Register.findOne({
            $or: [{ email }, { username }]
        })
            .collation({ locale: "en", strength: 2 })
            .select("_id");
        if (existingUser) {
            return res.status(409).send("That email or username is already registered.");
        }

        const user = await new Register({ fullname, username, email, phone, password }).save();
        await establishSession(req, user._id);
        return res.status(201).render("index");
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).send("That email or username is already registered.");
        }
        console.error("Registration failed:", error.message);
        return res.status(500).send("Unable to register right now. Please try again.");
    }
});

app.post("/index", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fname = cleanString(body.fname);
    const lname = cleanString(body.lname);
    const email = cleanString(body.email).toLowerCase();
    const phone = normalizePhone(body.phone);
    const message = cleanString(body.message);

    if (
        !fname ||
        fname.length > 100 ||
        !lname ||
        lname.length > 100 ||
        email.length > 254 ||
        !validator.isEmail(email) ||
        !isValidPhone(phone) ||
        !message ||
        message.length > 2000
    ) {
        return res.status(400).send("Please provide valid contact details and a message.");
    }

    try {
        await new ContactUs({ fname, lname, email, phone, message }).save();
        return res.render("index");
    } catch (error) {
        console.error("Contact form submission failed:", error.message);
        return res.status(500).send("Unable to submit your message right now. Please try again.");
    }
});

app.get("/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }
        res.clearCookie("prep4int.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });
        return res.redirect("/");
    });
});

app.use((req, res) => {
    res.status(404).render("404", { title: "Page Not Found" });
});

app.use((error, req, res, next) => {
    console.error("Request failed:", error.message);
    if (res.headersSent) {
        return next(error);
    }
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON request body." });
    }
    if (error.type === "entity.too.large") {
        return res.status(413).json({ error: "Request body is too large." });
    }
    return res.status(500).send("An unexpected error occurred.");
});

connectToDatabase()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    })
    .catch((error) => {
        console.error("Unable to start server:", error.message);
        process.exitCode = 1;
    });
