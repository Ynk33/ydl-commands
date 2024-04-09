import { Docker } from "node-docker-api";
import { Container } from "node-docker-api/lib/container.js";
import run from "./bash.js";

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
      await container.delete();
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