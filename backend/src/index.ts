import app from "./server.js";
import { config } from "dotenv";
import { connectDB } from "./db/db.js";
import "./scheduler/summarizer.cron.js"
import "./scheduler/repos.cron.js";


config();
connectDB()


app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
