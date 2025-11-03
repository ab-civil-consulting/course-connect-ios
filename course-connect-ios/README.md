# MC Assist

MC Assist, a video learning platform for PeerTube built with React Native.

Technologies that we depend upon:

- [Expo](https://docs.expo.dev/)
- [React](https://react.dev/learn)
- [React Native](https://reactnative.dev/docs/getting-started)
- [TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html)

## Contributing

Review existing issues to see if there's an open item to contribute to, or add a new one. If you identify bugs, please report them in a reproducible manner with all details upfront. We use the [Forking workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/forking-workflow) to collaborate.

## Development

Open your fork in GitHub Codespaces for developing and testing the code.

```bash
cd OwnTube.tv/
npm install
npm run web
```

> Note: The directory is still named `OwnTube.tv/` from the original fork. This will be renamed in a future update.

To get _Continuous Delivery_ from main branch working with GitHub Pages, open your fork _"Settings" > "Pages" > "Build and deployment"_ and select _"Source: GitHub Actions"_, then go to your fork _"Actions"_ tab and select _"I understand my workflows, go ahead and enable them"_.

When a improvement is ready to be contributed in a pull request, please review the following checklist:

1. Squash your changes into a single clear and thoroughly descriptive commit, split changes into multiple commits only when it contributes to readability
2. Reference the GitHub issue that you are contributing on in your commit title or body
3. Sign your commits, as this is required by the automated GitHub PR checks
4. Ensure that the changes adhere to the project code style and formatting rules by running `npx eslint .` and `npx prettier --check ./` from the `./OwnTube.tv/` directory (without errors/warnings)
5. Include links and illustrations in your pull request to make it easy to review
6. Request a review by @mykhailodanilenko, @ar9708, and @mblomdahl

## Documentation

Please refer to the [architecture documentation](docs/README.md) for information on technologies used, project structure, customizations, and the project build pipeline.

## About

MC Assist is a customized video learning platform built for AB Civil, based on the open-source PeerTube video platform. This project was originally forked from OwnTube.tv.
