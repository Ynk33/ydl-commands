import { Docker } from "node-docker-api";
import { Container } from "node-docker-api/lib/container.js";
import Colors, { colorize } from "./colors.js";
import { ask } from "./helpers.js";

/**
 * @class A set of helping functions to interact with Docker.
 */
export default class DockerUtils {
  // Docker API
  #docker = null;
  // Currently running containers
  #containers = [];
  // Currently running wordpress container
  #wordpressContainer = undefined;
  // Currently running db container
  #dbContainer = undefined;

  /**
   * Entry point of DockerUtils.
   * @returns {Promise<DockerUtils>} A new fully initialised instance of Docker Utils.
   */
  static async create() {
    const dockerUtils = new DockerUtils();
    await dockerUtils.#init();

    return dockerUtils;
  }

  /**
   * Initializes the references to the currently running Docker containers.
   * @returns {Promise<void>}
   */
  async #init() {
    this.#docker = new Docker();
    this.#containers = await this.#getRunningContainers();
    this.#wordpressContainer = await this.#getCurrentWordpressContainer();
    this.#dbContainer = await this.#getCurrentDBContainer();
  }

  /**
   * Gets the name of the currently running Wordpress container.
   * @returns {string} The name of the currently running Wordpress container.
   */
  get wordpressContainerName() {
    if (this.#wordpressContainer === undefined) {
      throw new Error("No Wordpress container is currently running");
    }

    return this.#wordpressContainer.data.Names[0].slice(1);
  }

  /**
   * Gets the name of the currently running Database container.
   * @returns {string} The name of the currently running Database container.
   */
  get dbContainerName() {
    if (this.#dbContainer === undefined) {
      throw new Error("No Database container is currently running");
    }

    return this.#dbContainer.data.Names[0].slice(1);
  }

  /**
   * Get the IP address of the currently running Database container.
   * @returns The IP address of the currently running Database container.
   */
  get dbContainerIPAddress() {
    if (this.#dbContainer === undefined) {
      throw new Error("No Database container is currently running");
    }

    return Object.values(this.#dbContainer.data.NetworkSettings.Networks)[0]
      .IPAddress;
  }

  /**
   * Refreshes the Docker data of this instance.
   * @returns {Promise<void>}
   */
  async refresh() {
    await this.#init();
  }

  /**
   * Asks the user if the currently running containers can be removed and does it if confirmed.
   * @param {boolean} [silent=false] If set to true, the user won't be asked to confirm the removal of the containers.
   * @returns {Promise<boolean>} True if the containers were safely removed, false if the user decided not to do it.
   */
  async safelyRemoveContainers(silent = false) {
    if (this.#containers.length > 0) {
      console.log(
        colorize("You have some Docker containers running.", Colors.FgRed)
      );
      console.log(
        colorize(
          "In order for this command to run, these containers need to be turned off.",
          Colors.FgYellow
        )
      );
      if (!silent) {
        if (
          !(await ask(
            "Is it safe to remove these containers?",
            "Great, proceeding.",
            "Ensure those containers are not running or that they can be safely removed, and then run the command again."
          ))
        ) {
          return false;
        }
      }

      console.log("Stopping and removing container...");
      await this.#stopAllContainers();
      await this.#deleteAllContainers();
      console.log(colorize("Done.", Colors.FgGreen));
      console.log();
    }

    return true;
  }

  /**
   * Get the currently running Docker containers.
   * @returns {Promise<Array<Container>>} An Array the currently running Docker containers.
   */
  async #getRunningContainers() {
    let containers = await this.#docker.container.list();
    let runningContainers = [];

    containers.forEach((container) => {
      if (container.data.State === "running") {
        runningContainers.push(container);
      }
    });

    return runningContainers;
  }

  /**
   * Get the name of the currently running Wordpress container, if any.
   * @returns {string|undefined} The name of the currently running Wordpress container, if any.
   */
  #getCurrentWordpressContainer() {
    for (let i = 0; i < this.#containers.length; i++) {
      const container = this.#containers[i];
      const name = container.data.Names[0].slice(1);
      if (name.includes("-wordpress-")) {
        return container;
      }
    }

    return undefined;
  }

  /**
   * Get the name of the currently running Database container, if any.
   * @returns {string|undefined} The name of the currently running Database container, if any.
   */
  #getCurrentDBContainer() {
    for (let i = 0; i < this.#containers.length; i++) {
      const container = this.#containers[i];
      const name = container.data.Names[0].slice(1);
      if (name.includes("-db-")) {
        return container;
      }
    }

    return undefined;
  }

  /**
   * Stops all the currently running Docker containers.
   * @returns {Promise<void>}
   */
  async #stopAllContainers() {
    this.#containers.forEach(async (container) => {
      await container.stop();
    });
  }

  /**
   * Deletes all the currently running Docker containers.
   * @returns {Promise<void>}
   */
  async #deleteAllContainers() {
    this.#containers.forEach(async (container) => {
      await container.delete({ force: true });
    });

    await this.#init();
  }
}
