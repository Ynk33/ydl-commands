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

/**
 * Checks if the folder exists.
 * @param {string} folderPath Path of the folder to check
 * @returns {boolean} True if the folder exists. False otherwise.
 */
export function folderExists(folderPath) {
  return fs.existsSync(folderPath);
}

/**
 * Check if the folder exists and if it is empty, creates it if it's necessary. Returns false if the folder exists and is not empty.
 * @param {string} folderPath Path of the folder you want to create
 * @returns {boolean} True if the folder exists and is empty, or if it was created. False otherwise.
 */
export function createFolder(folderPath) {
  if (folderExists(folderPath)) {
    if (!isFolderEmpty(folderPath)) {
      console.log(
        colorize("The folder ", Colors.FgRed) +
          folderPath +
          colorize(" already exists and is not empty.", Colors.FgRed)
      );
      console.log(
        "Check again your " +
          colorize("projectName", Colors.FgBlue) +
          " and your " +
          colorize("path", Colors.FgBlue) +
          "."
      );
      console.log();

      return false;
    }
  }

  return true;
}

/**
 * Display the project data to the user and ask for its validation.
 * @param {string} projectName Name of the project
 * @param {string} projectPath Path of the project
 * @param {string} templateRepo Repo of the template to use to create the project
 * @returns True if the user confirmed all the data are correct. False otherwise.
 */
export async function validateCreateProjectData(
  projectName,
  projectPath,
  templateRepo
) {
  console.log(colorize("The project name is ", Colors.FgGreen) + projectName);
  console.log(
    colorize("The project will be created at ", Colors.FgGreen) +
      projectPath +
      colorize(" using the template ", Colors.FgGreen) +
      templateRepo
  );

  console.log();
  return await ask(
    "Are the information above correct?",
    "Great, proceeding.",
    "Ensure you enter the correct " +
      colorize("projectName", Colors.FgBlue) +
      colorize(" and the correct ", Colors.FgYellow) +
      colorize("path", Colors.FgBlue) +
      colorize(" next time ;)", Colors.FgYellow)
  );
}

/**
 * Ask the user to confirm the deletion of the project.
 * @param {string} projectName Name of the project.
 * @returns {boolean} True if the user confirmed the deletion. False otherwise.
 */
export async function validateDeleteProjectData(projectName) {
  console.log(
    colorize("The project ", Colors.FgGreen) +
      projectName +
      colorize(" will be deleted", Colors.FgGreen)
  );

  console.log();
  return await ask(
    "Are you sure about this?",
    "Great, proceeding.",
    "No worries. Cancelling."
  );
}
