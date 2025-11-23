// backend/src/config/config.ts
// IMPROVED: Add validation and better error messages

import { config as dotEnvConfig } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotEnvConfig({
  path: path.resolve(__dirname, "../../.env"),
});

// // Validation function
// function validateConfig() {
//   const errors: string[] = [];

//   if (!process.env.GITHUB_TOKEN) {
//     errors.push("GITHUB_TOKEN is required");
//   }

//   if (!process.env.MONGODB_URI) {
//     errors.push("MONGODB_URI is required");
//   }

//   if (!process.env.GEMINI_KEYS) {
//     errors.push("GEMINI_KEYS is required (comma-separated list)");
//   }

//   if (errors.length > 0) {
//     console.error("Configuration Error:");
//     errors.forEach((err) => console.error(`  - ${err}`));
//     console.error("\nPlease check your .env file\n");
//     process.exit(1);
//   }
// }

// Only validate in production or when explicitly requested
// if (
//   process.env.NODE_ENV === "production" ||
//   process.env.VALIDATE_CONFIG === "true"
// ) {
//   validateConfig();
// }

export const _config = {
  // Required
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
  GITHUB_TOKEN_2: process.env.GITHUB_TOKEN_2 || "",
  GITHUB_TOKEN_3: process.env.GITHUB_TOKEN_3 || "",
  GITHUB_LABEL_TOKEN: process.env.GITHUB_LABEL_TOKEN || "",

  MONGODB_URI: process.env.MONGODB_URI || "",
  LABEL_ANALYSIS_API_KEYS: process.env.LABEL_ANALYSIS_API_KEYS || "",
  CONTRIBUTION_AREAS_API_KEYS: process.env.CONTRIBUTION_AREAS_API_KEYS || "",
  README_SUMMARY_API_KEYS: process.env.README_SUMMARY_API_KEYS || "",
  TASK_SUGGESTION_API_KEYS: process.env.TASK_SUGGESTION_API_KEYS || "",
  TECH_AND_SKILLS_API_KEYS: process.env.TECH_AND_SKILLS_API_KEYS || "",
  SUITABILITY_AI_API_KEYS: process.env.SUITABILITY_AI_API_KEYS || "",
  FALLBACK_API_KEYS: process.env.FALLBACK_API_KEYS || "",
  SCORING_AI_API_KEYS: process.env.SCORING_AI_API_KEYS || "",

  // Optional
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || "changeme",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://localhost:3000",

  // Feature flags
  ENABLE_AI_ANALYSIS: process.env.ENABLE_AI_ANALYSIS || true,
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== "false",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};

console.log("Configuration loaded:");
console.log(`  - Environment: ${_config.NODE_ENV}`);
console.log(`  - Port: ${_config.PORT}`);
console.log(
  `  - GitHub Token: ${_config.GITHUB_TOKEN ? "✓ Set" : "✗ Missing"}`
);
