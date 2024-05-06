import fs from "fs";
import Colors, { colorize } from "../../utils/colors.js";
import DockerUtils from "../../utils/docker.js";
import header from "../../utils/header.js";
import { ask, sleep, validateMigrationData } from "../../utils/helpers.js";
import run from "../../utils/bash.js";
import { resolve } from "path";

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
    }
  },
  handler: async (argv) => {
    /**
     * VARIABLES
     */
    const from = argv.from;
    const to = argv.to;

    const fromAbs = resolve(from);
    const toAbs = resolve(to);

    const fromName = getProjectName(fromAbs);
    const toName = getProjectName(toAbs);

    const silent = argv.silent;

    /**
     * HEADER
     */

    header(
      "Yanka Dev Lab - Database Migration",
      [
        colorize("Welcome to the Database Migration command.", Colors.FgGreen),
        `This script will migrate the database from ${fromName} to ${toName}.`,
      ]
    );

    /**
     * PRE-REQUISITE
     */

    console.log("Checking pre-requisites...");
    console.log();

    // Check the options
    if (fromAbs === toAbs) {
      console.log(
        colorize(
          "You specified the same [from] and [to] options.",
          Colors.FgYellow
        )
      );
      console.log("Abort.");
      return;
    }

    // Does the projects have any Docker container?
    if (
      !fs.existsSync(fromAbs + "/docker-compose.yml") ||
      !fs.existsSync(toAbs + "/docker-compose.yml")
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
    
    // Getting database connection info
    console.log(colorize(`Fetching database informations for ${fromName}...`, Colors.FgGreen));
    const dockerComposeFrom = fs.readFileSync(`${fromAbs}/docker-compose.yml`, { encoding: "utf8" });
    const fromDatabase = dockerComposeFrom.match(/- WORDPRESS_DB_NAME=(.*)/m)[1];
    const fromUsername = dockerComposeFrom.match(/- WORDPRESS_DB_PASSWORD=(.*)/m)[1];
    const fromPassword = dockerComposeFrom.match(/- WORDPRESS_DB_USER=(.*)/m)[1];
    
    console.log(colorize(`Fetching database informations for ${toName}...`, Colors.FgGreen));
    const dockerComposeTo = fs.readFileSync(`${toAbs}/docker-compose.yml`, { encoding: "utf8" });
    const toDatabase = dockerComposeTo.match(/- WORDPRESS_DB_NAME=(.*)/m)[1];
    const toUsername = dockerComposeTo.match(/- WORDPRESS_DB_PASSWORD=(.*)/m)[1];
    const toPassword = dockerComposeTo.match(/- WORDPRESS_DB_USER=(.*)/m)[1];

    // Turning off running Docker containers
    let docker = new DockerUtils();
    let containers = await docker.getRunningContainers();
    if (containers.length > 0) {
      console.log(
        colorize("You have some Docker containers running.", Colors.FgRed)
      );
      console.log(
        colorize(
          "In order to perform the migration, all the containers first need to be turned off.",
          Colors.FgYellow
        )
      );
      if (!silent) {
        if (
          !(await ask(
            "Is it safe to remove these containers?",
            "Great, proceeding.",
            "Ensure those containers are not running or that they can be safely removed, and then launch the script again."
          ))
        ) {
          return;
        }
      }

      console.log("Stopping and removing container...");
      await docker.stopContainers(containers);
      await docker.deleteContainers(containers);
      console.log(colorize("Done.", Colors.FgGreen));
      console.log();
    }

    /**
     * VALIDATION
     */
    if (!silent) {
      if (!(await validateMigrationData(fromName, fromDatabase, toName, toDatabase))) {
        return;
      }
    }

    /**
     * DUMPING THE DATABASE
     */

    // Run the Docker containers
    console.log(colorize(`Launch Docker containers of ${fromName}...`, Colors.FgGreen));
    process.chdir(fromAbs);
    await docker.dockerComposeUp();

    // Wait a bit
    console.log(colorize("Wait for the containers to be fully initialized...", Colors.FgGreen));
    await sleep(5000);

    // Dump the database 'from'
    console.log(colorize(`Extract the dump from the database of ${fromName}...`, Colors.FgGreen));
    const fromWordpressContainerName = await docker.getCurrentWordpressContainer();
    const fromDbIpAddress = await docker.getDbContainerIpAddress();
    const dumpCommand = `docker exec ${fromWordpressContainerName} bash -c "mysqldump -h ${fromDbIpAddress} -u ${fromUsername} -p${fromPassword} --databases ${fromDatabase} > temp_dump.sql"`;
    await run(dumpCommand);

    // Stop the Docker containers 'from'
    console.log(colorize(`Stop Docker containers of ${fromName}...`, Colors.FgGreen));
    await docker.dockerComposeDown();

    // Move the dump to destination
    console.log(colorize(`Move the migration to ${toName}...`, Colors.FgGreen));
    fs.renameSync(`${fromAbs}/temp_dump.sql`, `${toAbs}/temp_dump.sql`);

    // Modify the migration to use proper Database name
    let fileContent = fs.readFileSync(`${toAbs}/temp_dump.sql`, 'utf8');
    fileContent = fileContent.replaceAll(`\`${fromDatabase}\``, `\`${toDatabase}\``);
    fs.writeFileSync(`${toAbs}/temp_dump.sql`, fileContent, 'utf8');

    // Run the Docker containers 'to'
    console.log(colorize(`Launch Docker containers of ${toName}...`, Colors.FgGreen));
    process.chdir(toAbs);
    await docker.dockerComposeUp();

    // Wait a bit
    console.log(colorize("Wait for the containers to be fully initialized...", Colors.FgGreen));
    await sleep(5000);

    // Apply dump 'to'
    const toWordpressContainerName = await docker.getCurrentWordpressContainer();
    const toDbIpaddress = await docker.getDbContainerIpAddress();

    console.log(colorize(`Apply the migration to the database of ${toName}...`, Colors.FgGreen));
    const dropDatabaseCommand = `docker exec ${toWordpressContainerName} bash -c "mysql -h ${toDbIpaddress} -u ${toUsername} -p${toPassword} -e 'DROP DATABASE ${toDatabase};'"`;
    const applyMigrationCommand = `docker exec ${toWordpressContainerName} bash -c "mysql -h ${toDbIpaddress} -u ${toUsername} -p${toPassword} < temp_dump.sql"`; 
    
    try {
      await run(dropDatabaseCommand);
    }
    catch (_e) {}
    
    await run(applyMigrationCommand);


    // Stop the Docker containers 'to'
    console.log(colorize(`Stop Docker containers of ${toName}...`, Colors.FgGreen));
    await docker.dockerComposeDown();

    // Cleaning temp files
    console.log(colorize(`Cleaning the migration file from ${toName}...`, Colors.FgGreen));
    fs.rmSync(`${toAbs}/temp_dump.sql`);

    /**
     * END
     */
    console.log();
    console.log(colorize("Migration completed!", Colors.FgGreen));
  },
};

/**
 * Get a readable project name from its path.
 * @param {string} projectPath Path to the project to get the name of.
 * @returns {string} The name of the project.
 */
function getProjectName(projectPath) {
  const sliceIndex = projectPath.lastIndexOf("\\") + 1;
  return projectPath.slice(sliceIndex);
}