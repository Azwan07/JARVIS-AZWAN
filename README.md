# JARVIS AZWAN iPhone v4

## Included in this build
1. iPhone command-centre UI based on the JARVIS AZWAN HUD references.
2. Work Mode foreground voice loop, Rapid Response, Ambient and Private modes.
3. PWA/Home Screen package: manifest + service worker.
4. GitHub Pages-ready root `index.html` and `.nojekyll`.
5. Orange/amber JARVIS Core using the supplied reference image with live speaking pulse/rings.
6. Free-first, provider-neutral local command brain with optional OpenAI-compatible endpoint field; no API key embedded.
7. Local memory/context: turns, tasks, mode, logs, voice preference and optional endpoint stored on-device.
8. Companion behaviour: English UK speech, prioritised male British voices when supplied by iOS/browser, speech interruption, Work Mode listening loop, Private Mode microphone off.

## Voice
The build requests `en-GB` and prioritises available voices such as Daniel/Oliver/Arthur/Google UK English Male. Exact movie JARVIS voice reproduction is not guaranteed because iOS exposes only voices installed/provided by the device/browser.

## Security boundary
This is an iPhone Gateway build. It does not execute financial transactions, official submissions, destructive actions, or external commitments. Such actions remain approval-gated. Do not place API keys, passwords, seed phrases, private keys, or production credentials in this repository.

## GitHub Pages
GitHub Pages can publish static HTML/CSS/JS from a public GitHub Free repository. The source root contains `index.html` and `.nojekyll` so it is ready for branch-root publishing. GitHub notes that publication can take up to about 10 minutes after a push.

For the project repository `Azwan07/JARVIS-AZWAN`, publish from `main` / root in Settings → Pages → Deploy from a branch.

## iPhone Home Screen
After the HTTPS GitHub Pages URL exists: open it in Safari → Share → Add to Home Screen → enable Open as Web App → Add.

## Current implementation boundary
Foreground web voice only. Locked-screen/background 24/7 microphone is intentionally deferred to the later native/background stage of the master plan.
