import wordpress from "./wordpress/wordpress.js";

export default {
  command: 'create [command]',
  desc: 'Create a new project',
  builder: yargs => {
    yargs
      .command(wordpress);
  },
  handler: _ => {}
}