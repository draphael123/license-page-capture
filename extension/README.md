# License Page Capture

A local-first Chrome/Edge extension that saves the visible application page immediately before a user activates **Next**, **Continue**, **Proceed**, **Review**, or common **Save and continue** buttons.

## Install for testing

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. Open a licensing application and reload the page once.
5. Open the extension, enter a non-sensitive case label, state, and license type, then choose **Start capturing**.

Captures are stored under:

`Downloads/License Page Captures/<case>/<state>_<license>/`

## Safety behavior

- Captures stay on the computer and are not uploaded by the extension.
- Files go to the browser's Downloads location, which may be synchronized by software outside the extension.
- Automatic capture pauses when a page exposes recognizable password, SSN, payment, or verification-code fields.
- Safe mode stops navigation when capture fails.
- Sessions are isolated per tab and locked to the starting portal domain.
- The capture ledger can be exported as JSON.
- Login, browser-internal, and extension-store pages cannot be captured by Chrome extensions.
- Use a case identifier instead of a provider's full name in the case label.

## MVP boundaries

- Captures the visible viewport, matching an ordinary browser screenshot. It does not stitch a full scrolling page.
- Button detection uses text and accessibility labels. Add portal-specific labels in the extension when necessary.
- A portal can perform navigation through custom code that cannot safely be replayed. Test each new portal on a non-production or low-risk application first.
- The extension does not enter answers, submit applications, bypass authentication, or capture hidden fields.

## Suggested pilot

Run through one application without submitting it. Confirm that page numbers are sequential, sensitive screens are skipped, downloads finish, and the portal's Next/Continue buttons still behave normally.
