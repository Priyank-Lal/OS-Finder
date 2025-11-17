export const WEIGHTS = {
  // Beginner Friendliness (0-100)
  beginner: {
    documentation: 0.25, // Good docs, CONTRIBUTING.md
    issueLabels: 0.2, // Good first issues, help wanted
    communitySize: 0.15, // Active, responsive community
    codebaseSimplicity: 0.25, // Low cyclomatic complexity, clear structure
    setupEase: 0.15, // Easy to set up and run
  },

  // Technical Complexity (0-100)
  complexity: {
    codebaseSize: 0.2, // Lines of code, file count
    architectureDepth: 0.25, // Layers, abstractions, patterns
    dependencies: 0.15, // Number and depth of dependencies
    languageFeatures: 0.2, // Advanced language features used
    domainComplexity: 0.2, // Problem domain difficulty
  },

  // Contribution Readiness (0-100)
  contribution: {
    issueQuality: 0.25, // Well-defined issues
    prActivity: 0.25, // PR merge rate and speed
    maintainerResponse: 0.2, // How active maintainers are
    testCoverage: 0.15, // Tests present
    cicd: 0.15, // CI/CD setup
  },
};
