import fs from "fs";
import { resolve } from "path";
import { run } from "../utils/bash.js";
import { sleep } from "../utils/helpers.js";
import DockerUtils from "../utils/docker.js";

export default class Project {
  // Name of the project.
  #name = "";
  // Absolute path to the project.
  #path = "";

  /**
   * The DockerUtils instance to interact with Docker.
   * @type {DockerUtils}
   */
  #docker = null;

  // DB info storage.
  #dbInfo = null;

  /**
   * Creates a new Project instance.
   * @param {string} path The path to the project, relative or absolute.
   * @param {string | undefined} [name=undefined] The name of the project. If undefined, it will be resolved using the provided path.
   */
  constructor(path, name = undefined) {
    if (name === undefined) {
      this.#path = resolve(path);
      this.#name = this.#path
        .replaceAll("\\", "/")
        .slice(this.#path.lastIndexOf("\\") + 1);
    } else {
      this.#name = name;
      this.#path = `${resolve(path)}/${this.#name}`;
    }

    this.#fetchDatabaseInfo();
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
    return `-h ${this.#docker.dbContainerIPAddress} -u ${this.#dbInfo.username} -p${this.#dbInfo.password}`;
  }

  /**
   * Checks if the Project has a docker-compose file.
   *@returns {boolean} True if a docker-compose.yml file is found in the Project path. False otherwise.
   */
  hasADockerContainer() {
    return fs.existsSync(this.#path + "/docker-compose.yml");
  }
  
  /**
   * Docker compose up.
   * @returns {Promise<void>}
   */
  async up() {
    this.#validateDockerProject();

    process.chdir(this.#path);
    await run("docker compose up -d");
    await sleep(3000);

    this.#docker = await DockerUtils.create();
  }

  /**
   * Dump the database of the Project into a dump file.
   * @param {string} dumpName Dump file name.
   * @returns {Promise<void>}
   */
  async dump(dumpName) {
    const dumpCommand = `mysqldump ${this.#mysqlConnectData} --databases ${this.#dbInfo.database} > ${dumpName}`;
    await this.#dockerExec(dumpCommand);
  }

  /**
   * Drop the database of the Project.
   * @returns {Promise<void>}
   */
  async dropDatabase() {
    try {
      const dropDatabaseCommand = `mysql ${this.#mysqlConnectData} -e 'DROP DATABASE ${this.#dbInfo.database};'`;
      await this.#dockerExec(dropDatabaseCommand);
    } catch (_e) {}
  }

  /**
   * Apply a migration file to the database of the Project.
   * @param {string} migrationFile Name of the migration file to apply.
   * @returns {Promise<void>}
   */
  async applyMigration(migrationFile) {
    const applyMigrationCommand = `mysql ${this.#mysqlConnectData} < ${migrationFile}`;
    await this.#dockerExec(applyMigrationCommand);
  }

  /**
   * Docker compose down.
   * @returns {Promise<void>}
   */
  async down() {
    this.#validateDockerProject();

    process.chdir(this.#path);
    await run("docker compose down");

    this.#docker = null;
  }

  /**
   * Moves a file of the Project to another location.
   * @param {string} file File to move.
   * @param {string} destination Absolute path where to move the file to.
   */
  moveFile(file, destination) {

    file.replace("\\", "/");

    destination.replace("\\", "/");
    destination.replace(file, "");

    if (file[0] === '/') {
      file.slice(1);
    }

    if (destination[destination.length - 1] === '/') {
      destination.slice(0, destination.length - 1);
    }

    fs.renameSync(
      `${this.#path}/${file}`,
      `${destination}/${file}`
    );
  }

  /**
   * Gets the content of a file of the Project.
   * @param {string} file File to read.
   * @returns {string} The content of the file.
   */
  readFile(file) {
    file.replace("\\", "/");
    if (file[0] === '/') {
      file.slice(1);
    }

    return fs.readFileSync(
      `${this.#path}/${file}`,
      "utf8"
    );
  }

  /**
   * Write a file of the Project.
   * @param {string} file File to write.
   * @param {string} content Content to write in the file.
   */
  writeFile(file, content) {
    file.replace("\\", "/");
    if (file[0] === '/') {
      file.slice(1);
    }

    fs.writeFileSync(`${this.#path}/${file}`, content, "utf8");
  }

  /**
   * Delete a file of the Project.
   * @param {string} file File to delete.
   */
  deleteFile(file) {
    file.replace("\\", "/");
    if (file[0] === '/') {
      file.slice(1);
    }

    fs.rmSync(`${this.#path}/${file}`);
  }

  /**
   * Fetches the database information from the docker-compose.yml file of the Project.
   * @returns {Array<string>} The database information with the format [ db-name, username, password ].
   */
  #fetchDatabaseInfo() {
    this.#validateDockerProject();

    const dockerCompose = fs.readFileSync(`${this.#path}/docker-compose.yml`, {
      encoding: "utf8",
    });

    this.#dbInfo = {
      database: dockerCompose.match(/- WORDPRESS_DB_NAME=(.*)/m)[1],
      username: dockerCompose.match(/- WORDPRESS_DB_PASSWORD=(.*)/m)[1],
      password: dockerCompose.match(/- WORDPRESS_DB_USER=(.*)/m)[1],
    };
  }

  /**
   * Executes a command on the Wordpress Docker container of the Project.
   * @param {string} command Command to execute.
   * @returns {Promise<void>}
   */
  async #dockerExec(command) {
    this.#validateDockerProject();
    this.#validateDockerIsUp();

    await this.#docker.refresh();
    const dockerCommand = `docker exec ${this.#docker.wordpressContainerName} bash -c "${command}"`;
    await run(dockerCommand);
  }

  /**
   * Check if the Project has a docker-compose.yml file, and throw an error if not.
   */
  #validateDockerProject() {
    if (!this.hasADockerContainer) {
      throw new Error("This project doesn't not have a docker-compose file.");
    }
  }

  /**
   * Check if the Project's Docker containers are up, and throw an error if not.
   */
  #validateDockerIsUp() {
    if (!this.#docker) {
      throw new Error("The Docker containers are down.");
    }
  }
}
