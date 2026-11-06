const MAX_JD_LENGTH = 20000;
const MAX_ROADMAP_DAYS = 90;

const cleanText = (value) => typeof value === "string" ? value.trim() : "";

const validateJobDescription = (req, res, next) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const company = cleanText(body.company);
    const role = cleanText(body.role);
    const jobDescription = cleanText(body.jobDescription);
    const experienceLevel = body.experienceLevel || "unspecified";
    const allowedLevels = ["intern", "entry", "mid", "senior", "unspecified"];

    if (company.length > 120) return res.status(400).json({ error: "Company name must be 120 characters or fewer." });
    if (!role || role.length > 120) return res.status(400).json({ error: "Enter a role between 1 and 120 characters." });
    if (jobDescription.length < 100 || jobDescription.length > MAX_JD_LENGTH) {
        return res.status(400).json({ error: "Job description must contain 100 to 20,000 characters." });
    }
    if (!allowedLevels.includes(experienceLevel)) return res.status(400).json({ error: "Choose a valid experience level." });

    req.validatedJD = { company, role, jobDescription, experienceLevel };
    return next();
};

const validateRoadmapDays = (req, res, next) => {
    const days = Number(req.body && req.body.days);
    if (!Number.isInteger(days) || days < 1 || days > MAX_ROADMAP_DAYS) {
        return res.status(400).json({ error: "Roadmap duration must be between 1 and 90 days." });
    }
    req.roadmapDays = days;
    return next();
};

module.exports = { cleanText, validateJobDescription, validateRoadmapDays, MAX_JD_LENGTH, MAX_ROADMAP_DAYS };
