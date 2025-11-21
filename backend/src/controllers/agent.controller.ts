import { Request, Response, NextFunction } from "express";
import { agentGraph } from "../agent/graph.js";
import { HumanMessage } from "@langchain/core/messages";
import { 
  extractFinalResponse, 
  formatToolResults, 
  sanitizeUserInput 
} from "../agent/utils.js";

export const chat = async (req: Request, res: Response, next: NextFunction) => {
  console.log("\n=== Chat Request Started ===");
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeUserInput(message);
    console.log("User message:", sanitizedMessage);

    // Build message history
    const messages = [];
    
    // Add conversation history if provided (limit to last 10 messages to prevent context overflow)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-10);
      messages.push(...recentHistory);
    }
    
    // Add current user message
    messages.push(new HumanMessage(sanitizedMessage));

    // Invoke the graph
    const inputs = { messages };
    console.log(`Invoking agent graph with ${messages.length} messages...`);
    
    const startTime = Date.now();
    const result = await agentGraph.invoke(inputs, {
      recursionLimit: 20,
    });
    const duration = Date.now() - startTime;
    
    console.log(`Agent completed in ${duration}ms. Total messages: ${result.messages.length}`);
    
    // Extract the final response
    let finalResponse = extractFinalResponse(result.messages);
    
    // Format if it looks like tool results
    if (finalResponse.includes('"repoId"') || finalResponse.includes('"repo_name"')) {
      finalResponse = formatToolResults(finalResponse);
    }
    
    console.log("Final response length:", finalResponse.length);
    console.log("=== Chat Request Completed ===\n");
    
    res.json({ 
      response: finalResponse,
      messageCount: result.messages.length,
      duration: duration,
      conversationHistory: result.messages.slice(-20) // Return last 20 messages for context
    });
  } catch (error: any) {
    console.error("Chat Error:", error);
    
    // Handle specific error types
    if (error.message?.includes('Recursion limit')) {
      res.status(500).json({ 
        error: "The conversation became too complex. Please try rephrasing your question.",
        details: "Recursion limit reached"
      });
      return;
    }
    
    if (error.message?.includes('API key')) {
      res.status(500).json({ 
        error: "Configuration error. Please contact support.",
        details: "API key issue"
      });
      return;
    }
    
    next(error);
  }
};
