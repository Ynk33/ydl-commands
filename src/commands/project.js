import create from "./project/create.js";

export default {
  command: 'project <command>',
  desc: 'Project related commands',
  builder: yargs => {
    return yargs
      .command(create);
  },
  handler: _ => {}
}