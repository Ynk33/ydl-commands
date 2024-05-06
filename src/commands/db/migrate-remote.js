import { resolve } from "path";
import fs from "fs";
import { NodeSSH } from "node-ssh";
import header from "../../utils/header.js";
import Colors, { colorize } from "../../utils/colors.js";
import DockerUtils from "../../utils/docker.js";
import { ask, sleep, validateMigrationData } from "../../utils/helpers.js";
import run from "../../utils/bash.js";

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
    const fromPath = resolve(".");
    const fromName = getProjectName(fromPath);

    const toName = argv.to === "preprod" ?
      (fromName + "-preprod" + process.env.REMOTE_PROJECTS_SUFFIX)
      : argv.to === "prod" ?
        fromName + process.env.REMOTE_PROJECTS_SUFFIX
        : getProjectName(toPath);
    const toPath = process.env.REMOTE_ROOT_PATH + toName.toLowerCase();


    const ssh = new NodeSSH();
    
    /**
     * HEADER
     */

    header(
      "Yanka Dev Lab - Database Migration to Remote",
      [
        colorize("Welcome to the Database Migration to Remote command.", Colors.FgGreen),
        `This script will migrate the database of ${fromName} to ${toName}.`,
      ]
    );
    
    /**
     * PREREQUISITES
     */

    console.log("Checking pre-requisites...");
    console.log();

    // Check ssh connection
    console.log(colorize("Checking SSH connection...", Colors.FgGreen));
    const sshConnection = await ssh.connect({
      host: process.env.SSH_HOST,
      username: process.env.SSH_USERNAME,
      privateKeyPath: process.env.SSH_PRIVATE_KEY
    });

    if (!sshConnection.isConnected()) {
      console.log(colorize("The connection to the SSH host failed.", Colors.FgRed));
      console.log("Abort.");
      return;
    }

    // Check that the remote project exists
    console.log(colorize("Checking the remote project...", Colors.FgGreen));
    let stdOut;
    await sshConnection.exec(`ls`, [], {
      cwd: process.env.REMOTE_ROOT_PATH,
      onStdout(chunk) {
        stdOut = chunk.toString("utf8");
      }
    });

    if (!stdOut.includes(toName.toLowerCase())) {
      console.log(colorize(`${toName} cannot be found on remote.`, Colors.FgRed));
      console.log("Abort");
      sshConnection.dispose();
      return;
    }

    // Does the current project have any Docker container?
    console.log(colorize("Checking the current project Docker container...", Colors.FgGreen));
    if (
      !fs.existsSync(fromPath + "/docker-compose.yml")
    ) {
      console.log(
        colorize(
          `The current project doesn't have any Docker container.`,
          Colors.FgRed
        )
      );
      console.log("Abort.");
      sshConnection.dispose();
      return;
    }

    // Getting database connection info
    console.log(colorize(`Fetching database informations for ${fromName}...`, Colors.FgGreen));
    const dockerCompose = fs.readFileSync(`${fromPath}/docker-compose.yml`, { encoding: "utf8" });
    const fromDatabase = dockerCompose.match(/- WORDPRESS_DB_NAME=(.*)/m)[1];
    const fromUsername = dockerCompose.match(/- WORDPRESS_DB_PASSWORD=(.*)/m)[1];
    const fromPassword = dockerCompose.match(/- WORDPRESS_DB_USER=(.*)/m)[1];

    console.log(colorize(`Fetching database informations for ${toName}...`, Colors.FgGreen));
    let wpConfig;
    await sshConnection.exec("cat", ["wp-config.php"], {
      cwd: toPath,
      onStdout(chunk) {
        wpConfig = chunk.toString("utf8");
      }
    });
    const toDatabase = wpConfig.match(/define\( 'DB_NAME', '(.*)'/m)[1];
    const toUsername = wpConfig.match(/define\( 'DB_USER', '(.*)'/m)[1];
    const toPassword = wpConfig.match(/define\( 'DB_PASSWORD', '(.*)'/m)[1];
    
    // Turning off running Docker containers
    console.log(colorize("Checking running Docker containers...", Colors.FgGreen));
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
      if (
        !(await ask(
          "Is it safe to remove these containers?",
          "Great, proceeding.",
          "Ensure those containers are not running or that they can be safely removed, and then launch the script again."
        ))
      ) {
        sshConnection.dispose();
        return;
      }

      console.log("Stopping and removing container...");
      await docker.stopContainers(containers);
      await docker.deleteContainers(containers);
      console.log(colorize("Done.", Colors.FgGreen));
      console.log();
    }

    console.log();
    
    /**
     * VALIDATION
     */
    if (!(await validateMigrationData(fromName, fromDatabase, toName, toDatabase))) {
      sshConnection.dispose();
      return;
    }
    
    /**
     * BODY
     */

    // Run the Docker containers
    console.log(colorize(`Launch Docker containers of ${fromName}...`, Colors.FgGreen));
    process.chdir(fromPath);
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

    // Modify the migration to use proper Database name
    console.log(colorize("Updating the migration file...", Colors.FgGreen));
    let fileContent = fs.readFileSync(`${fromPath}/temp_dump.sql`, 'utf8');
    fileContent = fileContent.replaceAll(`\`${fromDatabase}\``, `\`${toDatabase}\``);
    fs.writeFileSync(`${fromPath}/temp_dump.sql`, fileContent, 'utf8');

    // Upload the migration to the server
    console.log(colorize("Uploading the migration file...", Colors.FgGreen));
    await sshConnection.putFile(`${fromPath}/temp_dump.sql`, `${toPath}/temp_dump.sql`);

    // Perform the migration
    console.log(colorize(`Backup wp_options...`, Colors.FgGreen));
    const extractWpOptionsCommand = `mysql -u ${toUsername} -p${toPassword} -sN -e 'SELECT option_value FROM ${toDatabase}.wp_options WHERE option_name = "home" OR option_name = "siteurl";'`

    let options;
    await sshConnection.exec(extractWpOptionsCommand, [], {
      onStdout(chunk) {
        options = chunk.toString("utf8").split("\n");
      }
    });

    const dropDatabaseCommand = `mysql -u ${toUsername} -p${toPassword} -e 'DROP DATABASE ${toDatabase};'`;
    const applyMigrationCommand = `mysql -u ${toUsername} -p${toPassword} < ${toPath}/temp_dump.sql`;
    const updateWpOptionsCommand = `mysql -u ${toUsername} -p${toPassword} -e 'UPDATE ${toDatabase}.wp_options SET option_value = "${options[0]}" WHERE option_name = "home"; UPDATE ${toDatabase}.wp_options SET option_value = "${options[1]}" WHERE option_name = "siteurl";'`;
    
    try {
      console.log(colorize(`Drop the database...`, Colors.FgGreen));
      await sshConnection.exec(dropDatabaseCommand, []);
    }
    catch (_e) {}
    
    console.log(colorize(`Apply the migration to ${toName}...`, Colors.FgGreen));
    await sshConnection.exec(applyMigrationCommand, []);
    console.log(colorize(`Apply the wp_options backup...`, Colors.FgGreen));
    await sshConnection.exec(updateWpOptionsCommand, []);

    console.log("Done.");
    console.log();

    // Cleanup
    console.log(colorize(`Cleaning the migration file from ${fromName}...`, Colors.FgGreen));
    fs.rmSync(`${fromPath}/temp_dump.sql`);

    console.log(colorize(`Cleaning the migration file from ${toName}...`, Colors.FgGreen));
    await sshConnection.exec('rm', [`${toPath}/temp_dump.sql`]);

    // Close SSH connection
    console.log(colorize(`Closing SSH connection...`, Colors.FgGreen));
    sshConnection.dispose();
    
    /**
     * END
     */
    console.log();
    console.log(colorize("Migration completed!", Colors.FgGreen));
  }
}

/**
 * Get a readable project name from its path.
 * @param {string} projectPath Path to the project to get the name of.
 * @returns {string} The name of the project.
 */
function getProjectName(projectPath) {
  const path = projectPath.replaceAll("\\", "/"); // Ensure that all the paths are in the same format.
  const sliceIndex = path.lastIndexOf("/") + 1;
  return projectPath.slice(sliceIndex);
}
