import next from "./next/create.js";
import wordpress from "./wordpress/create.js";

export default {
  command: 'create [command]',
  desc: 'Create a new project',
  builder: yargs => {
    yargs
      .command(wordpress)
      .command(next);
  },
  handler: _ => {}
}