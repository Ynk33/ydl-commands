import Project from "../../../classes/project.js";
import { run } from "../../../utils/bash.js";
import Colors, { colorize } from "../../../utils/colors.js";
import { addRemote, changeBranch, createBranch, gitClone, setRemote } from "../../../utils/git.js";
import { addWebhooks, createRepo, repoExists } from "../../../utils/github.js";
import header from "../../../utils/header.js";
import { validateCreateProjectData } from "../../../utils/helpers.js";

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
    const project = new Project(argv.path, argv.projectName);
    
    const templateNextName = process.env.TEMPLATE_NEXT_NAME;
    const templateNextRepo = process.env.TEMPLATE_NEXT_REPO;

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
        `This script will create a new Next project based on the ${templateNextName} template.`,
      ]
    );

    /**
     * VALIDATION
     */
    if (
      !(await validateCreateProjectData(
        project.name,
        project.path,
        templateNextRepo
      ))
    ) {
      return;
    }

    /**
     * SETTING UP THE PROJECT
     */

    console.log(colorize("Setting up the project...", Colors.FgYellow));

    // Initialize the project.
    await project.initialize(templateNextRepo);

    // Moving into the project path
    process.chdir(project.path);

    // npm install
    console.log("Installing dependencies...", Colors.FgGreen);
    await run("npm install");
    /**
     * THE END
     */

    console.log();
    console.log(colorize("Your project is now all set up!", Colors.FgGreen));
  }
}
