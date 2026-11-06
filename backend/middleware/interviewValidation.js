const allowedCategories = ["DSA", "OOP", "DBMS", "OS", "CN", "HR", "Mixed", "Resume-based"];
const allowedDifficulties = ["Easy", "Medium", "Hard"];
const allowedModes = ["text", "voice", "both"];
const allowedDurations = [15, 20, 30];
const allowedQuestionLimits = [5, 10, 15];

const validateStartInterview = (req, res, next) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const category = typeof body.category === "string" ? body.category : "Mixed";
    const difficulty = typeof body.difficulty === "string" ? body.difficulty : "Medium";
    const mode = typeof body.mode === "string" ? body.mode : "both";
    const durationMinutes = Number(body.durationMinutes || 30);
    const questionLimit = Number(body.questionLimit || 10);

    if (!role || role.length > 80) {
        return res.status(400).json({ error: "Enter a role between 1 and 80 characters." });
    }
    if (!allowedCategories.includes(category)) {
        return res.status(400).json({ error: "Choose a valid interview category." });
    }
    if (!allowedDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: "Choose a valid difficulty level." });
    }
    if (!allowedModes.includes(mode)) {
        return res.status(400).json({ error: "Choose text, voice or both interview mode." });
    }

    if (!allowedDurations.includes(durationMinutes)) return res.status(400).json({ error: "Choose 15, 20 or 30 minutes." });
    if (!allowedQuestionLimits.includes(questionLimit)) return res.status(400).json({ error: "Choose 5, 10 or 15 questions." });

    const jdPreparationId = typeof body.jdPreparationId === "string" ? body.jdPreparationId : "";
    const resumeAnalysisId = typeof body.resumeAnalysisId === "string" ? body.resumeAnalysisId : "";
    if (jdPreparationId && !/^[a-f0-9]{24}$/i.test(jdPreparationId)) return res.status(400).json({ error: "Invalid JD preparation ID." });
    if (resumeAnalysisId && !/^[a-f0-9]{24}$/i.test(resumeAnalysisId)) return res.status(400).json({ error: "Invalid resume analysis ID." });
    req.interviewSetup = { role, category, difficulty, mode, durationMinutes, questionLimit, jdPreparationId, resumeAnalysisId };
    return next();
};

module.exports = { validateStartInterview };
