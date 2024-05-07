import Colors, { colorize } from "../utils/colors.js";
import { addRemote, createBranch, gitClone, setRemote } from "../utils/git.js";
import { addWebhooks, createRepo, deleteRepo, repoExists } from "../utils/github.js";
import Project from "./project.js";

export default class GitEnvironment {
  /**
   * The project this git environment is linked to.
   * @type {Project}
   */
  #project = undefined;

  // The template the project is based one.
  #template = "";

  #templateName = "";

  /**
   * Create a new instance of GitEnvironment.
   * @param {Project} project The project this git environment is linked to.
   */
  constructor(project) {
    this.#project = project;
  }

  /**
   * Clone a template project to this project.
   * @param {string} template URL of the template to clone for this project.
   * @returns {Promise<void>}
   */
  async clone(template) {
    this.#template = template;
    this.#templateName = template.slice(template.lastIndexOf('/') + 1);

    console.log(`Cloning ${this.#templateName} to ${this.#project.path}...`);
    await gitClone(template, this.#project.path, true);
  }

  /**
   * Initializes the git environment for a newly created project.
   * @returns {Promise<void>}
   */
  async init() {
    const owner = process.env.GITHUB_OWNER;

    process.chdir(this.#project.path);

    console.log(`Checking if repo ${owner}/${this.#project.name} already exists...`);
    if (await repoExists(this.#project.name)) {
      console.log(colorize("\tRepo exists, skipping creation.", Colors.FgYellow));
    }
    else {
      console.log(colorize("\tRepo does not exist, creating it...", Colors.FgYellow));
      await createRepo(this.#project.name);
      console.log("Adding webhooks...");
      await addWebhooks(this.#project.name);
    }

    console.log("Updating origin...");
    await setRemote("origin", `git@github.com:${owner}/${this.#project.name}`);

    console.log(`Adding ${this.#templateName.toLowerCase()} remote for common updates...`);
    await addRemote(this.#templateName.toLowerCase(), this.#template);

    console.log("Creating main branch...");
    await createBranch("main", true);
    
    console.log("Creating develop branch...");
    await createBranch("develop");

    console.log(colorize("Done.", Colors.FgGreen));
    console.log();
  }

  /**
   * Delete the repo associated to the Project.
   * @returns {Promise<void>}
   */
  async deleteRepo() {
    await deleteRepo(this.#project.name);
  }
}