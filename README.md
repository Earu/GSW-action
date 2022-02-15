*__A GitHub action that publishes your Garry's Mod addon to the Steam Workshop.__*

### Usage

This action has 5 parameters so far which are `account-name`, `account-password`, `account-secret`, `workshop-id` and `addon-path`.

- `account-name` **[required]** is the Steam account name of the account the action is going to use.
- `account-password` **[required]** is the Steam password of the account the action is going to use.
- `workshop-id` **[required]** is the Steam handle corresponding to your workshop addon, this parameter
is used to update the right addon.

- `account-secret` *[optional]* is the Steam shared secret if the account uses 2FA.
- `addon-path` *[optional]* lets you target which path your addon files are under.

*Note: This action will only run on a Windows container because it uses gmpublish.exe.*

### Example Action
```yml
name: CI

on:
  push:
    branches: [ master ]
  workflow_dispatch:

jobs:
  publish:
    runs-on: windows-latest
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - name: Checkout
        uses: actions/checkout@v2

      # Creates a GMA and publishes it to the Steam Workshop
      - name: Publish to Steam Workshop
        uses: Earu/GSW-action@V3.0
        with:
          account-name: ${{secrets.STEAM_NAME}}
          account-password: ${{secrets.STEAM_PASSWORD}}
          account-password: ${{secrets.STEAM_SECRET}}
          workshop-id: '1182471500'
          addon-path: ${{env.GITHUB_WORKSPACE}}
```

### Debugging / Building / Contribution
- The project runs with NPM, any PR changing NPM to any other package manager will be denied.
- To build the project and run it: `npm run start`
- For customizing the inputs while debugging: change the `debug.ts` file and set the `DEBUG` flag to true in `index.ts`
- If you're adding new dependencies they must be packaged in the repo for the action to work
- Follow the indentation and naming conventions already in place
  - camelCase for variables and functions
  - BIG_SNAKE_CASE for constants
  - no variable name thats under 3 characters, unless widely accepted (e.g error => e)
- Please DEBUG & TEST your code before submitting a PR