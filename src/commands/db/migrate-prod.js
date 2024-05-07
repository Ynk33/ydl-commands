import header from "../../utils/header.js";
import Colors, { colorize } from "../../utils/colors.js";
import fs from "fs";
import { validateMigrationData } from "../../utils/helpers.js";
import RemoteProject from "../../classes/remote-project.js";

export default {
  command: "migrate-prod [project]",
  desc: "Deploy the preprod database to prod",
  builder: {
    project: {
      type: "string",
      default: ".",
      desc: "Name of the project",
    },
  },
  handler: async (argv) => {
    /**
     * VARIABLES
     */

    const prodProject = await RemoteProject.create(argv.project);
    const preprodProject = await RemoteProject.create(
      prodProject.name + "-preprod"
    );

    const migrationFile = "temp_dump.sql";

    /**
     * HEADER
     */

    header("Yanka Dev Lab - Database Migration Prod", [
      colorize("Welcome to Database Migration Prod command.", Colors.FgGreen),
      `This command will deploy the preprod database of ${prodProject.name} to prod`,
    ]);

    /**
     * VALIDATION
     */
    if (
      !(await validateMigrationData(
        preprodProject.name,
        preprodProject.dbName,
        prodProject.name,
        prodProject.dbName
      ))
    ) {
      preprodProject.dispose();
      prodProject.dispose();
      return;
    }

    /**
     * BODY
     */

    /**
     * DUMP PREPROD DATABASE
     */
    
    // Dump preprod db
    console.log("Dumping the preprod database.");
    await preprodProject.dump(migrationFile);

    // Modify the migration to use proper Database name
    console.log("Downloading the dump file...");
    await preprodProject.downloadFile(migrationFile);

    console.log("Updating the dump file...");
    let fileContent = fs.readFileSync(migrationFile, "utf8");
    fileContent = fileContent.replaceAll(
      `\`${preprodProject.dbName}\``,
      `\`${prodProject.dbName}\``
    );
    fs.writeFileSync(migrationFile, fileContent, "utf8");

    console.log("Uploading the dump file...");
    await prodProject.uploadFile(migrationFile, migrationFile);

    // Backup prod wp_options
    console.log(`Backing up wp_options...`);
    await prodProject.backupWPOptions();

    // Drop prod db
    console.log(`Dropping ${prodProject.name} database...`);
    await prodProject.dropDatabase();

    // Apply dump on prod
    console.log(`Applying migration...`);
    await prodProject.applyMigration(migrationFile);

    // Apply wp_options backup
    console.log(`Restoring wp_options...`);
    await prodProject.restoreWPOptionsBackup();

    // Cleanup
    console.log(`Cleaning up...`);
    fs.rmSync(migrationFile);
    await preprodProject.deleteFile(migrationFile);
    await prodProject.deleteFile(migrationFile);

    // Close SSH connection
    console.log(`Closing SSH connection...`);
    preprodProject.dispose();
    prodProject.dispose();

    /**
     * END
     */
    console.log();
    console.log(colorize("Migration completed!", Colors.FgGreen));
  },
};
