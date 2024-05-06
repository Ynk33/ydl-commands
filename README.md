# YDL commands

YDL is a tool set of commands to help with project creation and management.

## Installation

- Clone the [ydl-commands](https://github.com/Ynk33/ydl-commands) project wherever you want:

```bash
git clone git@github.com:Ynk33/ydl-commands <your-path>
```

- Install the dependencies

```bash
cd <your-path>
npm install -g
```

- Add `<your-path>` to your PATH environment variable.

- In the project, copy the `.env.sample` file, rename it `.env`, and set the environment variables:

```bash
# Personnal authentication token delivered by Github to use the API.
GITHUB_AUTH_TOKEN=""
# User's repo owner.
GITHUB_OWNER=""

# Name of the Wordpress template repo.
TEMPLATE_WORDPRESS_NAME=""
# Name of the Next template repo.
TEMPLATE_NEXT_NAME=""

# Repository where the Wordpress template is stored.
TEMPLATE_WORDPRESS_REPO="git@github.com:$GITHUB_OWNER/$TEMPLATE_WORDPRESS_NAME"
# Repository where the Next template is stored.
TEMPLATE_NEXT_REPO="git@github.com:$GITHUB_OWNER/$TEMPLATE_NEXT_NAME"
```

## Usage

### Wordpress

#### Create a new project based on the `TEMPLATE_WORDPRESS_REPO`

```bash
ydl project create wordpress <project-name> <path>
```

### Next

#### Create a project based on the template `TEMPLATE_NEXT_REPO`

```bash
ydl project create next <project-name> <path>
```

#### Delete a project

> [!CAUTION]
> This action is irreversible!

```bash
ydl project delete next <project-name>
```

You will be asked if you also want to delete the associated repo.

> [!IMPORTANT]
> You will need the delete permission on this repo to perform this action.

### Git

#### Cherry-pick

This command is an assisted git cherry-pick. It will display a list of commit from which you can choose which ones to cherry-pick.

> [!NOTE]
> The ones already applied will be disabled to prevent to reapply them.

```bash
ydl git cherry-pick <remote> [branch]
```

> [!IMPORTANT]
> If `branch` is not specified, the current branch will be used for the remote.
