import fs from "fs";
import Colors, { colorize } from "../../../utils/colors.js";
import header from "../../../utils/header.js";
import DockerUtils from "../../../utils/docker.js";
import { validateCreateProjectData } from "../../../utils/helpers.js";
import prompts from "prompts";
import { run } from "../../../utils/bash.js";
import Project from "../../../classes/project.js";

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

    const project = new Project(argv.path, argv.projectName);

    const templateWordpressName = process.env.TEMPLATE_WORDPRESS_NAME;
    const templateWordpressRepo = process.env.TEMPLATE_WORDPRESS_REPO;

    const docker = await DockerUtils.create();

    /**
     * HEADER
     */

    header("Yanka Dev Lab - Create Wordpress Project", [
      colorize(
        "Welcome to the Create Wordpress Project script.",
        Colors.FgGreen
      ),
      `This script will create a new Wordpress project based on the ${templateWordpressName} template.`,
    ]);

    /**
     * PRE-REQUISITE
     */

    console.log(colorize("Checking pre-requisites...", Colors.FgYellow));
    console.log();

    // Docker containers
    console.log("Checking running Docker containers...");
    if (!(await docker.safelyRemoveContainers())) {
      return;
    }

    console.log();
    console.log(colorize("Everything is ready.", Colors.FgGreen));
    console.log();

    /**
     * VALIDATION
     */
    if (
      !(await validateCreateProjectData(
        project.name,
        project.path,
        templateWordpressRepo
      ))
    ) {
      return;
    }

    /**
     * SETTING UP THE PROJECT
     */

    console.log(colorize("Setting up the project...", Colors.FgYellow));

    // Initialize the project.
    await project.initialize(templateWordpressRepo);

    // Launch docker compose for the first time
    console.log(colorize("Launching the Docker container for the first time...", Colors.FgYellow));
    await project.up();

    // Migrate YankaWordpress DB to this project
    const response = await prompts({
      type: "text",
      name: "templatePath",
      initial: "../YankaWordpress",
      message: `Where is your installation of ${templateWordpressName} (pwd: ${process.cwd()})?`,
      validate: (templatePath) =>
        !fs.existsSync(templatePath)
          ? `${templateWordpressName} not found at ${templatePath}`
          : true,
    });
    const fromPath = response.templatePath;

    console.log("Setting up the database...");
    await run(`ydl db migrate ${fromPath} . --silent`);

    /**
     * THE END
     */

    console.log();
    console.log(colorize("Your project is now all set up!", Colors.FgGreen));
  },
};
