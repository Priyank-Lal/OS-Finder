import mongoose from "mongoose";
import { _config } from "../config/config";

export async function connectDB() {
  try {
    await mongoose.connect(_config.MONGODB_URI || "");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
