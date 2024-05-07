import util from "util";
import { exec } from "child_process";
import Colors, { colorize } from "./colors.js";

const execute = util.promisify(exec); 

/**
 * Run a bash command and wait for its completion.
 * @param {string} command The command to run.
 * @param {boolean} logErrors Whether the errors should be logged in the console or not.
 * @returns {Promise<void>}
 */
export async function run(command, logErrors = true) {
  const { stdout, stderr } = await execute(command);
  stdout && console.log(stdout);
  if (stderr && logErrors) {
    console.log(colorize(stderr, Colors.FgYellow));
  }
}

/**
 * Run a bash command, wait for its completion and return its ouput.
 * @param {string} command The command to run.
 * @param {boolean} logErrors Whether the errors should be logged in the console or not.
 * @returns {Promise<string>} The output (stdout) of the command.
 */
export async function runAndReturn(command, logErrors = true) {
  const { stdout, stderr } = await execute(command);
  if (stderr && logErrors) {
    console.log(colorize(stderr, Colors.FgYellow));
  }

  const result = stdout.replace(/(\r\n|\n|\r)/gm,""); // Removes the trailing break line that echo always adds.
  return result;
}