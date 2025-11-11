import express from "express";
import { router as githubRouter } from "./routes/github.route";
import { config } from "dotenv";
config()

const app = express();
app.use(express.json())

app.use("/api/github", githubRouter);


export default app;
