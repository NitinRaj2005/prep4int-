const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true, maxlength: 2000 },
    answer: { type: String, default: "", maxlength: 10000 },
    feedback: { type: String, default: "", maxlength: 5000 }
}, { _id: false });

const interviewQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true, maxlength: 2000 },
    answer: { type: String, default: "", maxlength: 10000 },
    answerMode: { type: String, enum: ["text", "voice"], default: "text" },
    feedback: { type: String, default: "", maxlength: 5000 },
    score: { type: Number, min: 0, max: 10, default: null },
    followUps: { type: [followUpSchema], default: [] }
}, { timestamps: true });

const evaluationSchema = new mongoose.Schema({
    technicalKnowledge: { type: Number, min: 0, max: 100, default: null },
    problemSolving: { type: Number, min: 0, max: 100, default: null },
    communication: { type: Number, min: 0, max: 100, default: null },
    confidence: { type: Number, min: 0, max: 100, default: null }
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Register",
        required: true,
        index: true
    },
    role: { type: String, required: true, trim: true, maxlength: 80 },
    category: {
        type: String,
        enum: ["DSA", "OOP", "DBMS", "OS", "CN", "HR", "Mixed", "Resume-based"],
        default: "Mixed"
    },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
    mode: { type: String, enum: ["text", "voice", "both"], default: "both" },
    durationMinutes: { type: Number, enum: [30], default: 30 },
    questionLimit: { type: Number, enum: [10], default: 10 },
    status: { type: String, enum: ["in_progress", "completed", "abandoned"], default: "in_progress", index: true },
    questions: { type: [interviewQuestionSchema], default: [] },
    overallScore: { type: Number, min: 0, max: 100, default: null },
    evaluation: { type: evaluationSchema, default: () => ({}) },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    completedAt: { type: Date, default: null }
}, { timestamps: true });

interviewSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
