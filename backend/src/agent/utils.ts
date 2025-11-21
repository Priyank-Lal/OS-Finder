/**
 * Utility functions for the multi-agent system
 */

import { BaseMessage, AIMessage, ToolMessage, HumanMessage } from "@langchain/core/messages";

/**
 * Extract the final user-facing response from agent messages
 */
export function extractFinalResponse(messages: BaseMessage[]): string {
  // Work backwards through messages to find the last meaningful response
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    
    // Skip supervisor routing messages
    if (msg.content && typeof msg.content === 'string' && msg.content.startsWith('[Supervisor:')) {
      continue;
    }
    
    // Skip empty messages
    if (!msg.content || msg.content === '') {
      continue;
    }
    
    // Skip tool call messages (they don't have readable content)
    if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
      continue;
    }
    
    // Found a good response from an agent or tool result
    if (msg instanceof AIMessage || msg instanceof ToolMessage) {
      return msg.content as string;
    }
  }
  
  // Fallback
  return "I've processed your request. Please let me know if you need more information.";
}

/**
 * Format repository data for better readability
 */
export function formatRepositoryList(repos: any[]): string {
  return repos.map((repo, idx) => {
    const name = repo.name || repo.repo_name;
    const id = repo.id || repo.repoId;
    const score = repo.score || repo.overall_score;
    const summary = repo.summary || repo.description;
    const categories = repo.categories || [];
    
    let formatted = `${idx + 1}. **${name}** (ID: \`${id}\`)
   - Language: ${repo.language}
   - Score: ${score}/100 ${getScoreEmoji(score)}
   - Stars: ⭐ ${formatNumber(repo.stars)}`;
    
    // Add categories if available
    if (categories.length > 0) {
      formatted += `\n   - Categories: ${categories.slice(0, 3).join(', ')}`;
    }
    
    // Add summary
    if (summary) {
      formatted += `\n   - ${summary}`;
    }
    
    return formatted;
  }).join('\n\n');
}

/**
 * Format detailed repository information
 */
export function formatRepositoryDetails(repo: any): string {
  const sections = [];
  
  // Basic Info
  sections.push(`# ${repo.repo_name || repo.name}`);
  sections.push(`**Language:** ${repo.language}`);
  sections.push(`**Stars:** ⭐ ${formatNumber(repo.stars)}`);
  sections.push(`**Overall Score:** ${repo.overall_score}/100 ${getScoreEmoji(repo.overall_score)}`);
  
  if (repo.description) {
    sections.push(`\n**Description:** ${repo.description}`);
  }
  
  // Scores
  sections.push(`\n## Contribution Metrics`);
  sections.push(`- **Beginner Friendliness:** ${repo.beginner_friendliness}/100`);
  sections.push(`- **Technical Complexity:** ${repo.technical_complexity}/100`);
  sections.push(`- **Contribution Readiness:** ${repo.contribution_readiness}/100`);
  sections.push(`- **Recommended Level:** ${repo.recommended_level}`);
  
  // Issues
  if (repo.issue_data) {
    sections.push(`\n## Issues`);
    sections.push(`- **Total Open:** ${repo.issue_data.total_open}`);
    sections.push(`- **Good First Issues:** ${repo.issue_data.good_first_issue} 🎯`);
    sections.push(`- **Help Wanted:** ${repo.issue_data.help_wanted}`);
    sections.push(`- **Bugs:** ${repo.issue_data.bug}`);
    sections.push(`- **Enhancements:** ${repo.issue_data.enhancement}`);
  }
  
  // Activity
  if (repo.activity) {
    sections.push(`\n## Activity`);
    if (repo.activity.avg_pr_merge_hours) {
      sections.push(`- **Avg PR Merge Time:** ${Math.round(repo.activity.avg_pr_merge_hours)} hours`);
    }
    if (repo.activity.pr_merge_ratio) {
      sections.push(`- **PR Merge Ratio:** ${(repo.activity.pr_merge_ratio * 100).toFixed(1)}%`);
    }
    if (repo.activity.maintainer_activity_score) {
      sections.push(`- **Maintainer Activity:** ${repo.activity.maintainer_activity_score}/100`);
    }
  }
  
  // Beginner Tasks
  if (repo.beginner_tasks && repo.beginner_tasks.length > 0) {
    sections.push(`\n## Suggested Beginner Tasks`);
    repo.beginner_tasks.slice(0, 3).forEach((task: any, idx: number) => {
      sections.push(`${idx + 1}. **${task.title}** (${task.approx_effort} effort)`);
      sections.push(`   ${task.why}`);
    });
  }
  
  return sections.join('\n');
}

/**
 * Format tool results intelligently based on content
 */
export function formatToolResults(content: string): string {
  try {
    const parsed = JSON.parse(content);
    
    if (Array.isArray(parsed)) {
      // Repository list
      return formatRepositoryList(parsed);
    } else if (typeof parsed === 'object' && parsed.repoId) {
      // Single repository details
      return formatRepositoryDetails(parsed);
    } else if (typeof parsed === 'object') {
      // Generic object - pretty print
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not JSON, return as is
    return content;
  }
  
  return content;
}

/**
 * Get emoji based on score
 */
function getScoreEmoji(score: number): string {
  if (score >= 80) return '🌟';
  if (score >= 60) return '✨';
  if (score >= 40) return '⭐';
  return '💫';
}

/**
 * Format large numbers with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(input: string): string {
  // Remove excessive whitespace
  let sanitized = input.trim().replace(/\s+/g, ' ');
  
  // Limit length
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }
  
  return sanitized;
}

/**
 * Check if a message indicates the conversation should end
 */
export function shouldEndConversation(messages: BaseMessage[]): boolean {
  if (messages.length > 50) {
    // Too many messages, force end
    return true;
  }
  
  // Check for completion indicators
  const lastFewMessages = messages.slice(-5);
  const hasFinishIndicator = lastFewMessages.some(msg => 
    msg.content && 
    typeof msg.content === 'string' && 
    (msg.content.includes('FINISH') || msg.content.includes('[Supervisor: Routing to FINISH'))
  );
  
  return hasFinishIndicator;
}

/**
 * Extract repository IDs from text
 */
export function extractRepoIds(text: string): string[] {
  // Match patterns like "owner/repo" or just "repo-id"
  const patterns = [
    /\b([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)\b/g, // owner/repo
    /ID:\s*`?([a-zA-Z0-9_\/-]+)`?/gi, // ID: repo-id
  ];
  
  const ids = new Set<string>();
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        ids.add(match[1]);
      }
    }
  }
  
  return Array.from(ids);
}
