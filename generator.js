const { promises: fs } = require("fs");
const path = require("path");

const GITHUB_API = "https://api.github.com";
const OWNER = "wicg";
const token = process.env.WICG_TOKEN;

// Minimal GitHub REST client: templates :owner, adds auth, and follows
// Link-header pagination so list endpoints return every page.
async function gh(route) {
  let url = GITHUB_API + route.replace(/:owner/g, OWNER);
  const headers = {
    "User-Agent": "wicg.io",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `token ${token.replace(/^token\s+/, "")}`;
  let output;
  while (url) {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub ${response.status} ${response.statusText} for ${url}`);
    }
    const body = await response.json();
    const link = response.headers.get("link");
    if (!link) return output ? output.concat(body) : body;
    output = (output || []).concat(body);
    url = nextLink(link);
  }
  return output;
}

function nextLink(linkHeader) {
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

const ms_to_days_ratio = 1000 * 60 * 60 * 24;

const issue_score = (activity) => {
  let score = 0;
  const date = new Date();
  for (issue of activity) {
    const issue_update_date = new Date(issue.updated_at);

    const weeks_ago = Math.floor(
      (date - issue_update_date) / (ms_to_days_ratio * 7)
    );
    const weight = Math.max(1, 52 - weeks_ago);
    score += weight;
  }
  return score;
};
const commit_score = (activity) => {
  if (!activity.isPrototypeOf("Array")) return 0;
  let score = 0;
  let weight = 1;
  for (week of activity) {
    score += weight * week.total;
    ++weight;
  }
  return score;
};
const combined_score = (issue, commit) => {
  return Math.floor(issue * 0.7 + commit * 0.3);
};

const ignore_set = new Set([
  "admin",
  "wicg.io",
  "starter-kit",
  "repo_info_generator",
  "discourse-wicg-theme",
  "discourse-archive",
  "proposals",
  "wicg.github.io",
]);

(async () => {
  let active = [];
  let archived = [];
  const repos = await gh("/orgs/:owner/repos");
  for (repo of repos.filter((filter) => !ignore_set.has(filter.name))) {
    const repo_object = {
      name: repo?.name ?? null,
      repo: repo?.html_url ?? null,
      spec: repo?.homepage ?? null,
      stars: repo?.stargazers_count ?? null,
      description: repo?.description ?? null,
      has_pages: repo?.has_pages ?? null,
      created_at: repo?.created_at ?? null,
      updated_at: repo?.updated_at ?? null,
      // A proxy for last activity and when it was archived
      pushed_at: repo?.pushed_at ?? null,
    };
    if (repo.archived) {
      archived.push(repo_object);
      continue;
    }
    const commit_activity = await gh(
      "/repos/:owner/" + repo.name + "/stats/commit_activity"
    );
    const issues = await gh(
      "/repos/:owner/" + repo.name + "/issues?state=all"
    );
    repo_object["score"] = combined_score(
      commit_score(commit_activity),
      issue_score(issues)
    );
    active.push(repo_object);
  }
  // sort the damn thing
  active = active.sort((a, b) => {
    return b.score - a.score;
  });
  // Sort by pushed_at Date
  archived = archived.sort((a, b) => {
    return new Date(b.pushed_at) - new Date(a.pushed_at);
  });
  try {
    await fs.writeFile(
      path.resolve(__dirname, "./data/active.json"),
      JSON.stringify(active),
      "utf-8"
    );
    await fs.writeFile(
      path.resolve(__dirname, "./data/archived.json"),
      JSON.stringify(archived),
      "utf-8"
    );
  } catch (err) {
    console.error(err);
  }
})();
