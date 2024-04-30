import prompts from "prompts";
import Colors, { colorize } from "../../utils/colors.js";
import { cherryPick, getCommitsList, gitFetch, hasRemote } from "../../utils/git.js";
import header from "../../utils/header.js";

export default {
  command: "cherry-pick <remote>",
  desc: "Perform an assisted git cherry-pick.",
  builder: {
    remote: {
      type: "string",
      desc: "Name of the remote you want to cherry-pick from.",
    },
  },
  handler: async (argv) => {

    /**
     * VARIABLES
     */
    const remote = argv.remote;
    
    /**
     * HEADER
     */

    header(
      "Yanka Dev Lab - Git Cherry-Pick",
      [
        colorize("Welcome to the assisted Cherry-Picking.", Colors.FgGreen),
        `This script will help you cherry-pick some commits from ${remote}.`,
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
    const lastCommits = await getCommitsList('origin', 50);
    let lastCommitsOnRemote = await getCommitsList(remote.toLowerCase(), 10);

    // Mark the commits that are already applied
    for (let i = 0; i < lastCommitsOnRemote.length; i++) {
      const commitOnRemote = lastCommitsOnRemote[i];

      for (let j = 0; j < lastCommits.length; j++) {
        const commit = lastCommits[j];
        

      if (commit.date === commitOnRemote.date
        && commit.message === commitOnRemote.message
        && commit.author_name === commitOnRemote.author_name
        && commit.author_email === commitOnRemote.author_email) {
          commitOnRemote['same'] = true;
          lastCommitsOnRemote[i] = commitOnRemote;
          break;
        }
      }
    }

    const commits = await prompts({
      type: "multiselect",
      name: "value",
      message: "Which commits would you like to cherry-pick? (Disabled options are the ones already applied)",
      choices: lastCommitsOnRemote.map((commit) => {
        return {
          title:
            commit.date + " - " + commit.author_name + ": " + commit.message,
          value: commit.hash,
          disabled: commit.same ?? false
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
