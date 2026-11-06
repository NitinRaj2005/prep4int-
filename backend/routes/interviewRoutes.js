const express = require("express");
const { rateLimit } = require("express-rate-limit");
const InterviewSession = require("../models/models/interviewSession");
const { validateStartInterview } = require("../middleware/interviewValidation");
const {
    createInterviewSession,
    generateQuestion,
    evaluateAnswer,
    createFinalReport,
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
const answerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many answers submitted. Please slow down." }
});

const ownedSession = (id, userId) => InterviewSession.findOne({ _id: id, userId });

router.post("/start", startInterviewLimiter, validateStartInterview, async (req, res) => {
    let session;
    try {
        session = await createInterviewSession(req.session.userId, req.interviewSetup);
        const question = await generateQuestion(session);
        session.questions.push({ question });
        await session.save();
        return res.status(201).json({
            message: "Your AI interview is ready.",
            session: {
                id: session._id,
                role: session.role,
                category: session.category,
                difficulty: session.difficulty,
                mode: session.mode,
                durationMinutes: DEFAULT_DURATION_MINUTES,
                questionLimit: DEFAULT_QUESTION_LIMIT,
                status: session.status,
                currentQuestion: question,
                questionNumber: 1
            }
        });
    } catch (error) {
        if (session) await InterviewSession.deleteOne({ _id: session._id, userId: req.session.userId }).catch(() => {});
        console.error("Starting AI interview failed:", error.message);
        return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to generate your interview. Please try again." });
    }
});

router.get("/history", async (req, res) => {
    try {
        const sessions = await InterviewSession.find({ userId: req.session.userId })
            .sort({ createdAt: -1 }).limit(30)
            .select("role category difficulty mode durationMinutes questionLimit status overallScore createdAt completedAt").lean();
        return res.json({ sessions });
    } catch (error) {
        console.error("Loading interview history failed:", error.message);
        return res.status(500).json({ error: "Unable to load interview history." });
    }
});

router.get("/:id", async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid interview session ID." });
    try {
        const session = await ownedSession(req.params.id, req.session.userId).lean();
        if (!session) return res.status(404).json({ error: "Interview session not found." });
        return res.json({ session });
    } catch (error) {
        console.error("Loading interview session failed:", error.message);
        return res.status(500).json({ error: "Unable to load this interview session." });
    }
});

router.post("/:id/answer", answerLimiter, async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "Invalid interview session ID." });
    const answer = typeof req.body.answer === "string" ? req.body.answer.trim() : "";
    const answerMode = req.body.answerMode === "voice" ? "voice" : "text";
    if (!answer || answer.length > 10000) return res.status(400).json({ error: "Enter an answer (maximum 10,000 characters)." });

    try {
        const session = await ownedSession(req.params.id, req.session.userId);
        if (!session) return res.status(404).json({ error: "Interview session not found." });
        if (session.status !== "in_progress") return res.status(409).json({ error: "This interview is already finished." });

        const current = session.questions[session.questions.length - 1];
        if (!current || current.answer) return res.status(409).json({ error: "There is no unanswered question. Refresh the interview." });

        const evaluation = await evaluateAnswer(session, current.question, answer);
        current.answer = answer;
        current.answerMode = answerMode;
        current.feedback = evaluation.feedback;
        current.score = evaluation.score;
        if (evaluation.followUp) current.followUps.push({ question: evaluation.followUp });

        if (session.questions.length >= session.questionLimit) {
            const report = await createFinalReport(session);
            session.overallScore = report.overallScore;
            session.evaluation = report.evaluation;
            session.strengths = report.strengths;
            session.weaknesses = report.weaknesses;
            session.recommendations = report.recommendations;
            session.status = "completed";
            session.completedAt = new Date();
            await session.save();
            return res.json({
                completed: true,
                evaluation: { score: evaluation.score, feedback: evaluation.feedback, strengths: evaluation.strengths, improvements: evaluation.improvements },
                report: {
                    overallScore: session.overallScore,
                    evaluation: session.evaluation,
                    strengths: session.strengths,
                    weaknesses: session.weaknesses,
                    recommendations: session.recommendations
                }
            });
        }

        const nextQuestion = await generateQuestion(session);
        session.questions.push({ question: nextQuestion });
        await session.save();
        return res.json({
            completed: false,
            question: nextQuestion,
            questionNumber: session.questions.length,
            totalQuestions: session.questionLimit,
            evaluation: { score: evaluation.score, feedback: evaluation.feedback, strengths: evaluation.strengths, improvements: evaluation.improvements }
        });
    } catch (error) {
        console.error("Submitting interview answer failed:", error.message);
        return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to evaluate this answer. Please try again." });
    }
});

module.exports = router;
