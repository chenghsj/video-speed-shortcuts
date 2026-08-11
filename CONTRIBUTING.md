# Contributing

Thanks for helping improve Video Speed Shortcuts.

## Before you start

- Use the bug report template for reproducible defects.
- Use the feature request template to describe a problem or proposed improvement.
- Do not include private URLs, account data, tokens, or other sensitive information in issues or logs.
- Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Development setup

Video Speed Shortcuts uses Node.js 22.

```sh
npm ci
npm test
npm run build:release
```

Chromium and Firefox builds are written to `dist/chromium` and `dist/firefox`.

## Pull requests

1. Keep each pull request focused on one change.
2. Add or update tests for behavior changes and bug fixes.
3. Run `npm test` and `npm run build:release` before submitting.
4. Explain the user-visible behavior, test coverage, and any browser-specific differences.
5. Update documentation when settings, permissions, privacy behavior, or release procedures change.

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
