import run from "../../../utils/bash.js";
import Colors, { colorize } from "../../../utils/colors.js";
import { changeBranch, createBranch, gitClone, setRemote } from "../../../utils/git.js";
import { addWebhooks, createRepo, repoExists } from "../../../utils/github.js";
import header from "../../../utils/header.js";
import { createFolder, validateCreateProjectData } from "../../../utils/helpers.js";

export default {
  command: "next <projectName> [path]",
  desc: "Create a new Next project based on the Yankify template.",
  builder: {
    projectName: {
      type: "string",
      desc: "Name of the new Next project you want to create.",
    },
    path: {
      type: "string",
      default: ".",
      desc: "Path to the directory where the project will be created.",
    },
  },
  handler: async (argv) => {

    /**
     * VARIABLES
     */
    const projectName = argv.projectName;
    const projectPath = argv.path + "/" + argv.projectName;

    /**
     * HEADER
     */

    header(
      "Yanka Dev Lab - Create Next Project",
      [
        colorize(
          "Welcome to the Create Next Project script.",
          Colors.FgGreen
        ),
        "This script will create a new Next project based on the Yankify template.",
      ],
      20
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

    /**
     * VALIDATION
     */
    if (
      !(await validateCreateProjectData(
        projectName,
        projectPath,
        process.env.TEMPLATE_NEXT_REPO
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
    await gitClone(process.env.TEMPLATE_NEXT_REPO, projectPath);

    // Moving into the project path
    process.chdir(projectPath);

    // npm install
    console.log(colorize("Installing dependencies...", Colors.FgGreen));
    await run("npm install");

    // Creating Github environment
    console.log(`Checking if repo Ynk33/${projectName} already exists...`);
    if (await repoExists(projectName)) {
      console.log("Repo exists, skipping creation.");
    }
    else {
      console.log("Repo does not exist, creating it...");
      await createRepo(projectName);
      console.log("Adding webhooks...");
      await addWebhooks(projectName, projectPath);
    }

    console.log("Updating origin...");
    await setRemote("origin", `git@github.com:Ynk33/${projectName}`);

    console.log("Creating main branch...");
    await createBranch("main", true);
    
    console.log("Creating develop branch...");
    await createBranch("develop");
    await changeBranch("main");

    console.log(colorize("Done.", Colors.FgGreen));
    console.log();

    /**
     * THE END
     */

    console.log();
    console.log(colorize("Your project is now all set up!", Colors.FgGreen));
    console.log("Congratulations, and have fun!");
    console.log();
  }
}
