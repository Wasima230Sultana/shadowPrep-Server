import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function evaluateAnswer({
    question,
    expectedTopics,
    userAnswer,
    maxScore,
}) {
    const prompt = `
You are an expert technical interviewer evaluating a candidate's answer.

Question:
${question}

Expected topics:
${expectedTopics.join(", ")}

Candidate's answer:
${userAnswer}

Maximum score:
${maxScore}

Evaluate the candidate based on:
1. Whether the answer is factually correct.
2. Whether the answer addresses the question.
3. How many expected topics are properly covered.
4. The quality and completeness of the explanation.

Do not require the candidate to use the exact wording of the expected topics.
Understand the meaning of the candidate's answer.

Give a fair score from 0 to ${maxScore}.

Return only the requested JSON structure.
`;

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
            responseMimeType: "application/json",

            responseSchema: {
                type: Type.OBJECT,

                properties: {
                    status: {
                        type: Type.STRING,
                        enum: [
                            "Correct",
                            "Partially Correct",
                            "Incorrect",
                        ],
                    },

                    score: {
                        type: Type.NUMBER,
                    },

                    feedback: {
                        type: Type.STRING,
                    },

                    matchedTopics: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },

                    missingTopics: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                        },
                    },
                },

                required: [
                    "status",
                    "score",
                    "feedback",
                    "matchedTopics",
                    "missingTopics",
                ],
            },
        },
    });

    const result = JSON.parse(response.text);

    return {
        status: result.status,
        score: Math.min(
            Math.max(result.score, 0),
            maxScore
        ),
        maxScore,
        percentage: Math.round(
            (result.score / maxScore) * 100
        ),
        feedback: result.feedback,
        matchedTopics: result.matchedTopics,
        missingTopics: result.missingTopics,
    };
}