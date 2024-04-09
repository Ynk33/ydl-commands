import fs from "fs";
import Colors, { colorize } from "../../../utils/colors.js";
import header from "../../../utils/header.js";
import DockerUtils from "../../../utils/docker.js";
import { ask, isFolderEmpty } from "../../../utils/helpers.js";
import { gitClone } from "../../../utils/git.js";
import run from "../../../utils/bash.js";

const TEMPLATE_REPO = "git@github.com:Ynk33/YankaWordpress";

export default {
  command: "wordpress <projectName> [path]",
  desc: "Create a new Wordpress project",
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
      ],
      20
    );

    /**
     * PRE-REQUISITE
     */

    console.log("Checking pre-requisites...");
    console.log();

    // Path
    const projectPath = argv.path + "/" + argv.projectName;
    if (fs.existsSync(projectPath)) {
      if (!isFolderEmpty(projectPath)) {
        console.log(
          colorize("The folder ", Colors.FgRed) +
            projectPath +
            colorize(" already exists and is not empty.", Colors.FgRed)
        );
        console.log(
          "Check again your " +
            colorize("projectName", Colors.FgBlue) +
            " and your " +
            colorize("path", Colors.FgBlue) +
            "."
        );
        console.log();

        return;
      }
    }

    // Docker containers
    let docker = new DockerUtils();
    let containers = await docker.getRunningContainers();
    if (containers.length > 0) {
      console.log(
        colorize("You have some Docker containers running.", Colors.FgRed)
      );
      console.log(
        colorize(
          "In order to create a new project, these containers need to be turned off.",
          Colors.FgYellow
        )
      );
      if (
        !(await ask(
          "Is it safe to remove these containers?",
          "Great, proceeding.",
          "Ensure those containers are not running or that they can be safely removed, and then launch the script again."
        ))
      ) {
        return;
      }

      console.log("Stopping and removing container...");
      await docker.stopContainers(containers);
      await docker.deleteContainers(containers);
      console.log(colorize("Done.", Colors.FgGreen));
      console.log();
    }

    console.log(colorize("No Docker container running", Colors.FgGreen));

    // Repo data
    console.log(
      colorize("The project name is ", Colors.FgGreen) + argv.projectName
    );
    console.log(
      colorize("The project will be created at ", Colors.FgGreen) +
      projectPath +
      colorize(" using the template ", Colors.FgGreen) +
      TEMPLATE_REPO
    );

    /**
     * VALIDATION
     */

    console.log();
    if (
      !(await ask(
        "Are the information above correct?",
        "Great, proceeding.",
        "Ensure you enter the correct " +
          colorize("projectName", Colors.FgBlue) +
          colorize(" and the correct ", Colors.FgYellow) +
          colorize("path", Colors.FgBlue) +
          colorize(" next time ;)", Colors.FgYellow)
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
    await gitClone(TEMPLATE_REPO, projectPath, true);

    // docker compose up
    console.log(colorize("Launch Docker containers...", Colors.FgGreen));
    process.chdir(projectPath);
    await docker.dockerComposeUp();

    // setup.sh
    console.log(colorize("Running setup.sh...", Colors.FgGreen));
    await run("sh ./setup.sh --silent", false);

    /**
     * CLEAN UP
     */

    console.log();
    console.log("Clean up...");

    // docker compose down
    console.log(colorize("Remove Docker containers...", Colors.FgGreen));
    await docker.dockerComposeDown();

    /**
     * THE END
     */

    console.log();
    console.log(colorize("Your project is now all set up!", Colors.FgGreen));
    console.log("Congratulations, and have fun!");
    console.log();
  },
};
