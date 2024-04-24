import cherryPick from "./git/cherry-pick.js";

export default {
  command: 'git <command>',
  desc: 'Git related commands',
  builder: yargs => {
    return yargs
      .command(cherryPick);
  },
  handler: _ => {}
}