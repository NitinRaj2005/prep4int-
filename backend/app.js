const path = require("path");
const crypto = require("crypto");
const express = require("express");
const hbs = require("hbs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const validator = require("validator");
const multer = require("multer");
const passwordForBcrypt = require("./utils/password");
const { mongoURI, connectToDatabase } = require("./db/db/conn");
const Register = require("./models/models/registers");
const ContactUs = require("./models/models/contactus");
const interviewRoutes = require("./routes/interviewRoutes");

const app = express();
const profilePhotoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 400 * 1024, files: 1 } });
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
app.get("/compiler", (req, res) => { if (!req.session.userId) return res.redirect("/login"); return res.sendFile(path.join(staticPath, "compiler.html")); });

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

// AI Mock Interview APIs are isolated behind the existing session authentication.
app.use("/api/interview", requireAuthenticatedUser, interviewRoutes);

app.get("/interview/:id", (req, res) => {\n    if (!req.session.userId) return res.redirect("/login");\n    return res.render("interview-room", { sessionId: req.params.id });\n});\n\napp.get("/interview", (req, res) => {
    if (!req.session.userId) return res.redirect("/login");
    return res.render("interview");
});

app.get("/", (req, res) => {
    res.render("register");
});

app.get("/index", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/api/profile/summary", requireAuthenticatedUser, async (req, res) => {
    try {
        const user = await Register.findById(req.session.userId).select("fullname username profilePhoto");
        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "Please log in again." });
        }
        return res.json({ fullname: user.fullname, username: user.username, hasProfilePhoto: Boolean(user.profilePhoto) });
    } catch (error) {
        console.error("Loading account menu failed:", error.message);
        return res.status(500).json({ error: "Unable to load account details." });
    }
});


app.get("/api/profile/photo", requireAuthenticatedUser, async (req, res) => {
    try {
        const user = await Register.findById(req.session.userId).select("+profilePhoto");
        if (!user || !user.profilePhoto) return res.sendStatus(404);
        const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(user.profilePhoto);
        if (!match) return res.sendStatus(404);
        res.set({
            "Content-Type": match[1],
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff"
        });
        return res.send(Buffer.from(match[2], "base64"));
    } catch (error) {
        console.error("Loading profile photo failed:", error.message);
        return res.status(500).json({ error: "Unable to load profile photo." });
    }
});

app.post("/api/profile/photo", requireAuthenticatedUser, (req, res) => {
    profilePhotoUpload.single("profilePhoto")(req, res, async (uploadError) => {
        if (uploadError) {
            const message = uploadError.code === "LIMIT_FILE_SIZE"
                ? "Photo must be 400 KB or smaller."
                : "Unable to upload this photo.";
            return res.status(400).json({ error: message });
        }
        if (!req.file) return res.status(400).json({ error: "Choose a photo first." });

        const buffer = req.file.buffer;
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const isWebp = buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
        if (!(isJpeg || isPng || isWebp)) {
            return res.status(400).json({ error: "Use a valid JPG, PNG or WEBP image." });
        }

        const contentType = isJpeg ? "image/jpeg" : isPng ? "image/png" : "image/webp";
        try {
            const user = await Register.findById(req.session.userId).select("+profilePhoto");
            if (!user) {
                req.session.destroy(() => {});
                return res.status(401).json({ error: "Please log in again." });
            }
            user.profilePhoto = `data:${contentType};base64,${buffer.toString("base64")}`;
            await user.save();
            return res.json({ message: "Profile photo updated successfully." });
        } catch (error) {
            console.error("Saving profile photo failed:", error.message);
            return res.status(500).json({ error: "Unable to save profile photo right now." });
        }
    });
});

app.delete("/api/profile/photo", requireAuthenticatedUser, async (req, res) => {
    try {
        const user = await Register.findById(req.session.userId).select("+profilePhoto");
        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "Please log in again." });
        }
        user.profilePhoto = "";
        await user.save();
        return res.json({ message: "Profile photo removed." });
    } catch (error) {
        console.error("Removing profile photo failed:", error.message);
        return res.status(500).json({ error: "Unable to remove profile photo." });
    }
});

app.get("/profile", async (req, res) => {
    if (!req.session.userId) return res.redirect("/login");
    try {
        const user = await Register.findById(req.session.userId).select("fullname username email phone");
        if (!user) { req.session.destroy(() => {}); return res.redirect("/login"); }
        return res.render("profile", { user });
    } catch (error) {
        console.error("Loading profile failed:", error.message);
        return res.status(500).send("Unable to load your profile right now.");
    }
});

app.put("/api/profile/username", requireAuthenticatedUser, async (req, res) => {
    const username = cleanString(req.body && req.body.username).toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(username)) {
        return res.status(400).json({ error: "Username must be 3-30 characters and use only letters, numbers, _ or -." });
    }
    try {
        const existing = await Register.findOne({ username }).collation({ locale: "en", strength: 2 }).select("_id");
        if (existing && existing._id.toString() !== req.session.userId) {
            return res.status(409).json({ error: "That username is already taken." });
        }
        const user = await Register.findById(req.session.userId);
        if (!user) { req.session.destroy(() => {}); return res.status(401).json({ error: "Please log in again." }); }
        user.username = username;
        await user.save();
        return res.json({ message: "Username updated successfully.", username: user.username });
    } catch (error) {
        if (error && error.code === 11000) return res.status(409).json({ error: "That username is already taken." });
        console.error("Updating username failed:", error.message);
        return res.status(500).json({ error: "Unable to update username right now." });
    }
});

app.put("/api/profile/password", requireAuthenticatedUser, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    if (!currentPassword || currentPassword.length > 128) return res.status(400).json({ error: "Enter your current password." });
    if (newPassword.length < 12 || newPassword.length > 128) return res.status(400).json({ error: "New password must be 12-128 characters long." });
    if (newPassword !== confirmPassword) return res.status(400).json({ error: "New password and confirmation do not match." });
    if (currentPassword === newPassword) return res.status(400).json({ error: "Choose a password different from your current password." });
    try {
        const user = await Register.findById(req.session.userId).select("+password");
        if (!user) { req.session.destroy(() => {}); return res.status(401).json({ error: "Please log in again." }); }
        let matches = false;
        if (/^\\$2[aby]\\$/.test(user.password)) {
            matches = await bcrypt.compare(passwordForBcrypt(currentPassword), user.password);
        } else {
            const stored = Buffer.from(user.password);
            const submitted = Buffer.from(currentPassword);
            matches = stored.length === submitted.length && crypto.timingSafeEqual(stored, submitted);
        }
        if (!matches) return res.status(401).json({ error: "Your current password is incorrect." });
        user.password = newPassword;
        await user.save();
        return res.json({ message: "Password changed successfully." });
    } catch (error) {
        console.error("Changing password failed:", error.message);
        return res.status(500).json({ error: "Unable to change password right now." });
    }
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

const compilerLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many code runs. Please wait a minute and try again." } });
const compilerLanguages = { cpp: { id: 54, name: "C++" }, java: { id: 62, name: "Java" }, python: { id: 71, name: "Python" }, javascript: { id: 63, name: "JavaScript" } };
const decodeJudgeOutput = (value) => value ? Buffer.from(value, "base64").toString("utf8") : "";
app.post("/api/compiler/run", requireAuthenticatedUser, compilerLimiter, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const language = compilerLanguages[body.language];
  const sourceCode = typeof body.sourceCode === "string" ? body.sourceCode : "";
  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  if (!language) return res.status(400).json({ error: "Select a supported programming language." });
  if (!sourceCode.trim()) return res.status(400).json({ error: "Write some code before running it." });
  if (sourceCode.length > 20000 || stdin.length > 10000) return res.status(413).json({ error: "Code or input is too long." });
  const judgeUrl = (process.env.JUDGE0_API_URL || "https://ce.judge0.com").replace(/\/$/, "");
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = { "Content-Type": "application/json", "Accept": "application/json" };
    if (process.env.JUDGE0_API_KEY) headers["X-Auth-Token"] = process.env.JUDGE0_API_KEY;
    const response = await fetch(judgeUrl + "/submissions?base64_encoded=true&wait=true", { method: "POST", headers, signal: controller.signal, body: JSON.stringify({ source_code: Buffer.from(sourceCode, "utf8").toString("base64"), language_id: language.id, stdin: Buffer.from(stdin, "utf8").toString("base64"), cpu_time_limit: 5, wall_time_limit: 10, memory_limit: 128000 }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { console.error("Judge0 request failed:", response.status, result); return res.status(502).json({ error: "Compiler service is temporarily unavailable. Please try again." }); }
    return res.json({ language: language.name, status: result.status && result.status.description ? result.status.description : "Finished", stdout: decodeJudgeOutput(result.stdout), stderr: decodeJudgeOutput(result.stderr), compileOutput: decodeJudgeOutput(result.compile_output), time: result.time || null, memory: result.memory || null });
  } catch (error) {
    if (error.name === "AbortError") return res.status(504).json({ error: "The compiler took too long to respond. Please try again." });
    console.error("Code execution failed:", error.message); return res.status(502).json({ error: "Unable to connect to the compiler service right now." });
  } finally { clearTimeout(timeout); }
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
        password.length < 6 ||
        password.length > 128 ||
        password !== confirm
    ) {
        return res.status(400).send(
            "Check your name, username, email, phone number, and password. Passwords must match and be 6-128 characters."
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
