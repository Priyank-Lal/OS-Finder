import app from "./server";
import { config } from "dotenv";
import { connectDB } from "./db/db";
import "./scheduler/summarizer.cron"
import "./scheduler/repos.cron";


config();
connectDB()


app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
