*__A GitHub action that publishes your Garry's Mod addon to the Steam Workshop.__*

### Usage

This action has 5 parameters so far which are `account-name`, `account-password`, `workshop-id` and `addon-path`.

- `account-name` **[required]** is the Steam account name of the account the action is going to use.
- `account-password` **[required]** is the Steam password of the account the action is going to use.
- `account-secret` *[optional]* is the Steam shared secret if the account uses 2FA.
- `workshop-id` **[required]** is the Steam handle corresponding to your workshop addon, this parameter
is used to update the right addon.

- `addon-path` *[optional]* lets you target which path your addon files are under.

*Note: This uses [gmodws](https://github.com/Meachamp/gmodws) for workshop publishing.*

*Note 2: Because we are in an environment where input is not possible, we can only login to Steam
without SteamGuard.*

### Example Action
```yml
name: CI

on:
  push:
    branches: [ master ]
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - name: Checkout
        uses: actions/checkout@v2

      # Creates a GMA and publishes it to the Steam Workshop
      - name: Publish to Steam Workshop
        uses: Earu/GSW-action@V1.0
        with:
          account-name: ${{secrets.STEAM_NAME}}
          account-password: ${{secrets.STEAM_PASSWORD}}
          workshop-id: '1182471500'
          addon-path: ${{env.GITHUB_WORKSPACE}}
```