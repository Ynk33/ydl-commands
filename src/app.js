#!/usr/bin/env node

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import path from "path";
import project from "./commands/project.js";
import test from "./commands/test.js";
import git from "./commands/git.js";
import db from "./commands/db.js";

const envPath = path.dirname(process.argv[1]) + "/../.env";
dotenvExpand.expand(dotenv.config({ path: envPath }));

let ydl = await yargs(hideBin(process.argv))
  .command(project)
  .command(git)
  .command(db)
  .command(test);

ydl = ydl.demandCommand()
  .help()
  .scriptName('ydl')
  .argv;