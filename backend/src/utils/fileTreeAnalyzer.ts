// File tree analysis utilities

export interface FileTreeNode {
  name: string;
  type: string;
  path?: string;
  children?: FileTreeNode[];
}

export interface FileTreeMetrics {
  totalFiles: number;
  totalDirectories: number;
  maxDepth: number;
  avgDepth: number;
  hasTests: boolean;
  hasDocs: boolean;
  hasCI: boolean;
  hasMonorepo: boolean;
  configFiles: string[];
  lockFiles: string[];
  buildComplexity: number;
  testToCodeRatio: number;
}

/**
 * Flatten GitHub's nested file tree structure
 */
export function flattenFileTree(
  entries: any[],
  parentPath: string = "",
  depth: number = 0
): FileTreeNode[] {
  if (!entries || !Array.isArray(entries)) return [];

  const result: FileTreeNode[] = [];

  for (const entry of entries) {
    const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    const node: FileTreeNode = {
      name: entry.name,
      type: entry.type,
      path,
    };

    result.push(node);

    // Recursively process subdirectories
    if (entry.type === "tree" && entry.object?.entries) {
      const children = flattenFileTree(entry.object.entries, path, depth + 1);
      node.children = children;
      result.push(...children);
    }
  }

  return result;
}

/**
 * Count total files in tree
 */
export function countFiles(nodes: FileTreeNode[]): number {
  return nodes.filter((n) => n.type === "blob").length;
}

/**
 * Count total directories in tree
 */
export function countDirectories(nodes: FileTreeNode[]): number {
  return nodes.filter((n) => n.type === "tree").length;
}

/**
 * Calculate maximum nesting depth
 */
export function getMaxDepth(nodes: FileTreeNode[]): number {
  if (!nodes.length) return 0;

  let maxDepth = 0;
  for (const node of nodes) {
    if (node.path) {
      const depth = node.path.split("/").length;
      maxDepth = Math.max(maxDepth, depth);
    }
  }

  return maxDepth;
}

/**
 * Calculate average nesting depth
 */
export function getAvgDepth(nodes: FileTreeNode[]): number {
  if (!nodes.length) return 0;

  let totalDepth = 0;
  let count = 0;

  for (const node of nodes) {
    if (node.path && node.type === "blob") {
      totalDepth += node.path.split("/").length;
      count++;
    }
  }

  return count > 0 ? totalDepth / count : 0;
}

/**
 * Check if project has test files
 */
export function hasTests(nodes: FileTreeNode[]): boolean {
  const testPatterns = [
    /test/i,
    /spec/i,
    /__tests__/,
    /\.test\./,
    /\.spec\./,
    /cypress/i,
    /jest\.config/,
    /vitest\.config/,
  ];

  return nodes.some(
    (node) =>
      node.path && testPatterns.some((pattern) => pattern.test(node.path!))
  );
}

/**
 * Check if project has documentation
 */
export function hasDocs(nodes: FileTreeNode[]): boolean {
  const docPatterns = [/^docs?\//, /^documentation\//, /\.md$/i];

  return nodes.some(
    (node) =>
      node.path && docPatterns.some((pattern) => pattern.test(node.path!))
  );
}

/**
 * Check if project has CI/CD setup
 */
export function hasCI(nodes: FileTreeNode[]): boolean {
  const ciPatterns = [
    /\.github\/workflows/,
    /\.gitlab-ci/,
    /\.travis\.yml/,
    /Jenkinsfile/,
    /\.circleci/,
    /azure-pipelines/,
  ];

  return nodes.some(
    (node) =>
      node.path && ciPatterns.some((pattern) => pattern.test(node.path!))
  );
}

/**
 * Check if project is a monorepo
 */
export function hasMonorepo(nodes: FileTreeNode[]): boolean {
  // Check for workspace indicators
  const monorepoPatterns = [
    /^packages\//,
    /^apps\//,
    /lerna\.json/,
    /pnpm-workspace\.yaml/,
    /workspace/,
  ];

  return nodes.some(
    (node) =>
      node.path && monorepoPatterns.some((pattern) => pattern.test(node.path!))
  );
}

/**
 * Find all config files
 */
export function findConfigFiles(nodes: FileTreeNode[]): string[] {
  const configPatterns = [
    /webpack\.config/,
    /vite\.config/,
    /rollup\.config/,
    /tsconfig\.json/,
    /babel\.config/,
    /\.eslintrc/,
    /\.prettierrc/,
    /jest\.config/,
    /vitest\.config/,
    /playwright\.config/,
    /cypress\.config/,
    /docker-compose/,
    /Dockerfile/,
    /\.env/,
    /Makefile/,
  ];

  return nodes
    .filter(
      (node) =>
        node.path &&
        node.type === "blob" &&
        configPatterns.some((pattern) => pattern.test(node.path!))
    )
    .map((node) => node.name);
}

/**
 * Find all lock files (indicates dependency complexity)
 */
export function findLockFiles(nodes: FileTreeNode[]): string[] {
  const lockPatterns = [
    /package-lock\.json/,
    /yarn\.lock/,
    /pnpm-lock\.yaml/,
    /Gemfile\.lock/,
    /Cargo\.lock/,
    /composer\.lock/,
    /poetry\.lock/,
    /Pipfile\.lock/,
    /go\.sum/,
  ];

  return nodes
    .filter(
      (node) =>
        node.path &&
        node.type === "blob" &&
        lockPatterns.some((pattern) => pattern.test(node.path!))
    )
    .map((node) => node.name);
}

/**
 * Calculate build complexity score (0-10)
 */
export function calculateBuildComplexity(nodes: FileTreeNode[]): number {
  const configFiles = findConfigFiles(nodes);
  const hasDocker = nodes.some((n) => /Dockerfile/.test(n.path || ""));
  const hasDockerCompose = nodes.some((n) =>
    /docker-compose/.test(n.path || "")
  );
  const hasMakefile = nodes.some((n) => /Makefile/.test(n.path || ""));
  const hasMultipleBuilds = configFiles.length > 3;

  let complexity = 0;

  // Base complexity from config count
  complexity += Math.min(configFiles.length * 0.5, 3);

  // Bonus for containerization
  if (hasDocker) complexity += 1.5;
  if (hasDockerCompose) complexity += 2;

  // Bonus for build orchestration
  if (hasMakefile) complexity += 1;
  if (hasMultipleBuilds) complexity += 1.5;

  // Monorepo adds significant complexity
  if (hasMonorepo(nodes)) complexity += 2;

  return Math.min(complexity, 10);
}

/**
 * Calculate test-to-code ratio
 */
export function calculateTestRatio(nodes: FileTreeNode[]): number {
  const allFiles = nodes.filter((n) => n.type === "blob");
  const testFiles = allFiles.filter(
    (n) =>
      n.path &&
      (/test/i.test(n.path) || /spec/i.test(n.path) || /__tests__/.test(n.path))
  );

  if (allFiles.length === 0) return 0;
  return testFiles.length / allFiles.length;
}

/**
 * Analyze complete file tree and return metrics
 */
export function analyzeFileTree(fileTreeData: any): FileTreeMetrics {
  const entries = fileTreeData?.entries || [];
  const flatTree = flattenFileTree(entries);

  return {
    totalFiles: countFiles(flatTree),
    totalDirectories: countDirectories(flatTree),
    maxDepth: getMaxDepth(flatTree),
    avgDepth: getAvgDepth(flatTree),
    hasTests: hasTests(flatTree),
    hasDocs: hasDocs(flatTree),
    hasCI: hasCI(flatTree),
    hasMonorepo: hasMonorepo(flatTree),
    configFiles: findConfigFiles(flatTree),
    lockFiles: findLockFiles(flatTree),
    buildComplexity: calculateBuildComplexity(flatTree),
    testToCodeRatio: calculateTestRatio(flatTree),
  };
}

/**
 * Get file tree as string array for AI analysis
 */
export function fileTreeToStringArray(
  fileTreeData: any,
  maxDepth: number = 3,
  maxItems: number = 100
): string[] {
  const entries = fileTreeData?.entries || [];
  const flatTree = flattenFileTree(entries);

  return flatTree
    .filter((node) => {
      if (!node.path) return false;
      const depth = node.path.split("/").length;
      return depth <= maxDepth;
    })
    .slice(0, maxItems)
    .map((node) => node.path!)
    .sort();
}
