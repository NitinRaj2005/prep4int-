const mongoose = require("mongoose");

const extractedSkillSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    category: { type: String, trim: true, maxlength: 60, default: "Other" },
    proficiency: { type: String, enum: ["beginner", "intermediate", "advanced", "unspecified"], default: "unspecified" },
    evidence: { type: String, trim: true, maxlength: 240, default: "" }
}, { _id: false });

const projectSchema = new mongoose.Schema({
    name: { type: String, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    technologies: { type: [String], default: [] }
}, { _id: false });

const resumeAnalysisSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Register", required: true, index: true },
    originalFileName: { type: String, required: true, trim: true, maxlength: 180 },
    fileSize: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    mimeType: { type: String, enum: ["application/pdf"], default: "application/pdf" },
    status: { type: String, enum: ["uploaded", "processing", "completed", "failed"], default: "uploaded", index: true },
    candidate: {
        name: { type: String, default: "", maxlength: 120 },
        email: { type: String, default: "", maxlength: 254 },
        education: { type: [String], default: [] },
        experience: { type: [String], default: [] },
        achievements: { type: [String], default: [] }
    },
    skills: { type: [extractedSkillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    missingSkills: { type: [String], default: [] },
    interviewQuestions: { type: [String], default: [] },
    overallScore: { type: Number, min: 0, max: 100, default: null },
    scoreBreakdown: {
        technicalSkills: { type: Number, min: 0, max: 100, default: 0 },
        projects: { type: Number, min: 0, max: 100, default: 0 },
        experience: { type: Number, min: 0, max: 100, default: 0 },
        achievements: { type: Number, min: 0, max: 100, default: 0 },
        formatting: { type: Number, min: 0, max: 100, default: 0 }
    },
    strengths: { type: [String], default: [] },
    feedback: { type: [String], default: [] },
    errorMessage: { type: String, default: "", maxlength: 500 },
    analyzedAt: { type: Date, default: null }
}, { timestamps: true });

resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ResumeAnalysis", resumeAnalysisSchema);
