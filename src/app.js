#!/usr/bin/env node

import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import dotenv from "dotenv";
import project from "./commands/project.js";
import path from "path";
import test from "./commands/test.js";
import git from "./commands/git.js";

const envPath = path.dirname(process.argv[1]) + "/../.env";
dotenv.config({ path: envPath });

let ydl = await yargs(hideBin(process.argv))
  .command(project)
  .command(git)
  .command(test);

ydl = ydl.demandCommand()
  .help()
  .scriptName('ydl')
  .argv;