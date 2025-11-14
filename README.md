🛰️ OS-Finder

OS-Finder helps developers discover high-quality open-source repositories to contribute to by analyzing real contribution signals instead of popularity metrics.

⸻

🔍 Overview

OS-Finder evaluates GitHub repositories using:
	•	Issue activity
	•	PR patterns
	•	Maintainer responsiveness
	•	Recent commit history
	•	Beginner-friendly signals (labels, structure, patterns)

It outputs a ranked list of repos that are actually practical to contribute to.

⸻

⚙️ Features
	•	Search repositories by keyword or tech stack
	•	Filter issues (labels, recency, difficulty)
	•	Lightweight PR scanning
	•	Maintainer activity checks
	•	Contribution difficulty estimation
	•	Repo health scoring (activity, merges, responsiveness)

⸻

🛠️ Tech Stack
	•	Node.js
	•	Express.js
	•	GitHub REST & GraphQL API
	•	Custom scoring engine
  • MongoDB as Database
  • Cron jobs for fetching repos periodically
  • Gemini API & PQueue

⸻

🧠 How It Works

The backend fetch good repos every 12 hours and AI analyzes the Repositories and summarizes repo readme, (5 AI model runs paralley), and a 
ranking system is implemented for easily filtering good repos


⸻

# Note: This project will expand further with Frontend implementation and better flow
