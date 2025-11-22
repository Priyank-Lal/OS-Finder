import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END, START, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { searchRepos, getRepoDetails } from "./tools.js";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { _config } from "../config/config.js";
import { z } from "zod";

// --- 1. Initialize Model ---

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0.3,
  apiKey: _config.AGENT_API_KEY
});

// --- 2. Define Tools for Workers ---
const finderTools = [searchRepos];
const analystTools = [getRepoDetails];

// --- 3. Helper to extract repo IDs from conversation ---
function extractRepoIdsFromMessages(messages: any[]): string[] {
  const repoIds: string[] = [];
  
  // Look through recent messages for repo IDs in tool results or AI messages
  for (const msg of messages.slice(-10)) { // Check last 10 messages
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    
    // Match patterns like "id": "MDEwOlJlcG9zaXRvcnk..." or repoId: "..."
    const idMatches = content.match(/"id":\s*"([^"]+)"|"repoId":\s*"([^"]+)"/g);
    if (idMatches) {
      idMatches.forEach((match: string) => {
        const id = match.match(/"([^"]+)"$/)?.[1];
        if (id && id.length > 10) { // GitHub repo IDs are long base64 strings
          repoIds.push(id);
        }
      });
    }
  }
  
  return [...new Set(repoIds)]; // Remove duplicates
}

// --- 4. Define Worker Nodes ---

// Finder Agent: Searches for repositories
const finderNode = async (state: typeof AgentState.State) => {
  console.log("Finder agent invoked");
  
  try {
    // Check if there are recent tool results from search_repos
    const recentToolResults = state.messages
      .slice(-3)
      .filter(m => m instanceof ToolMessage)
      // @ts-ignore
      .filter(m => m.name === 'search_repos');
    
    // If we have tool results, extract and return the JSON directly
    if (recentToolResults.length > 0) {
      const toolResult = recentToolResults[recentToolResults.length - 1];
      const content = typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content);
      
      try {
        // Parse and re-stringify to ensure it's valid JSON
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          console.log("Finder returning JSON array with", parsed.length, "repos");
          return {
            messages: [new AIMessage(JSON.stringify(parsed))],
          };
        }
      } catch (e) {
        console.log("Tool result was not JSON, falling back to model");
      }
    }
    
    const systemPrompt = `You are a Finder agent specialized in searching for open source repositories.

Your role is to:
1. ALWAYS use the 'search_repos' tool when the user asks to find repositories
2. Extract language and keywords from the user's request
3. Be proactive - use reasonable defaults if information is missing:
   - "JS repos" → language="JavaScript", query=""
   - "popular Python" → language="Python", query="popular"
   - "React frameworks" → language="JavaScript", query="react framework"

CRITICAL - OUTPUT FORMAT:
After the tool returns results, you MUST:
1. Parse the tool's JSON response
2. Return ONLY a JSON array - nothing else
3. Each object must have: id, name, description, language, score, stars
4. Example format: [{"id":"MDEw...","name":"repo-name","description":"A cool repo","language":"JavaScript","score":85,"stars":1000}]

RULES:
- NO text before the JSON array
- NO text after the JSON array  
- NO markdown code blocks (no \`\`\`)
- NO explanations or comments
- JUST the raw JSON array

IMPORTANT: Don't ask for more information - search with what you have!`;

    // Get recent user messages (not system/supervisor messages)
    const recentMessages = state.messages
      .filter(m => !(m.content as string)?.includes('[Supervisor:'))
      .slice(-3); // Last 3 relevant messages

    const messages = [
      new SystemMessage(systemPrompt),
      ...recentMessages,
    ];

    const result = await model.bindTools(finderTools).invoke(messages);
    console.log("Finder result:", result.content);
    
    return {
      messages: [result],
    };
  } catch (error: any) {
    console.error("Finder node error:", error.message);
    return {
      messages: [new AIMessage("I encountered an error while searching. Please try rephrasing your request.")],
    };
  }
};

// Analyst Agent: Analyzes repository details
const analystNode = async (state: typeof AgentState.State) => {
  console.log("Analyst agent invoked");
  
  try {
    // Extract repo IDs from conversation history
    const availableRepoIds = extractRepoIdsFromMessages(state.messages);
    console.log("Available repo IDs from conversation:", availableRepoIds.slice(0, 3));
    
    // Limit to 3 repo IDs to avoid overwhelming the prompt
    const limitedRepoIds = availableRepoIds.slice(0, 3);
    
    const systemPrompt = `You are an Analyst agent specialized in analyzing repository details.

Your role is to:
1. Get detailed information about repositories using 'get_repo_details'
2. Use repo IDs from the conversation - they're in previous Finder results
3. Analyze metrics like code quality, maintainer activity, issue health
4. Provide insights about suitability for contribution

${limitedRepoIds.length > 0 ? `\nAvailable repository IDs from recent conversation:\n${limitedRepoIds.map((id, i) => `${i + 1}. ${id}`).join('\n')}\n\nUse these IDs with the get_repo_details tool.` : 'Ask the Finder to search for repositories first if no IDs are available.'}

IMPORTANT OUTPUT FORMAT:
After receiving tool results, return ONLY a JSON object (NOT an array) with this structure:
{
  "id": "repo_id",
  "name": "repo_name",
  "description": "brief description",
  "language": "primary_language",
  "stars": number,
  "score": number,
  "overview": "2-3 sentence overview of what the repo does",
  "activity": {
    "commits": "recent commit activity description",
    "contributors": "contributor information",
    "lastUpdate": "when last updated"
  },
  "health": {
    "issues": "issue status and response time",
    "pullRequests": "PR merge rate and activity",
    "maintenance": "maintenance status"
  },
  "technical": {
    "dependencies": "key dependencies",
    "size": "codebase size",
    "topics": ["topic1", "topic2"]
  },
  "contribution": {
    "difficulty": "beginner/intermediate/advanced",
    "opportunities": "what kind of contributions are welcome",
    "guidelines": "brief contribution guidelines"
  }
}

Do NOT add any text before or after the JSON object.
Do NOT wrap it in markdown code blocks.

IMPORTANT: Use the repo IDs from above. Don't ask the user for IDs!`;

    // Find the most recent user message
    const userMessages = state.messages.filter(m => m instanceof HumanMessage);
    const latestUserMessage = userMessages[userMessages.length - 1];
    
    // Check if there are recent Analyst tool results (from get_repo_details)
    const recentAnalystMessages = [];
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const msg = state.messages[i];
      
      // Stop if we hit a Supervisor message (start of this Analyst turn)
      if (msg instanceof AIMessage && (msg.content as string)?.includes('[Supervisor:')) {
        break;
      }
      
      // Include Analyst's own AI messages with get_repo_details tool calls
      if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
        if (msg.tool_calls.some(tc => tc.name === 'get_repo_details')) {
          recentAnalystMessages.unshift(msg);
        }
      }
      
      // Include tool results for get_repo_details
      if (msg instanceof ToolMessage) {
        // @ts-ignore - name exists on ToolMessage
        if (msg.name === 'get_repo_details') {
          recentAnalystMessages.unshift(msg);
        }
      }
    }
    
    // Build messages: system prompt + user message + any tool interaction from this turn
    const messages = [
      new SystemMessage(systemPrompt),
      latestUserMessage || new HumanMessage("Analyze the repositories found earlier."),
      ...recentAnalystMessages,
    ];

    console.log("Analyst invoking model with messages:", messages.length, "types:", messages.map(m => m.constructor.name));
    const result = await model.bindTools(analystTools).invoke(messages);
    console.log("Analyst result:", result.content);
    
    return {
      messages: [result],
    };
  } catch (error: any) {
    console.error("Analyst node error:", error.message);
    // Return a helpful error message instead of crashing
    return {
      messages: [new AIMessage("I encountered an error while analyzing. Could you try asking about specific repositories by name?")],
    };
  }
};

// --- 5. Define Supervisor Node ---

const supervisorSchema = z.object({
  next: z.enum(["Finder", "Analyst", "FINISH"]).describe("The next worker to route to"),
  reasoning: z.string().describe("Brief explanation of why this worker was chosen"),
});

const supervisorNode = async (state: typeof AgentState.State) => {
  console.log("Supervisor invoked, message count:", state.messages.length);
  
  try {
    const systemPrompt = `You are a supervisor managing a team of specialized agents to help users find open source repositories.

Your team:
- Finder: Searches for repositories based on keywords, languages, topics, scores
- Analyst: Gets detailed information about specific repositories (issues, health, activity)

Routing rules:
1. If user wants to SEARCH/FIND repositories → route to "Finder"
2. If user wants DETAILS/ANALYSIS of repos (and Finder already provided results) → route to "Analyst"  
3. If the question is fully answered → route to "FINISH"
4. If a worker just completed a task successfully, check if more work is needed or FINISH

IMPORTANT: 
- Don't loop infinitely - if a worker already answered, move to FINISH
- The Analyst can access repo IDs from Finder's previous results automatically
- If Finder returned repos and user asks for details, route to Analyst
- If Finder just returned search results, route to FINISH so the user can see them

Current conversation: ${state.messages.length} messages`;

    const messages = [
      new SystemMessage(systemPrompt),
      ...state.messages,
    ];

    const decision = await model.withStructuredOutput(supervisorSchema).invoke(messages);
    
    console.log("Supervisor decision:", decision);

    return { 
      next: decision.next,
      messages: [new AIMessage(`[Supervisor: Routing to ${decision.next}. ${decision.reasoning}]`)]
    };
  } catch (error) {
    console.error("Supervisor Error:", error);
    return { 
      next: "FINISH",
      messages: [new AIMessage("[Supervisor: Error occurred, finishing conversation]")]
    };
  }
};

// --- 6. Tool Execution Nodes (using proper ToolNode) ---
const finderToolNode = new ToolNode(finderTools);
const analystToolNode = new ToolNode(analystTools);

// --- 7. Construct Graph ---

const workflow = new StateGraph(AgentState)
  .addNode("Supervisor", supervisorNode)
  .addNode("Finder", finderNode)
  .addNode("Analyst", analystNode)
  .addNode("FinderTools", finderToolNode)
  .addNode("AnalystTools", analystToolNode);

// Start with supervisor
workflow.addEdge(START, "Supervisor");

// Supervisor routes to workers or END
workflow.addConditionalEdges("Supervisor", (state) => {
  console.log("Supervisor routing to:", state.next);
  if (state.next === "FINISH") {
    return END;
  }
  return state.next;
});

// Finder: Check if it needs to call tools
workflow.addConditionalEdges("Finder", (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  // @ts-ignore - tool_calls exists on AIMessage
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log("Finder calling tools");
    return "FinderTools";
  }
  console.log("Finder done, returning to Supervisor");
  return "Supervisor";
});

// Analyst: Check if it needs to call tools
workflow.addConditionalEdges("Analyst", (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  // @ts-ignore - tool_calls exists on AIMessage
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log("Analyst calling tools");
    return "AnalystTools";
  }
  console.log("Analyst done, returning to Supervisor");
  return "Supervisor";
});

// After tools execute, go back to the agent to summarize/process the results
workflow.addEdge("FinderTools", "Finder");
workflow.addEdge("AnalystTools", "Analyst");

// --- 8. Compile with MemorySaver for conversation history ---
const checkpointer = new MemorySaver();

export const agentGraph = workflow.compile({
  checkpointer,
});

console.log("✓ Multi-agent graph compiled successfully with MemorySaver");
