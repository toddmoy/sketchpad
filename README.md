# Sketchpad

A menu bar sketchpad for macOS, built on [tldraw](https://tldraw.dev). Press a hotkey, sketch, copy the drawing as a PNG and paste it into an LLM chat.

## Install

**Homebrew**

```sh
brew install --cask toddmoy/tap/sketchpad
```

**Direct download**

Grab the latest `.dmg` from [Releases](https://github.com/toddmoy/sketchpad/releases) and drag Sketchpad to Applications.

Sketchpad isn't notarized by Apple yet, so the first launch is blocked. Open **System Settings → Privacy & Security**, scroll down and click **Open Anyway**. (Homebrew installs skip this step.)

## Use

| Key | Action |
| --- | --- |
| ⌥⌘D | Show / hide the sketchpad |
| ⌘↩ | Copy drawing as PNG and close |
| M | Mind map tool: click to add a node |
| Tab / Enter | Add child / sibling node while typing |
| Arrows | Move between mind map nodes |

Click outside to close. Right-click the menu bar icon to quit. Nothing is saved: the sketch lasts until you clear it or quit.

## Develop

```sh
pnpm install
pnpm dev        # run with hot reload
pnpm app        # build dist/mac-universal/Sketchpad.app
pnpm dist       # build .dmg and .zip
```

Copy `.env.example` to `.env` and add a tldraw license key to remove the license notice.

## Release

1. Bump `version` in `package.json` and commit.
2. `git tag v0.1.0 && git push --tags`

The Release workflow builds the app, publishes a GitHub Release and updates the cask in [toddmoy/homebrew-tap](https://github.com/toddmoy/homebrew-tap).

Repo secrets: `TLDRAW_LICENSE_KEY` (optional) and `TAP_TOKEN` (a token with write access to the tap repo).

## License

MIT. tldraw is used under its [hobby license](https://tldraw.dev/community/license).
