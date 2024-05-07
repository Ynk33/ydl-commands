import DockerUtils from "../utils/docker.js"

export default {
  command: "test [arg]",
  desc: "Test command.",
  builder: {
    arg: {
      type: "string",
      desc: "Argument for test function",
    },
  },
  handler: async (argv) => {
    const docker = await DockerUtils.create();
    await docker.safelyRemoveContainers();
  }
}
