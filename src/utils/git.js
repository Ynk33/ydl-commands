import { simpleGit } from "simple-git";
import cliProgress from "cli-progress";

const bar = new cliProgress.SingleBar(
  {
    format: "Progress [{bar}] {percentage}%",
  },
  cliProgress.Presets.shades_classic
);

let nbPhases = 1;

let previousProgress = 0;
let progressSum = 0;

const progress = (event) => {
  let progressDelta = event.progress - previousProgress;
  if (progressDelta < 0) {
    progressDelta = 100 - previousProgress + event.progress;
  }
  progressSum += progressDelta;
  const percent = progressSum / nbPhases;
  bar.update(percent);
  previousProgress = event.progress;
};

const startGitProgress = (phases) => {
  nbPhases = phases;
  previousProgress = 0;
  progressSum = 0;
  bar.start(100, 0);
};

const stopGitProgress = (_) => {
  bar.stop();
};

/**
 * Performs a git clone of the repo in the folder to.
 * @param {string} repo Repo to clone
 * @param {string} to Path where to clone to
 * @param {boolean} includeSubmodules If set to true, will call git clone with the flag --recurse-submodules
 */
export async function gitClone(repo, to, includeSubmodules = false) {
  const options = {
    "--recurse-submodules": includeSubmodules,
  };

  const git = simpleGit({
    progress: progress,
  });

  try {
    startGitProgress(4);
    await git.clone(repo, to, options);
    stopGitProgress();
  } catch (e) {
    console.error(e);
  }
}
