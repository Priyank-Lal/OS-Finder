import axios from "axios";

export async function getUserRepos(username: string) {
  const res = await axios.get(
    `https://api.github.com/users/${username}/repos`,
    {
      headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
    }
  );

  const repos = res.data;
  const languages = [
    ...new Set(repos.map((r: any) => r.language).filter(Boolean)),
  ];
  return { username, repositories: repos.length, languages };
}
