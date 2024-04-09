#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import dotenv from "dotenv";
import project from "./commands/project.js";
import path from "path";

const envPath = path.dirname(process.argv[1]) + "/../.env";
dotenv.config({ path: envPath });

let ydl = await yargs(hideBin(process.argv))
  .command(project);

ydl = ydl.demandCommand()
  .help()
  .scriptName('ydl')
  .argv;