const InterviewSession = require("../models/models/interviewSession");

const DEFAULT_DURATION_MINUTES = 30;
const DEFAULT_QUESTION_LIMIT = 10;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const getGroqConfiguration = () => ({
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b"
});

const callGroq = async (messages, temperature = 0.4) => {
    const { apiKey, model } = getGroqConfiguration();
    if (!apiKey) {
        const error = new Error("AI interview is not configured yet. Please contact the administrator.");
        error.statusCode = 503;
        throw error;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
        const response = await fetch(GROQ_URL, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                response_format: { type: "json_object" }
            }),
            signal: controller.signal
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.error("Groq API error:", response.status, data && data.error ? data.error.message : "Unknown error");
            const error = new Error("The AI service is temporarily unavailable. Please try again.");
            error.statusCode = response.status === 429 ? 429 : 502;
            throw error;
        }
        const content = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content : "";
        if (!content) throw new Error("The AI service returned an empty response.");
        return JSON.parse(content);
    } catch (error) {
        if (error.name === "AbortError") {
            const timeoutError = new Error("The AI service took too long to respond. Please try again.");
            timeoutError.statusCode = 504;
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const createInterviewSession = async (userId, setup) => InterviewSession.create({
    userId,
    role: setup.role,
    category: setup.category,
    difficulty: setup.difficulty,
    mode: setup.mode,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    questionLimit: DEFAULT_QUESTION_LIMIT,
    status: "in_progress"
});

const generateQuestion = async (session) => {
    const history = (session.questions || []).map((item, index) => ({
        question: item.question,
        answer: item.answer || "",
        score: item.score
    }));
    const result = await callGroq([
        {
            role: "system",
            content: "You are a professional technical interviewer. Return only valid JSON with one key: question. Ask one clear, relevant interview question. Do not include the answer or hints. Avoid repeating previous questions."
        },
        {
            role: "user",
            content: JSON.stringify({
                targetRole: session.role,
                category: session.category,
                difficulty: session.difficulty,
                questionNumber: history.length + 1,
                totalQuestions: session.questionLimit,
                previousQuestionsAndAnswers: history,
                instruction: "Generate the next interview question suitable for this candidate."
            })
        }
    ]);
    if (typeof result.question !== "string" || !result.question.trim()) {
        throw new Error("AI could not generate a valid interview question.");
    }
    return result.question.trim().slice(0, 2000);
};

const evaluateAnswer = async (session, question, answer) => {
    const result = await callGroq([
        {
            role: "system",
            content: "You are a fair, constructive software engineering interviewer. Evaluate the candidate's answer. Return valid JSON with keys: score (integer 0-10), feedback (string), strengths (array of strings), improvements (array of strings), followUp (string or empty). Be specific, do not reward length alone, and do not invent facts."
        },
        {
            role: "user",
            content: JSON.stringify({
                targetRole: session.role,
                category: session.category,
                difficulty: session.difficulty,
                question,
                candidateAnswer: answer
            })
        }
    ]);
    const score = Number(result.score);
    if (!Number.isFinite(score)) throw new Error("AI returned an invalid evaluation.");
    return {
        score: Math.max(0, Math.min(10, Math.round(score))),
        feedback: String(result.feedback || "Answer evaluated.").slice(0, 5000),
        strengths: Array.isArray(result.strengths) ? result.strengths.filter(x => typeof x === "string").slice(0, 5) : [],
        improvements: Array.isArray(result.improvements) ? result.improvements.filter(x => typeof x === "string").slice(0, 5) : [],
        followUp: typeof result.followUp === "string" ? result.followUp.slice(0, 1000) : ""
    };
};

const createFinalReport = async (session) => {
    const result = await callGroq([
        {
            role: "system",
            content: "You are an experienced interview evaluator. Return valid JSON with keys: overallScore (0-100), technicalKnowledge (0-100), problemSolving (0-100), communication (0-100), confidence (0-100), strengths (array of strings), weaknesses (array of strings), recommendations (array of strings). Base every conclusion only on the supplied interview. Keep feedback actionable."
        },
        {
            role: "user",
            content: JSON.stringify({
                role: session.role,
                category: session.category,
                difficulty: session.difficulty,
                answers: session.questions.map(q => ({ question: q.question, answer: q.answer, score: q.score, feedback: q.feedback }))
            })
        }
    ]);
    const score = value => Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Math.round(Number(value)))) : 0;
    const strings = value => Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, 8) : [];
    return {
        overallScore: score(result.overallScore),
        evaluation: {
            technicalKnowledge: score(result.technicalKnowledge),
            problemSolving: score(result.problemSolving),
            communication: score(result.communication),
            confidence: score(result.confidence)
        },
        strengths: strings(result.strengths),
        weaknesses: strings(result.weaknesses),
        recommendations: strings(result.recommendations)
    };
};

module.exports = {
    createInterviewSession,
    getGroqConfiguration,
    generateQuestion,
    evaluateAnswer,
    createFinalReport,
    DEFAULT_DURATION_MINUTES,
    DEFAULT_QUESTION_LIMIT
};
