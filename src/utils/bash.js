import util from "util";
import { exec } from "child_process";
import Colors, { colorize } from "./colors.js";

const execute = util.promisify(exec); 

export default async function run(command, logErrors = true) {
  const { stdout, stderr } = await execute(command);
  console.log(stdout);
  if (logErrors) {
    console.log(colorize(stderr, Colors.FgYellow));
  }
}