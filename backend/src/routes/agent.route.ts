import { Router } from "express";
import { chat } from "../controllers/agent.controller.js";

export const router = Router();

router.post("/chat", chat);
