const express = require("express");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const ResumeAnalysis = require("../models/models/resumeAnalysis");
const JDPreparation = require("../models/models/jdPreparation");
const { validateJobDescription, validateRoadmapDays } = require("../middleware/careerValidation");
const { extractPdfText, analyzeResumeText, normalizeResumeAnalysis, analyzeJobDescription, normalizeJDAnalysis } = require("../services/aiCareerService");

const router = express.Router();
const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (file.mimetype !== "application/pdf") return callback(new Error("Upload a PDF file only."));
        callback(null, true);
    }
});
const careerLimiter = rateLimit({
    windowMs: 15 *  60 * 1000,
    limit: 15,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many Career Assistant requests. Please try again later." }
});
const isPdf = (buffer) => buffer && buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
const validId = (id) => /^[a-f0-9]{24}$/i.test(id);

router.get("/health", (req, res) => res.json({ available: true, phase: 2 }));

// PDF bytes and extracted text stay in memory. Only structured analysis is persisted.
const resumeUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many resume analyses. Please try again after 15 minutes." }
});

router.post("/resume/upload", resumeUploadLimiter, (req, res, next) => {
    pdfUpload.single("resume")(req, res, (error) => {
        if (error) {
            const message = error.code === "LIMIT_FILE_SIZE"
                ? "Resume must be 5 MB or smaller."
                : error.message || "Unable to upload this PDF.";
            return res.status(400).json({ error: message });
        }
        return next();
    });
}, async (req, res) => {
    if (!req.file || !isPdf(req.file.buffer)) return res.status(400).json({ error: "Choose a valid PDF resume." });
    let record;
    try {
        record = await ResumeAnalysis.create({
            userId: req.session.userId,
            originalFileName: req.file.originalname.replace(/[\/\\\0-\x1f]/g, "_").slice(0, 180) || "resume.pdf",
            fileSize: req.file.size,
            status: "processing"
        });
        const extractedText = await extractPdfText(req.file.buffer);
        const rawAnalysis = await analyzeResumeText(extractedText);
        const analysis = normalizeResumeAnalysis(rawAnalysis);
        record.set({ ...analysis, status: "completed", analyzedAt: new Date(), errorMessage: "" });
        await record.save();
        return res.status(201).json({
            message: "Your resume has been analyzed successfully.",
            resume: {
                id: record._id,
                fileName: record.originalFileName,
                status: record.status,
                overallScore: record.overallScore,
                scoreBreakdown: record.scoreBreakdown,
                strengths: record.strengths,
                candidate: record.candidate,
                skills: record.skills,
                projects: record.projects,
                missingSkills: record.missingSkills,
                interviewQuestions: record.interviewQuestions,
                feedback: record.feedback,
                createdAt: record.createdAt,
                analyzedAt: record.analyzedAt
            }
        });
    } catch (error) {
        console.error("Resume analysis failed:", error.message);
        if (record) {
            record.status = "failed";
            record.errorMessage = error.message.slice(0, 500);
            await record.save().catch(saveError => console.error("Saving resume failure status failed:", saveError.message));
        }
        return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to analyze this resume. Please try again." });
    } finally {
        if (req.file?.buffer) req.file.buffer.fill(0);
    }
});

router.get("/resume/history", async (req, res) => {
    try {
        const resumes = await ResumeAnalysis.find({ userId: req.session.userId })
            .sort({ createdAt: -1 }).limit(20)
            .select("originalFileName fileSize status overallScore createdAt analyzedAt").lean();
        return res.json({ resumes });
    } catch (error) {
        console.error("Loading resume history failed:", error.message);
        return res.status(500).json({ error: "Unable to load resume history." });
    }
});

router.get("/resume/:id", async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid resume analysis ID." });
    try {
        const resume = await ResumeAnalysis.findOne({ _id: req.params.id, userId: req.session.userId })
            .select("-extractedText").lean();
        if (!resume) return res.status(404).json({ error: "Resume analysis not found." });
        return res.json({ resume });
    } catch (error) {
        console.error("Loading resume analysis failed:", error.message);
        return res.status(500).json({ error: "Unable to load this resume analysis." });
    }
});

router.post("/jd/analyze", careerLimiter, validateJobDescription, async (req, res) => {
    let preparation;
    try {
        const roadmapDays = Number.isInteger(Number(req.body.roadmapDays)) && Number(req.body.roadmapDays) >= 1 && Number(req.body.roadmapDays) <= 90
            ? Number(req.body.roadmapDays) : 14;
        let resume = null;
        let resumeAnalysisId = null;
        if (req.body.resumeAnalysisId) {
            if (!validId(req.body.resumeAnalysisId)) return res.status(400).json({ error: "Invalid resume analysis ID." });
            resume = await ResumeAnalysis.findOne({ _id: req.body.resumeAnalysisId, userId: req.session.userId, status: "completed" }).lean();
            if (!resume) return res.status(404).json({ error: "Selected resume analysis was not found." });
            resumeAnalysisId = resume._id;
        } else {
            resume = await ResumeAnalysis.findOne({ userId: req.session.userId, status: "completed" }).sort({ analyzedAt: -1 }).lean();
            if (resume) resumeAnalysisId = resume._id;
        }

        preparation = await JDPreparation.create({
            userId: req.session.userId,
            ...req.validatedJD,
            resumeAnalysisId,
            roadmapDays,
            status: "analyzing"
        });
        const raw = await analyzeJobDescription({
            ...req.validatedJD,
            roadmapDays,
            resume
        });
        const analysis = normalizeJDAnalysis(raw, roadmapDays, Boolean(resume));
        preparation.set({ ...analysis, status: "completed", analyzedAt: new Date() });
        await preparation.save();
        return res.status(201).json({
            message: "Job description analyzed successfully.",
            preparation
        });
    } catch (error) {
        console.error("JD preparation analysis failed:", error.message);
        if (preparation) {
            preparation.status = "failed";
            await preparation.save().catch(saveError => console.error("Saving JD failure status failed:", saveError.message));
        }
        return res.status(error.statusCode || 500).json({
            error: error.statusCode ? error.message : "Unable to analyze this job description. Please try again."
        });
    }
});

router.get("/jd/history", async (req, res) => {
    try {
        const preparations = await JDPreparation.find({ userId: req.session.userId })
            .sort({ createdAt: -1 }).limit(20)
            .select("company role status matchPercentage roadmapDays createdAt analyzedAt").lean();
        return res.json({ preparations });
    } catch (error) {
        console.error("Loading JD history failed:", error.message);
        return res.status(500).json({ error: "Unable to load JD preparation history." });
    }
});

router.get("/jd/:id", async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid JD preparation ID." });
    try {
        const preparation = await JDPreparation.findOne({ _id: req.params.id, userId: req.session.userId }).lean();
        if (!preparation) return res.status(404).json({ error: "JD preparation not found." });
        return res.json({ preparation });
    } catch (error) {
        console.error("Loading JD preparation failed:", error.message);
        return res.status(500).json({ error: "Unable to load this JD preparation." });
    }
});

router.put("/jd/:id/roadmap-days", validateRoadmapDays, async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid JD preparation ID." });
    try {
        const preparation = await JDPreparation.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!preparation) return res.status(404).json({ error: "JD preparation not found." });
        const resume = preparation.resumeAnalysisId
            ? await ResumeAnalysis.findOne({ _id: preparation.resumeAnalysisId, userId: req.session.userId, status: "completed" }).lean()
            : null;
        const raw = await analyzeJobDescription({
            company: preparation.company,
            role: preparation.role,
            jobDescription: preparation.jobDescription,
            experienceLevel: preparation.experienceLevel,
            roadmapDays: req.roadmapDays,
            resume
        });
        const analysis = normalizeJDAnalysis(raw, req.roadmapDays, Boolean(resume));
        preparation.set({ ...analysis, roadmapDays: req.roadmapDays, status: "completed", analyzedAt: new Date() });
        await preparation.save();
        return res.json({ preparation });
    } catch (error) {
        console.error("Regenerating preparation roadmap failed:", error.message);
        return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Unable to regenerate the roadmap." });
    }
});

router.patch("/jd/:id/roadmap/:day", async (req, res) => {
    if (!validId(req.params.id)) return res.status(400).json({ error: "Invalid JD preparation ID." });
    const day = Number(req.params.day);
    if (!Number.isInteger(day) || day < 1 || day > 90 || typeof req.body.completed !== "boolean") {
        return res.status(400).json({ error: "Provide a valid roadmap day and completion status." });
    }
    try {
        const preparation = await JDPreparation.findOne({ _id: req.params.id, userId: req.session.userId });
        if (!preparation) return res.status(404).json({ error: "JD preparation not found." });
        const task = preparation.roadmap.find(item => item.day === day);
        if (!task) return res.status(404).json({ error: "Roadmap task not found." });
        task.completed = req.body.completed;
        await preparation.save();
        return res.json({ day, completed: task.completed });
    } catch (error) {
        console.error("Updating roadmap progress failed:", error.message);
        return res.status(500).json({ error: "Unable to update roadmap progress." });
    }
});

module.exports = router;
