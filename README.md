*__A GitHub action that publishes your Garry's Mod addon to the Steam Workshop.__*

### Usage

This action has 3 parameters so far which are `steam-token`, `workshop-id` and `addon-path`.

- `steam-token` is a required parameter that will allow the action to authenticate to the Steam service and
push your updates, this parameter is ***required***.
- `workshop-id` is the Steam handle corresponding to your workshop addon, this parameter is ***required*** to
be able to update the right addon.

- `addon-path` is an ***optional*** parameter that lets you target which path your addon files are under.

*Note: This action only works with Windows X64*

### Example Action
```yml
name: CI

on:
  push:
    branches: [ master ]
  pull_request:
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
        uses: Earu/GSW-action@V1.6
        with:
          steam-token: ''
          workshop-id: '1182471500'
          addon-path: ${{env.GITHUB_WORKSPACE}}
```