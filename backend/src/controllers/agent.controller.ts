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
    const { message, threadId } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeUserInput(message);
    console.log("User message:", sanitizedMessage);
    
    // Use threadId for conversation persistence, or generate a default one
    const conversationThreadId = threadId || "default-thread";
    console.log("Thread ID:", conversationThreadId);

    // Build message
    const userMessage = new HumanMessage(sanitizedMessage);

    // Invoke the graph with thread configuration for memory
    const inputs = { messages: [userMessage] };
    const config = {
      configurable: { thread_id: conversationThreadId },
      recursionLimit: 25,
    };
    
    console.log(`Invoking agent graph...`);
    
    const startTime = Date.now();
    const result = await agentGraph.invoke(inputs, config);
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
      threadId: conversationThreadId, // Return thread ID for client to use in next request
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
