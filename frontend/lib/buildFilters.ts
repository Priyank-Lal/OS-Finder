export function buildRepoQueryParams({
  lang,
  page,
  category,
  topic,
  level,
  sortBy,
  search,
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

  // Pagination
  params.page = String(page || 1);
  params.limit = "20"; // frontend constant for now

  return params;
}
