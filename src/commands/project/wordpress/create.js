import fs from "fs";
import Colors, { colorize } from "../../../utils/colors.js";
import header from "../../../utils/header.js";
import DockerUtils from "../../../utils/docker.js";
import {
  createFolder,
  validateCreateProjectData,
} from "../../../utils/helpers.js";
import { addRemote, changeBranch, createBranch, gitClone, setRemote } from "../../../utils/git.js";
import { addWebhooks, createRepo, repoExists } from "../../../utils/github.js";
import prompts from "prompts";
import { run } from "../../../utils/bash.js";

export default {
  command: "wordpress <projectName> [path]",
  desc: "Create a new Wordpress project based on the YankaWordpress template.",
  builder: {
    projectName: {
      type: "string",
      desc: "Name of the new Wordpress project you want to create",
    },
    path: {
      type: "string",
      default: ".",
      desc: "Path to the directory where the project will be created",
    },
  },
  handler: async (argv) => {

    /**
     * VARIABLES
     */
    
    const projectName = argv.projectName;
    const projectPath = argv.path + "/" + argv.projectName;
    const templateWordpressRepo = process.env.TEMPLATE_WORDPRESS_REPO;
    const owner = process.env.GITHUB_OWNER;
    const docker = await DockerUtils.create();

    /**
     * HEADER
     */

    header(
      "Yanka Dev Lab - Create Wordpress Project",
      [
        colorize(
          "Welcome to the Create Wordpress Project script.",
          Colors.FgGreen
        ),
        "This script will create a new Wordpress project based on the YankaWordpress template.",
      ]
    );

    /**
     * PRE-REQUISITE
     */

    console.log("Checking pre-requisites...");
    console.log();

    // Path
    if (!createFolder(projectPath)) {
      return;
    }

    // Docker containers
    console.log("Checking Docker containers...");
    await docker.safelyRemoveContainers();

    /**
     * VALIDATION
     */
    if (
      !(await validateCreateProjectData(
        projectName,
        projectPath,
        templateWordpressRepo
      ))
    ) {
      return;
    }

    /**
     * SETTING UP THE PROJECT
     */

    console.log("Setting up the project...");

    // git clone
    console.log(colorize("Cloning the template...", Colors.FgGreen));
    await gitClone(templateWordpressRepo, projectPath, true);
    process.chdir(projectPath);

    // Creating Github environment
    console.log(`Checking if repo ${owner}/${projectName} already exists...`);
    if (await repoExists(projectName)) {
      console.log("Repo exists, skipping creation.");
    }
    else {
      console.log("Repo does not exist, creating it...");
      await createRepo(projectName);
      console.log("Adding webhooks...");
      await addWebhooks(projectName);
    }

    console.log("Updating origin...");
    await setRemote("origin", `git@github.com:${owner}/${projectName}`);

    console.log("Adding YankaWordpress remote for common updates...");
    await addRemote("yankawordpress", templateWordpressRepo);

    console.log("Creating main branch...");
    await createBranch("main", true);
    
    console.log("Creating develop branch...");
    await createBranch("develop");
    await changeBranch("main");

    console.log(colorize("Done.", Colors.FgGreen));
    console.log();

    // Migrate YankaWordpress DB to this project
    const response = await prompts({
      type: "text",
      name: "templatePath",
      message: `Where is your installation of ${templateWordpressRepo} (pwd: ${process.cwd()})?`,
      validate: templatePath => !fs.existsSync(templatePath) ? `Template not found at ${templatePath}` : true
    });
    const fromPath = response.templatePath;

    console.log("Setting up the database...");
    await run(`ydl db migrate ${fromPath} . --silent`);

    /**
     * THE END
     */

    console.log();
    console.log(colorize("Your project is now all set up!", Colors.FgGreen));
    console.log("Congratulations, and have fun!");
    console.log();
  },
};
