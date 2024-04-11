import next from "./next/delete.js";

export default {
  command: 'delete [command]',
  desc: 'Delete a project',
  builder: yargs => {
    yargs
      .command(next);
  },
  handler: _ => {}
}