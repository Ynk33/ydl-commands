import { NodeSSH } from "node-ssh";

export default class RemoteProject {
  // Name of the Project. It is more readable than the fullName.
  #name = "";
  // Full name of the Project (it can have a suffix for example).
  #fullName = "";
  // Absolute path to the Project.
  #path = "";

  /**
   * The SSH connection.
   * @type {NodeSSH}
   */
  #ssh = null;

  // DB info storage.
  #dbInfo = null;

  // Storage for the backup of the wp_options table.
  #wpOptionsBackup = [];

  /**
   * Creates a new RemoteProject instance.
   * @param {string} name The name of the RemoteProject.
   */
  static async create(name) {
    const project = new RemoteProject();

    // Prepare the SSH connection.
    project.#ssh = await new NodeSSH().connect({
      host: process.env.SSH_HOST,
      username: process.env.SSH_USERNAME,
      privateKeyPath: process.env.SSH_PRIVATE_KEY,
    });
    if (!project.#ssh.isConnected()) {
      project.dispose();
      throw new Error("Failed to connect to the SSH host.");
    }

    // Prepare the Project name, according to the user's inputs.
    if (name === ".") {
      name = process.cwd()
        .replaceAll('\\', '/')
        .slice(process.cwd().lastIndexOf('\\') + 1);
    }

    // Try to find the project fullname on the server.
    await project.#fetchProjectFullName(name);
    if (!project.#fullName) {
      throw new Error(`${name} could not be found on the server.`);
    }

    project.#name = name;
    project.#path = process.env.REMOTE_ROOT_PATH + project.#fullName;

    return project;
  }

  /**
   * Getter for the name of the Project.
   * @returns {string} The name of the Project.
   */
  get name() {
    return this.#name;
  }

  /**
   * Getter for the path to the Project.
   * @returns {string} The absolute path to the Project.
   */
  get path() {
    return this.#path;
  }

  /**
   * Getter for the database of the Project.
   * @returns {string} The name of the database of the Project.
   */
  get dbName() {
    return this.#dbInfo.database;
  }

  /**
   * Shortcut to supply the connection data to a mysql command.
   */
  get #mysqlConnectData() {
    return `-u ${this.#dbInfo.username} -p${this.#dbInfo.password}`;
  }

  /**
   * Fetches the database information from the wp-config.php file of the Project.
   * @returns {Promise<Array<string>>} The database information with the format [ db-name, username, password ].
   */
  async fetchDatabaseInfo() {
    const wpConfig = await this.#ssh.exec("cat", ["wp-config.php"], {
      cwd: this.#path,
      stream: "stdout",
    });

    this.#dbInfo = {
      database: wpConfig.match(/define\( 'DB_NAME', '(.*)'/m)[1],
      username: wpConfig.match(/define\( 'DB_USER', '(.*)'/m)[1],
      password: wpConfig.match(/define\( 'DB_PASSWORD', '(.*)'/m)[1],
    };
  }

  /**
   * Executes a command in the Project.
   * @param {string} command Command to run.
   * @param {Array<string>} [args=[]] Arguments to pass to the command.
   * @returns {Promise<string>} The stdout of the command.
   */
  async exec(command, args = []) {
    return await this.#ssh.exec(command, args, {
      cwd: this.#path,
      stream: "stdout",
    });
  }

  /**
   * Download a file from the Project.
   * @param {string} fileName Name of the file to download.
   * @returns {Promise<void>}
   */
  async downloadFile(fileName) {
    await this.#ssh.getFile(fileName, `${this.#path}/${fileName}`);
  }

  /**
   * Upload a file in the Project.
   * @param {string} file Path to the file to upload.
   * @param {string} fileName Name of the file on the destination.
   * @returns {Promise<void>}
   */
  async uploadFile(file, fileName) {
    await this.#ssh.putFile(`${file}`, `${this.#path}/${fileName}`);
  }

  /**
   * Dump the database of the Project into a dump file.
   * @param {string} dumpName Dump file name.
   * @returns {Promise<void>}
   */
  async dump(dumpName) {
    const dumpCommand = `mysqldump ${this.#mysqlConnectData} --databases ${this.#dbInfo.database} > ${dumpName}`;
    await this.exec(dumpCommand);
  }

  /**
   * Backup the wp_options table.
   * @returns {Promise<void>}
   */
  async backupWPOptions() {
    const extractWpOptionsCommand = `mysql ${this.#mysqlConnectData} -sN -e 'SELECT option_value FROM ${this.#dbInfo.database}.wp_options WHERE option_name = "siteurl" OR option_name = "home";'`;
    this.#wpOptionsBackup = (await this.exec(extractWpOptionsCommand)).split("\n");
  }

  /**
   * Drop the database of the Project.
   * @returns {Promise<void>}
   */
  async dropDatabase() {
    try {
      const dropDatabaseCommand = `mysql ${this.#mysqlConnectData} -e 'DROP DATABASE ${this.#dbInfo.database};'`;
      await this.exec(dropDatabaseCommand);
    } catch (_e) {}
  }

  /**
   * Apply a migration file to the database of the Project.
   * @param {string} migrationFile Name of the migration file to apply.
   * @returns {Promise<void>}
   */
  async applyMigration(migrationFile) {
    const applyMigrationCommand = `mysql ${this.#mysqlConnectData} < ${this.#path}/${migrationFile}`;
    await this.exec(applyMigrationCommand);
  }

  /**
   * Restore the wp_options table from the backup.
   * @returns {Promise<void>}
   */
  async restoreWPOptionsBackup() {
    const [ siteurl, home ] = this.#wpOptionsBackup;
    const updateWpOptionsCommand = `mysql ${this.#mysqlConnectData} -e 'UPDATE ${this.#dbInfo.database}.wp_options SET option_value = "${home}" WHERE option_name = "home"; UPDATE ${this.#dbInfo.database}.wp_options SET option_value = "${siteurl}" WHERE option_name = "siteurl";'`;
    await this.exec(updateWpOptionsCommand);
  }

  /**
   * Delete a file from the Project.
   * @param {string} file File to delete from the Project.
   * @returns {Promise<void>}
   */
  async deleteFile(file) {
    await this.exec("rm", [file]);
  }

  /**
   * Dispose the SSH connection to the Project.
   */
  dispose() {
    this.#ssh.dispose();
  }

  /**
   * Read the {REMOTE_ROOT_PATH} folder on the server and figure out the full name of the Project.
   * @param {string} name Partial or complete name of the project.
   * @returns {Promise<void>}
   */
  async #fetchProjectFullName(name) {
    this.#fullName = await this.#ssh.exec(
      `ls ${process.env.REMOTE_ROOT_PATH} | grep -i "^${name}[.]"`,
      [],
      { stream: "stdout" }
    );
  }
}
