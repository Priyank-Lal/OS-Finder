export function buildRepoQueryParams({
  lang,
  page,
  category,
  topic,
  level,
  sortBy,
  search,
  minStars,
  maxIssues,
  minScore,
  prMergeTime,
}: any) {
  const params: Record<string, string> = {};

  // Language
  if (lang && lang !== "all") {
    params.lang = lang;
  }

  // Difficulty level
  if (level && level !== "all") {
    params.level = level;
  }

  // Category & Topic
  if (category) params.category = category;
  if (topic) params.topic = topic;

  // Sorting
  if (sortBy && sortBy !== "relevance") {
    params.sortBy = sortBy;
  }

  // Search
  if (search && search.trim().length > 0) {
    params.search = search.trim();
  }

  // Advanced Filters
  if (minStars > 0) params.minStars = String(minStars);
  if (maxIssues !== null && maxIssues !== undefined) params.maxIssues = String(maxIssues);
  if (minScore > 0) params.minScore = String(minScore);
  if (prMergeTime && prMergeTime !== "all") params.prMergeTime = prMergeTime;

  // Pagination
  params.page = String(page || 1);
  params.limit = "20"; // frontend constant for now

  return params;
}
