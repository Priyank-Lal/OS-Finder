/**
 * Clean markdown content for AI processing by removing images and other noise
 */
export function cleanMarkdownForAI(markdown: string): string {
  if (!markdown) return "";

  let cleaned = markdown;

  // Remove markdown images: ![alt text](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, "");

  // Remove HTML image tags: <img src="..." />
  cleaned = cleaned.replace(/<img[^>]*>/gi, "");

  // Remove HTML comments: <!-- comment -->
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}
