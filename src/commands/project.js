import create from "./project/create.js";
import _delete from "./project/delete.js";

export default {
  command: 'project <command>',
  desc: 'Project related commands',
  builder: yargs => {
    return yargs
      .command(create)
      .command(_delete);
  },
  handler: _ => {}
}