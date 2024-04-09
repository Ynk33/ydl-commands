#!/usr/bin/env node --env-file=.env

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import project from "./commands/project.js";

let ydl = await yargs(hideBin(process.argv))
  .command(project);

ydl = ydl.demandCommand()
  .help()
  .scriptName('ydl')
  .argv;