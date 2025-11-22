import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, END, START } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { searchRepos, getRepoDetails } from "./tools.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
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
const allTools = [...finderTools, ...analystTools];

// --- 3. Define Worker Nodes ---

// Finder Agent: Searches for repositories
const finderNode = async (state: typeof AgentState.State) => {
  console.log("Finder agent invoked");
  
  const systemPrompt = `You are a Finder agent specialized in searching for open source repositories.
Your role is to:
1. Search for repositories using the 'search_repos' tool based on user criteria
2. Return a concise list of repositories with their IDs, names, and scores
3. If the user asks for details about specific repos, tell them the Analyst will help

Use the search_repos tool to find repositories. Be specific and helpful.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const result = await model.bindTools(finderTools).invoke(messages);
  console.log("Finder result:", result.content);
  
  return {
    messages: [result],
  };
};

// Analyst Agent: Analyzes repository details
const analystNode = async (state: typeof AgentState.State) => {
  console.log("Analyst agent invoked");
  
  const systemPrompt = `You are an Analyst agent specialized in analyzing repository details.
Your role is to:
1. Get detailed information about specific repositories using 'get_repo_details'
2. Analyze metrics like code quality, maintainer activity, issue health
3. Provide insights about suitability for contribution

Use the get_repo_details tool with repository IDs. Provide thorough analysis.`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  const result = await model.bindTools(analystTools).invoke(messages);
  console.log("Analyst result:", result.content);
  
  return {
    messages: [result],
  };
};

// --- 4. Define Supervisor Node ---

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
2. If user wants DETAILS/ANALYSIS of specific repos → route to "Analyst"  
3. If the question is fully answered → route to "FINISH"
4. If a worker just completed a task, check if more work is needed or if we can FINISH

Current conversation state: ${state.messages.length} messages
Last message type: ${state.messages[state.messages.length - 1]?.constructor.name}

Decide which worker should act next.`;

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
    // Default to FINISH on error to prevent infinite loops
    return { 
      next: "FINISH",
      messages: [new AIMessage("[Supervisor: Error occurred, finishing conversation]")]
    };
  }
};

// --- 5. Tool Execution Nodes ---
const finderToolNode = new ToolNode(finderTools);
const analystToolNode = new ToolNode(analystTools);

// --- 6. Construct Graph ---

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

// After tools execute, go back to supervisor for next decision
workflow.addEdge("FinderTools", "Supervisor");
workflow.addEdge("AnalystTools", "Supervisor");

// Compile with recursion limit to prevent infinite loops
export const agentGraph = workflow.compile({
  // @ts-ignore
  recursionLimit: 20, // Prevent infinite loops
});

console.log("✓ Multi-agent graph compiled successfully");
