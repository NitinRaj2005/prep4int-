const mongoose = require("mongoose");

const jdSkillSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    category: { type: String, trim: true, maxlength: 60, default: "Other" },
    priority: { type: String, enum: ["must-have", "important", "good-to-have"], default: "important" },
    status: { type: String, enum: ["matched", "needs-improvement", "missing", "not-assessed"], default: "not-assessed" },
    notes: { type: String, default: "", maxlength: 500 }
}, { _id: false });

const roadmapTaskSchema = new mongoose.Schema({
    day: { type: Number, required: true, min: 1, max: 90 },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, trim: true, maxlength: 1200, default: "" },
    topics: { type: [String], default: [] },
    completed: { type: Boolean, default: false }
}, { _id: false });

const jdPreparationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Register", required: true, index: true },
    company: { type: String, trim: true, maxlength: 120, default: "" },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    jobDescription: { type: String, required: true, trim: true, maxlength: 20000 },
    experienceLevel: { type: String, enum: ["intern", "entry", "mid", "senior", "unspecified"], default: "unspecified" },
    status: { type: String, enum: ["draft", "analyzing", "completed", "failed"], default: "draft", index: true },
    skills: { type: [jdSkillSchema], default: [] },
    resumeAnalysisId: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeAnalysis", default: null },
    matchPercentage: { type: Number, min: 0, max: 100, default: null },
    interviewQuestions: { type: [String], default: [] },
    roadmapDays: { type: Number, min: 1, max: 90, default: 14 },
    roadmap: { type: [roadmapTaskSchema], default: [] },
    recommendations: { type: [String], default: [] },
    analyzedAt: { type: Date, default: null }
}, { timestamps: true });

jdPreparationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("JDPreparation", jdPreparationSchema);
