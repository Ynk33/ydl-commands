import Colors, { colorize } from "../../utils/colors.js";
import DockerUtils from "../../utils/docker.js";
import header from "../../utils/header.js";
import { validateMigrationData } from "../../utils/helpers.js";
import Project from "../../classes/project.js";

export default {
  command: "migrate <from> [to] [-s|--silent]",
  desc: "Migrate the database from the project <from> to the project [to].",
  builder: {
    from: {
      type: "string",
      desc: "Path to the directory of the Docker container to migrate the db from.",
    },
    to: {
      type: "string",
      default: ".",
      desc: "Path to the directory of the Docker container to apply the migration to.",
    },
    silent: {
      type: "boolean",
      default: false,
      desc: "If specified, the command will not ask any question.",
      alias: "s",
    },
  },
  handler: async (argv) => {
    /**
     * VARIABLES
     */
    const fromProject = new Project(argv.from);
    const toProject = new Project(argv.to);

    const silent = argv.silent;

    const docker = await DockerUtils.create();

    const migrationFile = "temp_dump.sql";

    /**
     * HEADER
     */

    header("Yanka Dev Lab - Database Migration", [
      colorize("Welcome to the Database Migration command.", Colors.FgGreen),
      `This script will migrate the database from ${fromProject.name} to ${toProject.name}.`,
    ]);

    /**
     * PRE-REQUISITE
     */

    console.log(colorize("Checking pre-requisites...", Colors.FgYellow));
    console.log();

    // Check the options
    console.log("Checking arguments...");
    if (fromProject.path === toProject.path) {
      console.log(
        colorize(
          "You specified the same [from] and [to] options.",
          Colors.FgRed
        )
      );
      console.log("Abort.");
      return;
    }

    // Does the projects have any Docker container?
    console.log("Checking projects Docker containers...");
    if (
      !(fromProject.hasADockerContainer() && toProject.hasADockerContainer())
    ) {
      console.log(
        colorize(
          `At least one of the projects you specified doesn't have any Docker container.`,
          Colors.FgRed
        )
      );
      console.log("Abort.");
      return;
    }

    // Turning off any running Docker containers
    console.log("Checking running Docker containers...");
    if (!(await docker.safelyRemoveContainers(silent))) {
      return;
    }

    console.log();
    console.log(colorize("Everything is ready.", Colors.FgGreen));
    console.log();

    /**
     * VALIDATION
     */
    if (!silent) {
      if (
        !(await validateMigrationData(
          fromProject.name,
          fromProject.dbName,
          toProject.name,
          fromProject.dbName
        ))
      ) {
        return;
      }
    }

    /**
     * DUMPING THE DATABASE
     */

    // Run the Docker containers
    console.log(`Launching Docker containers of ${fromProject.name}...`);
    await fromProject.up();

    // Dump the database 'from'
    console.log(`Extracting the dump from the database of ${fromProject.name}...`);
    await fromProject.dump(migrationFile);

    // Stop the Docker containers 'from'
    console.log(`Stopping Docker containers of ${fromProject.name}...`);
    await fromProject.down();

    /**
     * PREPARING THE MIGRATION
     */

    // Move the dump to destination
    console.log(`Moving the migration to ${toProject.name}...`);
    fromProject.moveFile(migrationFile, `${toProject.path}`);

    // Modify the migration to use proper Database name
    let fileContent = toProject.readFile(migrationFile);
    fileContent = fileContent.replaceAll(
      `\`${fromProject.dbName}\``,
      `\`${toProject.dbName}\``
    );
    toProject.writeFile(migrationFile, fileContent);

    /**
     * PERFORMING THE MIGRATION
     */

    // Run the Docker containers 'to'
    console.log(`Launching Docker containers of ${toProject.name}...`);
    await toProject.up();

    // Apply dump 'to'
    console.log(`Dropping the database...`);
    await toProject.dropDatabase();

    console.log(`Applying the migration to ${toProject.name}...`);
    await toProject.applyMigration(migrationFile);

    // Stop the Docker containers 'to'
    console.log(`Stopping Docker containers of ${toProject.name}...`);
    await toProject.down();

    /**
     * CLEANING UP
     */

    // Cleaning temp files
    console.log(`Cleaning the migration file from ${toProject.name}...`);
    toProject.deleteFile(migrationFile);

    /**
     * END
     */
    console.log();
    console.log(colorize("Migration completed!", Colors.FgGreen));
  },
};
