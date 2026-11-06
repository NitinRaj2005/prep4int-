const express = require("express");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const ResumeAnalysis = require("../models/models/resumeAnalysis");
const JDPreparation = require("../models/models/jdPreparation");
const { validateJobDescription, validateRoadmapDays } = require("../middleware/careerValidation");

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

router.get("/health", (req, res) => res.json({ available: true, phase: 1 }));

// Phase 1 upload foundation: validate the PDF and save metadata only.
// Text extraction and AI analysis are added in Phase 2; the PDF bytes are never persisted.
router.post("/resume/upload", careerLimiter, (req, res, next) => {
    pdfUpload.single("resume")(req, res, (error) => {
        if (error) return res.status(400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Resume must be 5 MB or smaller." : error.message || "Unable to upload this PDF." });
        return next();
    });
}, async (req, res) => {
    if (!req.file || !isPdf(req.file.buffer)) return res.status(400).json({ error: "Choose a valid PDF resume." });
    try {
        const record = await ResumeAnalysis.create({
            userId: req.session.userId,
            originalFileName: req.file.originalname.replace(/[\\/\\0-\\x1f]/g, "_").slice(0, 180) || "resume.pdf",
            fileSize: req.file.size,
            status: "uploaded"
        });
        return res.status(201).json({ message: "Resume received. AI analysis will be enabled in the next phase.", resume: { id: record._id, fileName: record.originalFileName, status: record.status, createdAt: record.createdAt } });
    } catch (error) {
        console.error("Saving resume metadata failed:", error.message);
        return res.status(500).json({ error: "Unable to save resume details." });
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
    try {
        const preparation = await JDPreparation.create({
            userId: req.session.userId,
            ...req.validatedJD,
            status: "draft"
        });
        return res.status(201).json({ message: "Job description saved. AI analysis will be enabled in Phase 3.", preparation: { id: preparation._id, company: preparation.company, role: preparation.role, status: preparation.status, createdAt: preparation.createdAt } });
    } catch (error) {
        console.error("Saving job description failed:", error.message);
        return res.status(500).json({ error: "Unable to save this job description." });
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
        const preparation = await JDPreparation.findOneAndUpdate(
            { _id: req.params.id, userId: req.session.userId },
            { $set: { roadmapDays: req.roadmapDays } },
            { new: true, runValidators: true, projection: { roadmapDays: 1 } }
        ).lean();
        if (!preparation) return res.status(404).json({ error: "JD preparation not found." });
        return res.json({ roadmapDays: preparation.roadmapDays });
    } catch (error) {
        console.error("Updating roadmap duration failed:", error.message);
        return res.status(500).json({ error: "Unable to update roadmap duration." });
    }
});

module.exports = router;
