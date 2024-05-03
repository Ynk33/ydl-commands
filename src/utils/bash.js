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

export async function runAndReturn(command, logErrors = true) {
  const { stdout, stderr } = await execute(command);
  if (logErrors) {
    console.warn(stderr);
  }

  const result = stdout.replace(/(\r\n|\n|\r)/gm,""); // Removes the trailing break line that echo always adds.
  return result;
}