import app from "./server";
import { config } from "dotenv";
import { connectDB } from "./db/db";

config();
connectDB()

const PORT = process.env.PORT || 5000;

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
