# Video Speed Shortcuts

[![Release](https://img.shields.io/github/v/release/chenghsj/video-speed-shortcuts?display_name=tag&sort=semver&label=release)](https://github.com/chenghsj/video-speed-shortcuts/releases/latest)
[![Privacy: No data collected](https://img.shields.io/badge/privacy-no_data_collected-2EA44F)](PRIVACY.md)
![Manifest V3](https://img.shields.io/badge/manifest-v3-4285F4)
![Chromium](https://img.shields.io/badge/Chromium-111%2B-4285F4?logo=googlechrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-142%2B-FF7139?logo=firefoxbrowser&logoColor=white)

A Manifest V3 browser extension that controls standard HTML5 video elements without relying on Netflix or other site-specific APIs. Store packages are built for Chromium and Firefox.

## Features

- Hold `Space` to temporarily play at a configurable speed; release to restore the previous speed.
- Short-press `Space` to play or pause.
- Increase speed with `Shift + >` (`Shift + .`); hold to keep increasing.
- Decrease speed with `Shift + <` (`Shift + ,`); hold to keep decreasing.
- Reset speed with `Shift + /`.
- Jump directly to a configurable preferred speed with `Shift + "`.
- Enable or disable individual shortcut actions, record custom keys, and configure speed range, step, target speed, hold speed, and hold delay.
- Use the popup for quick enable/disable controls, indicator visibility, language, and theme.
- Configure per-site rules that can disable shortcuts or override the preferred speed and action hints.
- Detect the interface language automatically, or choose English, Traditional Chinese, Simplified Chinese, Japanese, or Korean; choose System, Light, or Dark theme.
- Select the playing or most visible video when a page contains multiple videos.
- Run in website frames where extension content scripts are allowed.

## Development

Node.js 22 is used for release builds.

```sh
npm ci
npm test
npm run build
```

`npm run build` creates the Chromium build in `dist/chromium`.

### Load an unpacked build

For Chromium:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked** and choose `dist/chromium`.

For Firefox:

```sh
npm run build:firefox
```

Then open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, and choose `dist/firefox/manifest.json`.

## Release builds

To build both store packages locally, run:

```sh
npm run build:release
```

The unpacked builds are written to `dist/chromium` and `dist/firefox`. The **Build store releases** GitHub Actions workflow can also be run manually and provides these downloadable artifacts for 30 days:

| Artifact | Contents | Purpose |
| --- | --- | --- |
| `video-speed-shortcuts-chromium` | `video-speed-shortcuts-<version>-chromium.zip` | Upload to the Chrome Web Store |
| `video-speed-shortcuts-firefox` | Firefox extension and source ZIP files | Upload the extension to Firefox Add-ons and its source separately for AMO review |
| `video-speed-shortcuts-checksums` | `SHA256SUMS` | Verify all generated ZIP files |

The installable ZIP files contain `manifest.json` at their archive root and can be uploaded directly to their respective store dashboards.

### Publish a release

Update the version and create the matching Git tag:

```sh
npm version 0.1.1
git push origin HEAD --follow-tags
```

Replace `0.1.1` with the intended version. A tag such as `v0.1.1` must match the version in `package.json`. Pushing the tag runs tests, typechecking, browser-specific manifest validation, Firefox `web-ext` linting, and packaging. It then creates a GitHub Release containing:

- `video-speed-shortcuts-<version>-chromium.zip`
- `video-speed-shortcuts-<version>-firefox.zip`
- `video-speed-shortcuts-<version>-firefox-source.zip`
- `SHA256SUMS`

### Verify downloads

Place `SHA256SUMS` beside all downloaded ZIP files, then run one of the following commands.

Linux:

```sh
sha256sum -c SHA256SUMS
```

macOS:

```sh
shasum -a 256 -c SHA256SUMS
```

Every listed file should report `OK`.

### Firefox source submission

The Firefox artifact also contains a separate `firefox-source.zip` for AMO review. It is not an installable extension package. Reviewers can reproduce the submitted Firefox package on Ubuntu 24.04 with Node.js 22 by extracting the source archive and running:

```sh
npm ci
npm run build:firefox
```

The reproduced extension is written to `dist/firefox`.

## Privacy and permissions

Video Speed Shortcuts does not collect or transmit personal, browsing, technical, or usage data to the developer or third parties. All fonts and application assets are bundled with the extension. See the full [Privacy Policy](PRIVACY.md).

- `storage` stores playback settings, shortcuts, language, theme, and site rules in browser-managed synchronized storage.
- `scripting` activates the content script in already-open web tabs when the extension is first installed.
- `<all_urls>` lets playback shortcuts work on standard HTML5 videos across websites and inside permitted frames.

The extension uses shared shadcn-style UI primitives in `src/components/ui` for both the popup and options page. Settings are synchronized through `chrome.storage.sync`, including the selected locale and theme.

## Browser limitations

The extension works with normal HTML5 `<video>` elements. Browser-internal pages, protected extension pages, closed shadow roots, and some cross-origin iframe focus arrangements cannot be controlled by a content script. The `<all_urls>` permission is required so the feature can run across websites.
