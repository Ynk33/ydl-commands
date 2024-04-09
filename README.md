# YDL commands

YDL is a set of command tools to generate projects for Yanka Dev Lab.

## Installation

- Clone the [ydl-commands](https://github.com/Ynk33/ydl-commands) project wherever you want:
```bash
git clone git@github.com:Ynk33/ydl-commands <your-path>
```

- Install the commands
```bash
cd <your-path>
npm install -g
```

- Add `<your-path>` to your PATH environment variable.

- In the project, copy the .env.sample and rename it .env, and set the `TEMPLATE_REPO` variable to whatever suits your need.

And then, your good to go!

## Usage

Create a new Wordpress project based on the template defined the env variable `TEMPLATE_REPO`.
```bash
ydl project create wordpress <project-name> <path>
```
