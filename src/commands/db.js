import migrateProd from "./db/migrate-prod.js";
import migrateRemote from "./db/migrate-remote.js";
import migrate from "./db/migrate.js";

export default {
  command: 'db <command>',
  desc: 'Database related commands',
  builder: yargs => {
    return yargs
      .command(migrate)
      .command(migrateRemote)
      .command(migrateProd);
  },
  handler: _ => {}
}