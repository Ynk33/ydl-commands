import prompts from "prompts";
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
    console.log(colorize(cancelMessage, cancelMessageColor));
    console.log();

    return false;
  }

  console.log(colorize(confirmMessage, confirmMessageColor));
  console.log();
  return true;
}

/**
 * Sleep for a certain amount of time.
 * @param {number} ms Duration to sleep for.
 * @returns {Promise<void>} A Promise to wait for.
 */
export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Display the project data to the user and ask for its validation.
 * @param {string} projectName Name of the project
 * @param {string} projectPath Path of the project
 * @param {string} templateRepo Repo of the template to use to create the project
 * @returns {Promise<boolean>} True if the user confirmed all the data are correct. False otherwise.
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
 * @returns {Promise<boolean>} True if the user confirmed the deletion. False otherwise.
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

/**
 * Ask the user to confirm the migration.
 * @param {string} fromProject Path to the project the migration should start.
 * @param {string} fromDatabase Name of the database the migration should start.
 * @param {string} toProject Path to the project the migration should be applied to.
 * @param {string} toDatabase Name of the database the migration should be applied to.
 * @returns {Promise<boolean>} True if the user confirmed the migration. False otherwise.
 */
export async function validateMigrationData(fromProject, fromDatabase, toProject, toDatabase ) {
  console.log(
    colorize("The database ", Colors.FgGreen) + fromProject + "." + fromDatabase +
    colorize(" will be migrated to the database ", Colors.FgGreen) + toProject + "." + toDatabase
  );

  console.log();
  return await ask(
    "Are you sure about this?",
    "Great, proceeding.",
    "No worries. Cancelling."
  );
}
