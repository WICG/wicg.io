const gh = require("simple-github")({
  owner: "wicg",
  //debug: "true",
  token: `${process.env.WICG_TOKEN}`,
});

const ms_to_days_ratio = 1000*60*60*24;

const issue_score = activity => {
    let score = 0;
    const date = new Date();
    for (issue of activity) {
        const issue_update_date = new Date(issue.updated_at);

        const weeks_ago = Math.floor((date - issue_update_date) / (ms_to_days_ratio * 7));
        const weight = Math.max(1, 52 - weeks_ago);
        score += weight;
    }
    return score;
};
const commit_score = activity => {
    if (!activity.isPrototypeOf("Array"))
        return 0;
    let score = 0;
    let weight = 1;
    for (week of activity) {
        score += weight * week.total;
        ++weight;
    }
    return score;
};
const combined_score = (issue, commit) => {
    return issue * 0.7 + commit * 0.3;
}

const ignore_set = {"admin": true, "wicg.io": true, "starter-kit": true, "repo_info_generator": true};

(async () => {
    let active = []; 
    let archived = []
    const repos = await gh.request("GET /orgs/:owner/repos", {});
    for (repo of repos) {
        if (ignore_set[repo.name]) {
            continue;
        }

        let repo_object = {};
        repo_object["name"] = repo.name;
        repo_object["repo"] = repo.html_url;
        repo_object["spec"] = repo.homepage;
        if (repo.archived) {
             archived.push(repo_object);
             continue;
        }
        const commit_activity = await gh.request("GET /repos/:owner/" + repo.name + "/stats/commit_activity", {});
        const issues = await gh.request("GET /repos/:owner/" + repo.name + "/issues?state=all", {});
        repo_object["score"] = combined_score(commit_score(commit_activity), issue_score(issues));
        active.push(repo_object);
    }
// sort the damn thing
active = active.sort((a,b) => { return b.score - a.score; });

})()

