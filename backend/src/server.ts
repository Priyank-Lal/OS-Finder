import express from "express";
import { router as githubRouter } from "./routes/github.route";

const app = express();
app.use(express.json())
app.use("/api/github", githubRouter);


export default app;
