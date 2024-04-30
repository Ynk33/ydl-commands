import { simpleGit } from "simple-git";
import cliProgress from "cli-progress";

const bar = new cliProgress.SingleBar(
  {
    format: "Progress [{bar}] {percentage}%",
  },
  cliProgress.Presets.shades_classic
);

let nbPhases = 1;

let previousProgress = 0;
let progressSum = 0;

const progress = (event) => {
  let progressDelta = event.progress - previousProgress;
  if (progressDelta < 0) {
    progressDelta = 100 - previousProgress + event.progress;
  }
  progressSum += progressDelta;
  const percent = progressSum / nbPhases;
  bar.update(percent);
  previousProgress = event.progress;
};

const startGitProgress = (phases) => {
  nbPhases = phases;
  previousProgress = 0;
  progressSum = 0;
  bar.start(100, 0);
};

const stopGitProgress = (_) => {
  bar.stop();
};

const git = () =>
  simpleGit({
    progress: progress,
  });

/**
 * Performs a git clone of the repo in the folder to.
 * @param {string} repo Repo to clone
 * @param {string} to Path where to clone to
 * @param {boolean} includeSubmodules If set to true, will call git clone with the flag --recurse-submodules (default: false)
 */
export async function gitClone(repo, to, includeSubmodules = false) {
  const options = {
    "--recurse-submodules": includeSubmodules,
    "--progress": true,
  };

  try {
    startGitProgress(4);
    await git().clone(repo, to, options);
    stopGitProgress();
  } catch (e) {
    console.error(e);
  }
}

/**
 * Adds a new named remote.
 * @param {string} name Name of the remote.
 * @param {string} url URL of the remote.
 */
export async function addRemote(name, url) {
  await git().raw(["remote", "add", name, url]);
}

/**
 * Set the URL of the named remote.
 * @param {string} name Name of the remote.
 * @param {string} url URL of the remote.
 */
export async function setRemote(name, url) {
  await git().raw(["remote", "set-url", name, url]);
}

/**
 * Create a new branch and push it on remote.
 * @param {string} branch Name of the branch to create.
 * @param {boolean} commit Should a commit be done before pushing? (default: false)
 */
export async function createBranch(branch, commit = false) {
  await git()
    .raw(["branch", branch])
    .catch((_) => {});
  await changeBranch(branch);
  await git().add(".");
  if (commit) {
    await git().raw([
      "commit",
      "--allow-empty",
      "-m",
      "[IGNORE-WEBHOOKS] First commit, project setup",
    ]);
  }
  await git().push("origin", branch, ["--no-verify"]);
}

/**
 * Get the current branch of the repo.
 * @returns {string | undefined} The current branch.
 */
export async function getCurrentBranch() {
  const branches = await git().branch();
  let currentBranch = undefined;
  Object.entries(branches.branches).forEach(([_name, branch]) => {
    if (branch.current) {
      currentBranch = branch.name;
      return;
    }
  });

  return currentBranch;
}

/**
 * Checkout the repo to the branch.
 * @param {string} branch Branch to move to.
 */
export async function changeBranch(branch) {
  await git().checkout(branch);
}

/**
 * Check if the project has the remote.
 * @param {string} remote Name of the remote.
 * @returns {boolean} True if the remote exists, false otherwise.
 */
export async function hasRemote(remote) {
  const remotes = await git().remote();
  return remotes.includes(remote);
}

/**
 * Performs a fetch on the remote, with the current branch.
 * @param {string} remote Name of the remote.
 * @param {string} branch Name of the branch to fetch.
 */
export async function gitFetch(remote, branch = "") {
  await git().raw("fetch", remote, branch);
}

/**
 * Get the list of the commits on the specified {remote}.
 * @param {string} remote Name of the remote.
 * @param {string} branch Name of the branch.
 * @param {number} limit Number of commits to retrieve.
 * @returns List of the last commits.
 */
export async function getCommitsList(remote, branch = undefined, limit = 10) {
  let currentBranch = branch;
  if (currentBranch === undefined) {
    currentBranch = await getCurrentBranch();
  }

  let options = {
    maxCount: limit,
    [`${remote}/${currentBranch}`]: true,
  };
  const commits = await git().log(options);
  return commits.all;
}

/**
 * Perform a git cherry-pick on a selection of commits.
 * @param {Array<string>} commits List of commit's hashes to cherry-pick.
 */
export async function cherryPick(commits) {
  await git().raw("cherry-pick", "--keep-redundant-commits", ...commits);
}
