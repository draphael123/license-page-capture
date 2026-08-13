# Chrome Web Store submission

## Listing

**Name:** License Page Capture

**Summary:** Automatically save a local screenshot before advancing through a licensing application.

**Category:** Productivity

**Language:** English

**Single purpose:** License Page Capture creates a local, sequential visual record of licensing application pages when the user starts a capture session and advances through an application.

## Detailed description

License Page Capture reduces the manual work of documenting professional licensing applications. Start a named test, then complete the application normally. Before recognized Next or Continue controls advance the portal, the extension saves a numbered screenshot to a session-specific folder in Downloads.

Features include visible-area or optional full-page capture, sensitive-screen skipping, duplicate prevention, domain locking, saved-page status, thumbnail review, individual screenshot removal, and local session summaries.

Page Capture does not enter answers, submit applications, bypass authentication, run analytics, or upload screenshots. All files remain in the browser's configured Downloads location unless the device or browser independently synchronizes that folder.

## Privacy fields

**Privacy policy:** https://license-page-capture.daniel254762.chatgpt.site/privacy

**Data handled:** Website content (screenshots and page labels), browsing activity (portal origin and page URL), and user-provided test labels. This information is processed and stored locally to provide the extension's capture and recovery features. It is not transmitted to the developer or third parties.

**Limited Use certification:** The extension's handling of user data is limited to its disclosed screenshot-recording purpose. Data is not sold, used for advertising or credit decisions, transferred to third parties, or read by the developer.

## Permission justifications

- `activeTab`: captures the application tab only after the user starts a test.
- `tabs`: isolates capture sessions by tab and obtains the current page title and URL for the local record.
- `downloads`: saves screenshots, summaries, and technical logs locally; opens or removes a user-selected downloaded screenshot.
- `storage`: recovers session status and remembers user-provided button labels for a portal.
- `<all_urls>`: recognizes navigation controls on licensing portals selected by the user. Capture remains inactive until the user starts a test and locks to that test's starting domain.

## Test instructions

1. Open `https://license-page-capture.daniel254762.chatgpt.site/#demo`.
2. Open License Page Capture, name the test, and select **Start test**.
3. Use the mock application's Next controls and confirm the saved-page count increases.
4. Select **Finish test** to review the record.
5. Sensitive-screen behavior can be reviewed using the demo's sensitive-page example.

No account or credentials are required.
