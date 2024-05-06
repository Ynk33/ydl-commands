/**
 * Display a custom decorated header in the console.
 * @param {string} title Header's title.
 * @param {Array<string>} messages A list of messages to display after the title. 
 * @param {number} margin Number of characters to wrap aroung the title.
 * @param {char} char Character to use as a wrapper, for the decoration.
 */
export default function header(title, messages = [], margin = 20, char = "#") {

  // Decorate the title
  title = createLine(margin, char) + " " + title + " " + createLine(margin, char);

  // Create wrappers
  const wrapper = createLine(title.length, char);
  const separator = createLine(title.length, "~");

  // Output
  console.log(wrapper);
  console.log(title);
  console.log(wrapper);
  console.log();

  if (messages.length > 0) {
    for (let message of messages) {
      console.log(message);
    }
    console.log();
    console.log(separator);
    console.log();
  }
}

/**
 * Generates a custom string of the provided length, with the provided char.
 * @param {number} length Length of the line to create. 
 * @param {char} char Character to use for the line.
 * @returns A string with as many character as asked.
 */
function createLine(length, char = "#") {
  let line = "";
  for (let i = 0; i < length; i++) {
    line += char;
  }

  return line;
}