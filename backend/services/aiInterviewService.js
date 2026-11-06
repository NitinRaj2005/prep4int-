const InterviewSession = require("../models/models/interviewSession");

const DEFAULT_DURATION_MINUTES = 30;
const DEFAULT_QUESTION_LIMIT = 10;

const createInterviewSession = async (userId, setup) => {
    return InterviewSession.create({
        userId,
        role: setup.role,
        category: setup.category,
        difficulty: setup.difficulty,
        mode: setup.mode,
        durationMinutes: DEFAULT_DURATION_MINUTES,
        questionLimit: DEFAULT_QUESTION_LIMIT,
        status: "in_progress"
    });
};

const getGroqConfiguration = () => ({
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
});

module.exports = {
    createInterviewSession,
    getGroqConfiguration,
    DEFAULT_DURATION_MINUTES,
    DEFAULT_QUESTION_LIMIT
};
