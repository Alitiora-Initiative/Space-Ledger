# Release 1 accessibility and device validation checklist

**Status: test plan committed; manual device and assistive-technology results are not yet recorded.**
This document is a checklist, not a WCAG 2.2 AA conformance statement.

## Device tiers

| Tier | Target devices | Intended experience | Validation |
|---|---|---|---|
| Desktop | Windows/macOS/Linux laptops and desktops | Full workspace in a normal browser or installed PWA | Pending physical-device matrix |
| Tablet | iPad and Android tablets | Full workspace; touch, keyboard and pointer layouts | Pending physical-device matrix |
| Phone | iPhone and Android phones | Mobile Lite: browse, inspect blocks, read confirmed activity and view holdings; live purchase panel/shortcut hidden | Pending physical-device matrix |

Device detection is based on browser platform/user-agent hints with an iPadOS touch-Mac fallback. It is a presentation tier, not a security control. Server and on-chain authorization remain authoritative.

## Automated checks

Run from the repository root: npm test, npm audit, and npm run compile.

The compile command requires the Solana SBF build toolchain. Record when the toolchain is unavailable. Node tests include static accessibility, device-tier, PWA cache-boundary, indexer replay and transaction-recovery checks. They do not replace a manual WCAG audit.

## Manual test matrix — pending

| Platform/browser | Assistive technology/input | Required checks | Result |
|---|---|---|---|
| Windows 11 / Edge | Keyboard only | Skip link, nav, focus order, wallet modal, purchase recovery, grid alternatives | Not run |
| Windows 11 / Chrome | NVDA + keyboard | Landmarks, headings, labels, statuses, table alternative, errors | Not run |
| macOS / Safari | VoiceOver + keyboard | Main navigation, focus, device guide, forms, portfolio | Not run |
| macOS / Chrome | Keyboard + zoom | Reflow, 200%/400% zoom, no horizontal page overflow | Not run |
| iPadOS / Safari | Touch + VoiceOver + external keyboard | Full tablet tier, touch targets, orientation, Home Screen web app | Not run |
| Android tablet / Chrome | Touch + keyboard | Full tablet tier, pointer targets, orientation, install flow | Not run |
| iOS / Safari | VoiceOver + touch | Mobile Lite, browse/inspect/read-only purchase boundary, wallet-browser links | Not run |
| Android phone / Chrome | TalkBack + touch | Mobile Lite, wallet-browser links, no purchase panel/shortcut | Not run |

## Required manual scenarios

- Test at 320, 375, 768, 1024 and 1440 CSS-pixel viewport widths.
- Test portrait and landscape on phones and tablets.
- Verify visible focus for keyboard navigation and no keyboard trap.
- Verify every form field has a programmatic label and errors are announced.
- Verify status changes use appropriate live regions.
- Verify grid information can be understood through the 100-position text alternative without relying on colour.
- Verify the phone tier hides live purchase controls but retains exploration and portfolio reading.
- Verify reduced-motion and forced-colours/high-contrast modes.
- Verify all buttons and tap targets are practical on touch devices.
- Verify sticky navigation/footer does not obscure keyboard focus.
- Verify PWA offline mode clearly distinguishes cached pages from live API, wallet and transaction availability.
- Verify an offline/unknown purchase cannot be retried until recovery resolves it.

## Release gate

Do not close GitHub issue #23 until automated CI output, manual keyboard and screen-reader results, and responsive device evidence are recorded. Do not claim WCAG 2.2 AA conformance solely from automated tests.
