import migrate from "./db/migrate.js";

export default {
  command: 'db <command>',
  desc: 'Database related commands',
  builder: yargs => {
    return yargs
      .command(migrate);
  },
  handler: _ => {}
}