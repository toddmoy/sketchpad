# Template: the release workflow fills in __VERSION__ and __SHA256__
# and pushes the result to toddmoy/homebrew-tap.
cask "sketchpad" do
  version "__VERSION__"
  sha256 "__SHA256__"

  url "https://github.com/toddmoy/sketchpad/releases/download/v#{version}/Sketchpad.dmg"
  name "Sketchpad"
  desc "Menu bar sketchpad for handing drawings to LLMs"
  homepage "https://github.com/toddmoy/sketchpad"

  depends_on macos: ">= :big_sur"

  app "Sketchpad.app"

  # The app isn't notarized, so clear the quarantine flag to let it open without a Gatekeeper block.
  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{appdir}/Sketchpad.app"]
  end

  zap trash: [
    "~/Library/Application Support/Sketchpad",
    "~/Library/Logs/Sketchpad",
  ]
end
