
import "dotenv/config";
import express from "express"; 
import cors from "cors"; 
import dns from "dns";
import { MongoClient } from 'mongodb';
import { evaluateAnswer } from "./services/aiEvaluator.js";

dns.setDefaultResultOrder('ipv4first');
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express()
const port = process.env.PORT || 3000;

console.log(`Hello ${process.env.HELLO}`)

app.use(cors())
app.use(express.json())


const client = new MongoClient(`mongodb+srv://${process.env.SHADOEPREP_USER}:${process.env.SHADOEPREP_PASS}@cluster0.6tutdbk.mongodb.net/?appName=Cluster0`);

app.get("/", (req, res) => {
    res.send("Hello world");
});

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log(
            "You successfully connected to MongoDB!"
        );

        return client;

    } catch (err) {
        console.dir(err);
    }
}

export async function disconnectFromMongoDB() {
    await client.close();
}


// ===============================
// AI ANSWER EVALUATION
// ===============================




app.post("/api/evaluate-answer", async (req, res) => {
    try {
        const {
            question,
            expectedTopics,
            userAnswer,
            maxScore,
        } = req.body;

        if (!question || !userAnswer || !maxScore) {
            return res.status(400).json({
                message:
                    "Question, userAnswer and maxScore are required",
            });
        }

        const result = await evaluateAnswer({
            question,
            expectedTopics: expectedTopics || [],
            userAnswer,
            maxScore,
        });

        res.json(result);

    } catch (error) {
        console.error("AI evaluation error:", error);

        res.status(500).json({
            message: "Failed to evaluate answer",
            error: error.message,
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




connectToMongoDB();

app.listen(port, () => {
    console.log(
        `ShadowPrep server running on port ${port}`
    );
});