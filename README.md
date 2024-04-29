# YDL commands

YDL is a set of command tools to generate projects for Yanka Dev Lab.

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
GITHUB_AUTH_TOKEN= # your personnal Github Auth Token

TEMPLATE_WORDPRESS_REPO= # URL of the Wordpress template you want to use
TEMPLATE_NEXT_REPO= # URL of the Next template you want to use
```

## Usage

### Wordpress

#### Create a new project based on the `TEMPLATE_WORDPRESS_REPO` env variable

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

This command is a helper for git cherry-pick. It will display a list of commit from which you can choose which ones to cherry-pick.
> [!IMPORTANT]
> It has been designed for a repo (A) based on a template stored in another repo (B). In order to work, you will need to define a new remote with the name of the template repo (B) in your repo (A).
>
> ```bash
> git remote add [template repo name] [template repo url]
> ```

```bash
ydl git cherry-pick
```
