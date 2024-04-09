import { exec } from "child_process";
import fs from "fs";
import Colors, { colorize } from "../../../utils/colors.js";
import header from "../../../utils/header.js";
import DockerUtils from "../../../utils/docker.js";
import { ask, isFolderEmpty } from "../../../utils/helpers.js";
import path from "path";
import { gitClone } from "../../../utils/git.js";

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
    console.log(argv.path);
    console.log(process.cwd());
    console.log(path.dirname(argv.path));
    //console.log(process.chdir(argv.path));
    console.log(fs.existsSync(argv.path));

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
        !ask(
          "Is it safe to remove these containers?",
          "Great, proceeding.",
          "Ensure those containers are not running or that they can be safely removed, and then launch the script again."
        )
      ) {
        return;
      }

      console.log("Stopping and removing container...");
      await docker.stopContainers(containers);
      console.log(colorize("Done.", Colors.FgGreen));
      console.log();
    }

    console.log(colorize("No Docker container running", Colors.FgGreen));

    // Repo data
    console.log(
      colorize("The project name is ", Colors.FgGreen) + argv.projectName
    );
    console.log(
      colorize("The project will be created at ", Colors.FgGreen) + projectPath
    );

    /**
     * VALIDATION
     */
    console.log();
    if (
      !ask(
        "Are the information above correct?",
        "Great, proceeding.",
        "Ensure you enter the correct " +
          colorize("projectName", Colors.FgBlue) +
          colorize(" and the correct ", Colors.FgYellow) +
          colorize("path", Colors.FgBlue) +
          colorize(" next time ;)", Colors.FgYellow)
      )
    ) {
      return;
    }

    // TODO: git clone
    gitClone(process.env.TEMPLATE_REPO, projectPath, true);

    // TODO: docker compose up

    // TODO: setup.sh

    // TODO: docker compose down

    return;

    exec(
      "sh src/commands/project/wordpress/wordpress.sh",
      (error, stdout, stderr) => {
        console.log(stdout);
        if (error !== null) {
          console.log(`exec error: ${error}`);
        }
      }
    );
  },
};
