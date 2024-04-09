import prompts from "prompts";
import fs from "fs";
import Colors, { colorize } from "./colors.js";

/**
 * Prompts a yes/no question in the console, with the provided messages.
 * 
 * @param {string} question The question to prompt.
 * @param {string} confirmMessage Displayed if the user confirms.
 * @param {string} cancelMessage Displayed if the user cancels.
 * @param {string} confirmMessageColor Color of the confirm message.
 * @param {string} cancelMessageColor Color of the cancel message.
 * @returns {boolean} True if the user confirmed, false otherwise.
 */
export async function ask(
  question,
  confirmMessage,
  cancelMessage,
  confirmMessageColor = Colors.FgGreen,
  cancelMessageColor = Colors.FgYellow
) {
  const response = await prompts({
    type: "confirm",
    name: "confirm",
    message: question,
  });

  if (!response.confirm) {
    console.log();
    console.log("That's alright. This script will be canceled.");
    console.log(colorize(cancelMessage, cancelMessageColor));
    console.log();

    return false;
  }

  console.log(colorize(confirmMessage, confirmMessageColor));
  console.log();
  return true;
}

/**
 * Check whether the folder at provided path is empty.
 * @param {string} folderPath Path to the folder to check. Can be relative or absolute.
 * @returns {boolean} True if the folder is empty, false otherwise.
 */
export function isFolderEmpty(folderPath) {
  return fs.readdirSync(folderPath).length === 0;
}
