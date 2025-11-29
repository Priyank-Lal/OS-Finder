# 🛰️ OS-Finder

> **Discover high-quality open-source repositories to contribute to.**

OS-Finder goes beyond simple popularity metrics (like stars) to help developers find projects that are actually welcoming and practical to contribute to. It analyzes real contribution signals—issue activity, PR merge times, maintainer responsiveness, and code quality—to provide a curated list of "contribution-ready" repositories.

---

## 🚀 Key Features

### 🧠 AI-Powered Repository Analysis
OS-Finder leverages **Google Gemini 2.0 Flash** to perform deep qualitative analysis on every repository:
- **Smart Summaries**: Instantly understand what a project does without reading the entire README.
- **Tech Stack Extraction**: Automatically identifies languages, frameworks, and tools used.
- **Task Suggestions**: Generates tailored "Beginner" and "Intermediate" task ideas based on the project's current needs.
- **Contribution Readiness**: Evaluates the quality of `CONTRIBUTING.md` and community health files.

### 📊 Unified Scoring System
We don't just list repos; we rank them based on a sophisticated multi-factor score:
- **Beginner Friendliness**: How easy is it to onboard? (Based on documentation quality and "good first issue" labels).
- **Technical Complexity**: Analysis of file tree depth, build configuration, and test coverage.
- **Community Health**: Response times to issues, PR merge ratios, and recent activity.

### 🛡️ Intelligent Discovery Engine
- **Tiered Scheduling**: Fetches repositories based on language popularity (Tier 1: JS/Java/Go, Tier 2: Rust/C++, etc.) to ensure a diverse mix.
- **Rate Limit Protection**: Implements a distributed queue system with **15 RPM** strict limits and **TPM (Tokens Per Minute)** tracking to ensure stability.
- **Automatic Filtering**: Filters out abandoned or read-only projects automatically.

---

## 🎨 Frontend Experience

The frontend is built to be fast, intuitive, and visually stunning.

- **Modern UI/UX**: Built with **Next.js 16** and **Tailwind CSS v4** for a sleek, responsive design.
- **Rich Interactions**: Uses **Radix UI** primitives for accessible, high-quality interactive components (Dialogs, Hover Cards, Accordions).
- **Real-time Filtering**: Instantly filter repositories by language, difficulty score, or specific topics using **TanStack Query**.
- **Visual Metrics**: Beautiful data visualization for PR merge times and issue distribution.
- **Dark Mode First**: Designed with a developer-centric dark theme.

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js & TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **AI Engine**: Google Gemini (via LangChain & Google GenAI SDK)
- **Scheduling**: Node-cron (Custom discovery schedules)
- **Queuing**: P-Queue (Priority queuing for API calls)

### Frontend
- **Framework**: Next.js 16 (React 18)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI & Shadcn UI
- **State Management**: TanStack Query
- **Icons**: Lucide React

---

## 🏗️ Architecture

1.  **Discovery Service**: Runs on a schedule (7:30 PM IST & every 6 hours) to fetch potential repositories from GitHub.
2.  **Analysis Pipeline**:
    - **Metadata Fetching**: Gathers file trees, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
    - **Metric Calculation**: Computes PR merge ratios, issue response times, and activity levels.
    - **AI Processing**: Sends data to Gemini for qualitative analysis (summaries, task suggestions).
3.  **Scoring Engine**: Combines quantitative metrics and AI insights into a unified score.
4.  **API Layer**: Serves the curated data to the frontend with filtering and search capabilities.

---