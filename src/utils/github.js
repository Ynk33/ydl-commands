import { Octokit } from "@octokit/rest";
import fs from "fs";
import Colors, { colorize } from "./colors.js";
import run from "./bash.js";

/**
 * Authenticate to Github and returns a Github object to interact with the Github API.
 * @returns {Octokit} A Github object to interact with the Github API.
 */
const github = () => new Octokit({
  auth: process.env.GITHUB_AUTH_TOKEN
});

const owner = () => process.env.GITHUB_OWNER;

/**
 * Returns the login of the currently authenticated user.
 * @returns {string} The login of the currently authenticated user.
 */
export async function getUsername() {
  return (await github().apps.getAuthenticated()).owner.login;
}

/**
 * Return the repos the authenticated user can see.
 * @returns {Array} List of the repos the authenticated user can see.
 */
export async function listRepos() {
  const response = await github().repos.listForAuthenticatedUser();
  return response.data;
}

/**
 * Check if the given repo already exists or not.
 * @param {string} repoName Name of the repo.
 * @returns {boolean} True if the repo exists, false otherwise.
 */
export async function repoExists(repoName) {
  const repos = await listRepos();
  return repos.find(repo => repo.name == repoName) !== undefined;
}

/**
 * Creates a new repo.
 * @param {string} repoName Name of the repo.
 */
export async function createRepo(repoName) {
  await github().repos.createForAuthenticatedUser({
    name: repoName,
    private: true
  });
}

/**
 * If exists, add the webhook defined in the project's hooks-config.json to the repo. Do nothing if the file doesn't exists.
 * @param {string} repoName Name of the repo.
 */
export async function addWebhooks(repoName) {
  let hooksConfigPath = `./hooks-config.json`;
  console.log(`Looking for hooks-config.json...`);
  if (fs.existsSync(hooksConfigPath)) {
    console.log(colorize("hooks-config.json found.", Colors.FgYellow));
    console.log("Adding webhooks...");
    let hooksConfig = JSON.parse(fs.readFileSync(hooksConfigPath));
    await github().repos.createWebhook(Object.assign(
      {
        owner: owner(),
        repo: repoName,
      },
      hooksConfig
    ));
  }
  else {
    console.log(colorize("hooks-config.json not found. Skipping.", Colors.FgYellow));
  }
}

/**
 * Delete a repo.
 * @param {string} repoName The name of the repo to delete.
 */
export async function deleteRepo(repoName) {

  await run(`gh repo delete ${repoName} --yes`);
}