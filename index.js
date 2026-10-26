
import "dotenv/config";
import express from "express"; 
import cors from "cors"; 
import dns from "dns";
import { MongoClient } from 'mongodb';
import { evaluateAnswerWithAI } from "./services/aiEvaluator.js";

dns.setDefaultResultOrder('ipv4first');
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express()
const port = process.env.PORT || 3000;
app.use(cors())
app.use(express.json())
const client = new MongoClient(process.env.MONGODB_URI);

app.get("/", (req, res) => {
    res.send("Hello world");
});

export async function connectToMongoDB() {
    try {
        await client.connect();

        console.log("You successfully connected to MongoDB!");

        return client;
    } catch (err) {
        console.error("MongoDB connection error:", err);
        throw err;
    }
}

// app.post("/api/evaluate-answer", async (req, res) => {
//     try {
//         const {
//             question,
//             expectedTopics,
//             userAnswer,
//             maxScore,
//         } = req.body;

//         if (!question || !userAnswer || !maxScore) {
//             return res.status(400).json({
//                 message:
//                     "Question, userAnswer and maxScore are required",
//             });
//         }

//         const result = await evaluateAnswer({
//             question,
//             expectedTopics: expectedTopics || [],
//             userAnswer,
//             maxScore,
//         });

//         res.json(result);

//     } catch (error) {
//         console.error("AI evaluation error:", error);

//         res.status(500).json({
//             message: "Failed to evaluate answer",
//             error: error.message,
//         });
//     }
// });


app.post("/api/evaluate-answer", async (req, res) => {
    try {
        const {
            question,
            expectedTopics,
            userAnswer,
            maxScore,
        } = req.body;

        if (
            !question ||
            !userAnswer ||
            maxScore == null ||
            !Number.isFinite(Number(maxScore)) ||
            Number(maxScore) <= 0
        ) {
            return res.status(400).json({
                message:
                    "Question, userAnswer and a valid maxScore are required",
            });
        }

        console.log("Starting AI evaluation:", {
            questionProvided: Boolean(question),
            userAnswerProvided: Boolean(userAnswer),
            expectedTopicsCount: Array.isArray(expectedTopics)
                ? expectedTopics.length
                : 0,
            maxScore,
        });

        const result = await evaluateAnswerWithAI({
            question,
            expectedTopics: Array.isArray(expectedTopics)
                ? expectedTopics
                : [],
            userAnswer,
            maxScore: Number(maxScore),
        });

        console.log("AI evaluation completed successfully");

        return res.status(200).json(result);

    } catch (error) {
        console.error("AI evaluation error:", error);

        return res.status(500).json({
            message: "Failed to evaluate answer",
        });
    }
});

app.post("/api/interviews", async (req, res) => {
    try {
        const {
            userId,
            categoryId,
            categoryName,
            totalQuestions,
            answered,
            skipped,
            totalScore,
            maxScore,
            percentage,
            answers,
        } = req.body;

        if (!userId) {
            return res.status(400).json({
                message: "userId is required",
            });
        }

        const db = client.db("shadowprep");

        const interviewResultsCollection =
            db.collection("interviewResults");

        const interview = {
            userId,
            categoryId,
            categoryName,

            totalQuestions,
            answered,
            skipped,

            totalScore,
            maxScore,
            percentage,

            answers,

            createdAt: new Date(),
        };

        const result =
            await interviewResultsCollection.insertOne(
                interview
            );

        res.status(201).json({
            message: "Interview saved successfully",
            interviewId: result.insertedId,
        });

    } catch (error) {
        console.error(
            "Save interview error:",
            error
        );

        res.status(500).json({
            message: "Failed to save interview",
            error: error.message,
        });
    }
});
app.get("/api/interviews/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                message: "userId is required",
            });
        }

        const db = client.db("shadowprep");

        const interviewResultsCollection =
            db.collection("interviewResults");

        const interviews =
            await interviewResultsCollection
                .find({ userId })
                .sort({ createdAt: -1 })
                .toArray();

        res.json(interviews);

    } catch (error) {
        console.error(
            "Fetch interviews error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch interviews",
            error: error.message,
        });
    }
});
app.get("/api/interviews/result/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const db = client.db("shadowprep");
        const interviewResultsCollection =
            db.collection("interviewResults");

        const { ObjectId } = await import("mongodb");

        const interview =
            await interviewResultsCollection.findOne({
                _id: new ObjectId(id),
            });

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found",
            });
        }

        res.json(interview);

    } catch (error) {
        console.error(
            "Fetch interview result error:",
            error
        );

        res.status(500).json({
            message: "Failed to fetch interview result",
            error: error.message,
        });
    }
});

async function startServer() {
    try {
        await connectToMongoDB();

        app.listen(port, () => {
            console.log(
                `ShadowPrep server running on port ${port}`
            );
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();