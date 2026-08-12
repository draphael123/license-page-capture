# Page Capture

Page Capture is a local-first Chrome and Microsoft Edge extension that saves a screenshot immediately before a user advances to the next page of a licensing application.

It is designed for licensing teams that currently stop and manually capture every application screen for documentation or audit purposes.

## What it does

- Detects common **Next**, **Continue**, **Proceed**, **Review**, and **Save and continue** controls.
- Captures the visible page before navigation occurs.
- Numbers screenshots in application order.
- Groups screenshots by case, jurisdiction, and license type.
- Shows a compact capture ledger in the extension popup.
- Supports manual capture for unusual portals.
- Pauses automatically when recognizable sensitive fields are present.

## What it does not do

- Upload screenshots to a server.
- Enter or change application answers.
- Submit applications or bypass authentication.
- Capture hidden fields or the entire scrolling page.
- Guarantee detection of every possible sensitive field or navigation control.

## Install the extension

1. Download the latest ZIP from the landing page or repository release.
2. Extract the ZIP to a permanent folder.
3. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted folder.
6. Reload the licensing portal once.

## Use it

1. Open the extension from the browser toolbar.
2. Enter a non-sensitive case label, state, and license type.
3. Leave **Pause on sensitive screens** enabled.
4. Select **Start capturing**.
5. Complete the application normally.
6. Confirm that the capture indicator appears before each page advances.
7. Select **Finish session** at the end.

Screenshots are saved under:

```text
Downloads/
  License Page Captures/
    <case>/
      <state>_<license>/
        001_Page-Name_<timestamp>.png
```

## Privacy and security

Screenshots can contain regulated or sensitive personal information. Page Capture stores files locally and performs no remote transmission, analytics, or cloud synchronization. Its sensitive-field detection is a helpful safeguard, not a substitute for organizational security controls.

Recommended operating rules:

- Use an internal case identifier instead of a provider's full name.
- Do not capture login, MFA, payment, identity-document, or security-answer screens.
- Keep the browser download folder inside an approved protected location.
- Test each new licensing portal without submitting an application.
- Follow applicable retention and deletion policies.

## Repository structure

```text
app/        Landing page
extension/  Chrome/Edge Manifest V3 extension
public/     Downloadable extension package and site assets
tests/      Site checks
```

## Local development

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
npm run build
```

## Current limitations

- Screenshot capture covers the visible viewport only.
- Navigation detection is based on control text.
- Some portals use custom event handling that may require a site-specific adapter.
- Browser-internal pages and extension-store pages cannot be captured.
- The developer preview must be loaded as an unpacked extension.

## Pilot checklist

- Use a low-risk application and do not submit it during the first test.
- Confirm page numbering remains sequential.
- Confirm screenshots finish downloading.
- Confirm sensitive pages are skipped.
- Confirm Next and Continue controls still work normally.
- Record any missed or unusual navigation labels for adapter support.

## License

Private developer preview. Add an open-source license before public distribution if external reuse is intended.
