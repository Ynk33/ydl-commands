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
  }
}
