import { Docker } from "node-docker-api";
import { Container } from "node-docker-api/lib/container.js";
import run, { runAndReturn } from "./bash.js";

/**
 * @class A set of helping functions to interact with Docker.
 */
class DockerUtils {

  /**
   * @constructor Creates a new DockerUtils instance with a connection to Docker.
   */
  constructor() {
    this.docker = new Docker();
  }

  /**
   * Get the currently running Docker containers.
   * @returns {Array<Container>} An Array the currently running Docker containers.
   */
  async getRunningContainers() {
    let containers = await this.docker.container.list();
    let runningContainers = [];
  
    containers.forEach(container => {
      if (container.data.State === 'running') {
        runningContainers.push(container);
      }
    });
  
    return runningContainers;
  }

  /**
   * Get the name of the currently running Wordpress container, if any.
   * @returns {string|undefined} The name of the currently running Wordpress container, if any.
   */
  async getCurrentWordpressContainer() {
    let containers = await this.getRunningContainers();

    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      const name = container.data.Names[0].slice(1);
      if (name.includes('-wordpress-')) {
        return name;
      }
    }

    return undefined;
  }

  /**
   * Get the name of the currently running Database container, if any.
   * @returns {string|undefined} The name of the currently running Database container, if any.
   */
  async getCurrentDBContainer() {
    let containers = await this.getRunningContainers();

    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      const name = container.data.Names[0].slice(1);
      if (name.includes('-db-')) {
        return name;
      }
    }

    return undefined;
  }

  /**
   * Get the IP address of the currently running Database container.
   * @returns The IP address of the currently running Database container.
   */
  async getDbContainerIpAddress() {
    const dbContainerName = await this.getCurrentDBContainer();
    let ipAddress = await runAndReturn(`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${dbContainerName}`);
    ipAddress = ipAddress.replace(/'/g, "");
    return ipAddress;
  }

  /**
   * Stops all the provided Docker containers.
   * @param {Array<Container>} containers The Docker containers to stop.
   */
  async stopContainers(containers) {
    containers.forEach(async container => {
      await container.stop();
    })
  }

  /**
   * Deletes all the provided Docker containers.
   * @param {Array<Container>} containers The Docker containers to delete.
   */
  async deleteContainers(containers) {
    containers.forEach(async container => {
      await container.delete({ force: true });
    })
  }

  /**
   * Up the Docker containers using docker compose up -d
   */
  async dockerComposeUp() {
    await run("docker compose up -d");
  }

  /**
   * Remove the Docker containers using docker compose down
   */
  async dockerComposeDown() {
    await run("docker compose down");
  }
}

export default DockerUtils;