import header from "../../utils/header.js";
import Colors, { colorize } from "../../utils/colors.js";
import DockerUtils from "../../utils/docker.js";
import { validateMigrationData } from "../../utils/helpers.js";
import Project from "../../classes/project.js";
import RemoteProject from "../../classes/remote-project.js";

export default {
  command: "migrate-remote <to>",
  desc: "Migrate the database of the current project to the remote project <to>.",
  builder: {
    to: {
      type: "string",
      desc: "Name of the remote project to apply the migration to.",
    },
  },
  handler: async (argv) => {
    /**
     * VARIABLES
     */

    const fromProject = new Project(".");
    const toProject = await RemoteProject.create(
      argv.to === "preprod"
        ? fromProject.name + "-preprod"
        : argv.to === "prod"
        ? fromProject.name
        : argv.to
    );

    const docker = await DockerUtils.create();

    const migrationFile = "temp_dump.sql";

    /**
     * HEADER
     */

    header("Yanka Dev Lab - Database Migration to Remote", [
      colorize(
        "Welcome to the Database Migration to Remote command.",
        Colors.FgGreen
      ),
      `This script will migrate the database of ${fromProject.name} to ${toProject.name}.`,
    ]);

    /**
     * PREREQUISITES
     */

    console.log("Checking pre-requisites...");
    console.log();

    // Does the current project have any Docker container?
    console.log("Checking the current project Docker container...");
    if (!fromProject.hasADockerContainer()) {
      console.log(
        colorize(
          `The current project doesn't have any Docker container.`,
          Colors.FgRed
        )
      );
      console.log("Abort.");
      toProject.dispose();
      return;
    }

    // Turning off running Docker containers
    console.log("Checking running Docker containers...");
    if (!(await docker.safelyRemoveContainers())) {
      toProject.dispose();
      return;
    }

    // Checking the database info
    fromProject.fetchDatabaseInfo();
    toProject.fetchDatabaseInfo();

    console.log();
    console.log(colorize("Everything is ready.", Colors.FgGreen));
    console.log();

    /**
     * VALIDATION
     */
    if (
      !(await validateMigrationData(
        fromProject.name,
        fromProject.dbName,
        toProject.name,
        toProject.dbName
      ))
    ) {
      toProject.dispose();
      return;
    }

    /**
     * BODY
     */

    /**
     * DUMP THE LOCAL DATABASE
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
     * PREPARE THE MIGRATION
     */

    // Modify the migration to use proper Database name
    console.log("Updating the migration file...");
    let fileContent = fromProject.readFile(migrationFile);
    fileContent = fileContent.replaceAll(
      `\`${fromProject.dbName}\``,
      `\`${toProject.dbName}\``
    );
    fromProject.writeFile(migrationFile, fileContent);

    // Upload the migration to the server
    console.log("Uploading the migration file...");
    await toProject.uploadFile(
      `${fromProject.path}/${migrationFile}`,
      migrationFile
    );

    // Perform the migration
    console.log(`Backing up wp_options...`);
    await toProject.backupWPOptions();

    console.log(`Dropping the database...`);
    await toProject.dropDatabase();

    console.log(`Applying the migration to ${toProject.name}...`);
    await toProject.applyMigration(migrationFile);

    console.log(`Restoring wp_options...`);
    await toProject.restoreWPOptionsBackup();

    console.log(colorize("Done.", Colors.FgGreen));
    console.log();

    // Cleanup
    console.log(`Cleaning the migration file from ${fromProject.name}...`);
    fromProject.deleteFile(migrationFile);

    console.log(`Cleaning the migration file from ${toProject.name}...`);
    await toProject.deleteFile(migrationFile);

    // Close SSH connection
    console.log(`Closing SSH connection...`, Colors.FgGreen);
    toProject.dispose();

    /**
     * END
     */
    console.log();
    console.log(colorize("Migration completed!", Colors.FgGreen));
  },
};
