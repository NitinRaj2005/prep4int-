const allowedCategories = ["DSA", "OOP", "DBMS", "OS", "CN", "HR", "Mixed", "Resume-based"];
const allowedDifficulties = ["Easy", "Medium", "Hard"];
const allowedModes = ["text", "voice", "both"];

const validateStartInterview = (req, res, next) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const category = typeof body.category === "string" ? body.category : "Mixed";
    const difficulty = typeof body.difficulty === "string" ? body.difficulty : "Medium";
    const mode = typeof body.mode === "string" ? body.mode : "both";

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

    req.interviewSetup = { role, category, difficulty, mode };
    return next();
};

module.exports = { validateStartInterview };
