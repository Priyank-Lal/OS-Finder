import { config as dotEnvConfig } from "dotenv";
import path from "path";

dotEnvConfig({
  path: path.resolve(__dirname, "../../.env"),
});

export const _config = {
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  MONGODB_URI: process.env.MONGODB_URI,
};
