import prompts from "prompts";
import Colors, { colorize } from "../../utils/colors.js";
import { cherryPick, getCommitsList, gitFetch, hasRemote } from "../../utils/git.js";
import header from "../../utils/header.js";

export default {
  command: "cherry-pick",
  desc: "Perform an assisted git cherry-pick in the current Next project.",
  builder: {},
  handler: async (_argv) => {

    /**
     * VARIABLES
     */
    const remote = process.env.TEMPLATE_NEXT_NAME;
    
    /**
     * HEADER
     */

    header(
      "Yanka Dev Lab - Git Cherry-Pick",
      [
        colorize("Welcome to the assisted Cherry-Picking.", Colors.FgGreen),
        `This script will help you cherry-pick some commits from ${remote} for your Next project.`,
      ],
      20
    );

    /**
     * PRE-REQUISITE
     */

    console.log("Checking pre-requisites...");
    console.log();

    if (!(await hasRemote(remote.toLowerCase()))) {
      console.log(
        colorize(
          `The project doesn't have the remote "${remote}". It is not a Next project, or it has a bad configuration.`,
          Colors.FgRed
        )
      );
      console.log();
      return;
    }

    console.log(
      colorize(`"${remote}" remote found. Let's proceed...`, Colors.FgGreen)
    );
    console.log();

    /**
     * COMMITS SELECTION
     */

    console.log(colorize(`Fetching on ${remote}...`, Colors.FgYellow));
    await gitFetch(remote.toLowerCase());

    console.log(colorize("Retrieving commits...", Colors.FgYellow));
    const lastCommits = await getCommitsList(remote.toLowerCase());

    const commits = await prompts({
      type: "multiselect",
      name: "value",
      message: "Which commits would you like to cherry-pick?",
      choices: lastCommits.map((commit) => {
        return {
          title:
            commit.date + " - " + commit.author_name + ": " + commit.message,
          value: commit.hash,
        };
      }),
      hint: "- Space to select. Return to submit",
    });
    console.log();

    if (commits.value.length === 0) {
      console.log(colorize("You didn't select any commit", Colors.FgYellow));
      console.log("Cherry-picking canceled.");
      return;
    }

    console.log(colorize("Cherry-picking...", Colors.FgYellow));
    cherryPick(commits.value.reverse());

    console.log();
    console.log(colorize("Cherry-picking done!", Colors.FgGreen));
    console.log();
  },
};
