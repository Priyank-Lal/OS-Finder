import express from "express";
import { router as githubRouter } from "./routes/github.route.js";
import { config } from "dotenv";
import cors from "cors";
import helmet from "helmet";
// import rateLimit from "express-rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";

config();

const app = express();

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Request: ${req.method} ${req.path}`);
  next();
});

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const fetchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit fetch endpoint to 10 requests per hour
  message: "Too many fetch requests, please try again later",
});
*/

// Health check endpoint for uptime monitors (keeps Render awake)
// Define BEFORE rate limiters to avoid blocking
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Apply rate limiting
// app.use("/api/", limiter);
// app.use("/api/github/fetch", fetchLimiter);



// Routes
app.use("/api/github", githubRouter);
// app.use("/api/agent", agentRouter);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
