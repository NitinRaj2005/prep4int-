const express = require("express");
const { rateLimit } = require("express-rate-limit");
const InterviewSession = require("../models/models/interviewSession");
const { validateStartInterview } = require("../middleware/interviewValidation");
const {
    createInterviewSession,
    DEFAULT_DURATION_MINUTES,
    DEFAULT_QUESTION_LIMIT
} = require("../services/aiInterviewService");

const router = express.Router();

const startInterviewLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many interview sessions started. Please try again later." }
});

router.post("/start", startInterviewLimiter, validateStartInterview, async (req, res) => {
    try {
        const session = await createInterviewSession(req.session.userId, req.interviewSetup);
        return res.status(201).json({
            message: "Interview session created.",
            session: {
                id: session._id,
                role: session.role,
                category: session.category,
                difficulty: session.difficulty,
                mode: session.mode,
                durationMinutes: DEFAULT_DURATION_MINUTES,
                questionLimit: DEFAULT_QUESTION_LIMIT,
                status: session.status,
                createdAt: session.createdAt
            }
        });
    } catch (error) {
        console.error("Starting interview session failed:", error.message);
        return res.status(500).json({ error: "Unable to start an interview right now." });
    }
});

router.get("/history", async (req, res) => {
    try {
        const sessions = await InterviewSession.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(30)
            .select("role category difficulty mode durationMinutes questionLimit status overallScore createdAt completedAt")
            .lean();
        return res.json({ sessions });
    } catch (error) {
        console.error("Loading interview history failed:", error.message);
        return res.status(500).json({ error: "Unable to load interview history." });
    }
});

router.get("/:id", async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
        return res.status(400).json({ error: "Invalid interview session ID." });
    }
    try {
        const session = await InterviewSession.findOne({
            _id: req.params.id,
            userId: req.session.userId
        }).lean();
        if (!session) return res.status(404).json({ error: "Interview session not found." });
        return res.json({ session });
    } catch (error) {
        console.error("Loading interview session failed:", error.message);
        return res.status(500).json({ error: "Unable to load this interview session." });
    }
});

module.exports = router;
