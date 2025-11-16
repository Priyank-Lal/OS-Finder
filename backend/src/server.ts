import express from "express";
import { router as githubRouter } from "./routes/github.route";
import { config } from "dotenv";
import cors from "cors";

config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

app.use("/api/github", githubRouter);

export default app;
