import Project from "../../classes/project.js";
import Colors, { colorize } from "../../utils/colors.js";
import header from "../../utils/header.js";
import { validateDeleteProjectData } from "../../utils/helpers.js";

export default {
  command: "delete <projectName> [path]",
  desc: "Delete a project",
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
    const project = new Project(argv.path, argv.projectName);

    /**
     * HEADER
     */

    header("Yanka Dev Lab - Delete Project", [
      colorize("Welcome to the Delete Project command.", Colors.FgGreen),
      "This command will help you to delete a project.",
    ]);

    /**
     * VALIDATION
     */
    if (!(await validateDeleteProjectData(project.name))) {
      return;
    }

    /**
     * DELETING THE PROJECT
     */

    console.log(colorize("Deleting the project...", Colors.FgYellow));
    await project.delete();

    /**
     * THE END
     */

    console.log();
    console.log(
      colorize("The project ", Colors.FgGreen) +
        project.name +
        colorize(" has been deleted.", Colors.FgGreen)
    );
  },
};
