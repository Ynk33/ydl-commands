import header from "../../utils/header.js";
import Colors, { colorize } from "../../utils/colors.js";
import { NodeSSH } from "node-ssh";
import fs from "fs";
import { validateMigrationData } from "../../utils/helpers.js";

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

    let project = argv.project;
    if (project === ".") {
      project = process.cwd()
        .replaceAll('\\', '/')
        .slice(process.cwd().lastIndexOf('\\') + 1);
    }

    const preprodName = project + "-preprod" + process.env.REMOTE_PROJECTS_SUFFIX;
    const prodName = project + process.env.REMOTE_PROJECTS_SUFFIX;

    const preprodPath = process.env.REMOTE_ROOT_PATH + preprodName.toLowerCase();
    const prodPath = process.env.REMOTE_ROOT_PATH + prodName.toLowerCase();

    const ssh = new NodeSSH();
    const connectionConfig = {
      host: process.env.SSH_HOST,
      username: process.env.SSH_USERNAME,
      privateKeyPath: process.env.SSH_PRIVATE_KEY
    };
    
    /**
     * HEADER
     */
    
      header(
        "Yanka Dev Lab - Database Migration Prod",
          [
            colorize("Welcome to Database Migration Prod command.", Colors.FgGreen),
            `This command will deploy the preprod database of ${prodName} to prod`,
          ]
      );
    
    /**
     * PREREQUISITES
     */
    
    console.log("Checking pre-requisites...");
    console.log();

    // Check ssh connection
    console.log(colorize("Checking SSH connection...", Colors.FgGreen));
    const sshConnection = await ssh.connect(connectionConfig);

    if (!sshConnection.isConnected()) {
      console.log(colorize("The connection to the SSH host failed.", Colors.FgRed));
      console.log("Abort.");
      return;
    }

    // Check that the preprod and prod projects exist
    let stdOut;
    await sshConnection.exec(`ls`, [], {
      cwd: process.env.REMOTE_ROOT_PATH,
      onStdout(chunk) {
        stdOut = chunk.toString("utf8");
      }
    });

    console.log(colorize("Checking the preprod project...", Colors.FgGreen));
    if (!stdOut.includes(preprodName.toLowerCase())) {
      console.log(colorize(`${preprodName} cannot be found on remote.`, Colors.FgRed));
      console.log("Abort");
      sshConnection.dispose();
      return;
    }

    console.log(colorize("Checking the prod project...", Colors.FgGreen));
    if (!stdOut.includes(prodName.toLowerCase())) {
      console.log(colorize(`${prodName} cannot be found on remote.`, Colors.FgRed));
      console.log("Abort");
      sshConnection.dispose();
      return;
    }

    // Getting database connection info
    console.log(colorize(`Fetching database informations for ${preprodName}...`, Colors.FgGreen));
    let wpConfigPreprod;
    await sshConnection.exec("cat", ["wp-config.php"], {
      cwd: preprodPath,
      onStdout(chunk) {
        wpConfigPreprod = chunk.toString("utf8");
      }
    });
    const preprodDatabase = wpConfigPreprod.match(/define\( 'DB_NAME', '(.*)'/m)[1];
    const preprodUsername = wpConfigPreprod.match(/define\( 'DB_USER', '(.*)'/m)[1];
    const preprodPassword = wpConfigPreprod.match(/define\( 'DB_PASSWORD', '(.*)'/m)[1];

    console.log(colorize(`Fetching database informations for ${prodName}...`, Colors.FgGreen));
    let wpConfigProd;
    await sshConnection.exec("cat", ["wp-config.php"], {
      cwd: prodPath,
      onStdout(chunk) {
        wpConfigProd = chunk.toString("utf8");
      }
    });
    const prodDatabase = wpConfigProd.match(/define\( 'DB_NAME', '(.*)'/m)[1];
    const prodUsername = wpConfigProd.match(/define\( 'DB_USER', '(.*)'/m)[1];
    const prodPassword = wpConfigProd.match(/define\( 'DB_PASSWORD', '(.*)'/m)[1];

    console.log();
    
    /**
     * VALIDATION
     */
    if (!(await validateMigrationData(preprodName, preprodDatabase, prodName, prodDatabase))) {
      sshConnection.dispose();
      return;
    }
    
    /**
     * BODY
     */

    // Dump preprod db
    console.log(colorize('Dumping the preprod database.', Colors.FgGreen));
    const dumpCommand = `mysqldump -u ${preprodUsername} -p${preprodPassword} --databases ${preprodDatabase} > ${preprodPath}/temp_dump.sql`;
    sshConnection.exec(dumpCommand, []);

    // Modify the migration to use proper Database name
    console.log(colorize("Updating the dump file...", Colors.FgGreen));

    await sshConnection.getFile('./temp_dump.sql', `${preprodPath}/temp_dump.sql`);
    let fileContent = fs.readFileSync(`./temp_dump.sql`, 'utf8');
    fileContent = fileContent.replaceAll(`\`${preprodDatabase}\``, `\`${prodDatabase}\``);
    fs.writeFileSync(`./temp_dump.sql`, fileContent, 'utf8');
    await sshConnection.putFile('./temp_dump.sql', `${preprodPath}/temp_dump.sql`);

    // Backup prod wp_options
    console.log(colorize(`Backing up wp_options...`, Colors.FgGreen));
    const extractWpOptionsCommand = `mysql -u ${prodUsername} -p${prodPassword} -sN -e 'SELECT option_value FROM ${prodDatabase}.wp_options WHERE option_name = "home" OR option_name = "siteurl";'`

    let options;
    await sshConnection.exec(extractWpOptionsCommand, [], {
      onStdout(chunk) {
        options = chunk.toString("utf8").split("\n");
      }
    });

    // Drop prod db
    console.log(colorize(`Dropping ${prodName} database...`, Colors.FgGreen));
    const dropDatabaseCommand = `mysql -u ${prodUsername} -p${prodPassword} -e 'DROP DATABASE ${prodDatabase};'`;
    await sshConnection.exec(dropDatabaseCommand, []);
    
    // Apply dump on prod
    console.log(colorize(`Applying migration...`, Colors.FgGreen));
    const applyMigrationCommand = `mysql -u ${prodUsername} -p${prodPassword} < ${preprodPath}/temp_dump.sql`;
    await sshConnection.exec(applyMigrationCommand, []);

    // Apply wp_options backup
    console.log(colorize(`Reverting wp_options backup...`, Colors.FgGreen));
    const updateWpOptionsCommand = `mysql -u ${prodUsername} -p${prodPassword} -e 'UPDATE ${prodDatabase}.wp_options SET option_value = "${options[0]}" WHERE option_name = "home"; UPDATE ${prodDatabase}.wp_options SET option_value = "${options[1]}" WHERE option_name = "siteurl";'`;
    await sshConnection.exec(updateWpOptionsCommand, []);

    // Cleanup
    console.log(colorize(`Cleaning up...`, Colors.FgGreen));
    fs.rmSync("./temp_dump.sql");
    await sshConnection.exec('rm', [`${preprodPath}/temp_dump.sql`]);

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