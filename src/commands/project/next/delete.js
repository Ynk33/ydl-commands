import run from "../../../utils/bash.js";
import Colors, { colorize } from "../../../utils/colors.js";
import { deleteRepo } from "../../../utils/github.js";
import header from "../../../utils/header.js";
import {
  ask,
  folderExists,
  validateDeleteProjectData,
} from "../../../utils/helpers.js";

export default {
  command: "next <projectName> [path]",
  desc: "Delete a Next project.",
  builder: {
    projectName: {
      type: "string",
      desc: "Name of the Next project you want to delete.",
    },
    path: {
      type: "string",
      default: ".",
      desc: "Path to the directory where the project is.",
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
      "Yanka Dev Lab - Delete Next Project",
      [
        colorize("Welcome to the Delete Next Project script.", Colors.FgGreen),
        "This script will delete a Next project.",
      ]
    );

    /**
     * PRE-REQUISITE
     */

    console.log("Checking pre-requisites...");
    console.log();

    // Path
    if (!folderExists(projectPath)) {
      console.log(
        colorize(`The project ${projectPath} doesn't exist. Check again!`)
      );
      console.log();
      return;
    }

    /**
     * VALIDATION
     */
    if (!(await validateDeleteProjectData(projectName))) {
      return;
    }

    /**
     * DELETING THE PROJECT
     */

    console.log("Deleting the project...");

    // delete the repo
    if (
      await ask(
        "Do you also want to delete the associated repo?",
        "Great, proceeding.",
        "Ok, this step will be skipped."
      )
    ) {
      console.log("Deleting the repo...");
      await deleteRepo(projectName);
    }

    // rm files
    console.log("Deleting all the local files...");
    await run(`sh -c 'rm -rf ${projectPath}'`);
    /**
     * THE END
     */

    console.log();
    console.log(
      colorize("The project ", Colors.FgGreen) +
        projectName +
        colorize(" has been deleted.", Colors.FgGreen)
    );
    console.log();
  },
};
