# Consultation scheduling and workspace refinement

The main site navigation uses Profile. Inside the workspace, Account opens personal information, preferences and security. Desktop tabs lead the page; the introduction and platform status appear underneath on Overview only. Overview and Consultations share a labelled engagement-status select.

Owners publish availability windows with a numeric duration in minutes, hours, days, weeks or calendar months. Clients choose an available date, start time and duration. Presets include 30 minutes, one/two hours, one day, one week and one month; custom amounts remain editable. Starts are offered every 30 minutes, which is a start-time cadence, not a duration restriction. A calendar month preserves UTC time and clamps month-end dates to the target month's last day.

Migration 006 removes the legacy 30-minute window constraint and opens October 2026 around existing availability without deleting existing windows or bookings. Past times cannot be requested. Newly published windows must start at least 30 minutes in the future, within six months, and can span up to one year. Requested durations must fit the selected available window. A longer engagement requires a sufficiently long window; October availability does not extend into November.

Approved and completed bookings remain protected by PostgreSQL's interval exclusion constraint. Clients see reserved intervals omitted from available starts. Pending requests do not reserve time. Approval declines only overlapping pending requests, preserving unrelated requests in the same window. The public API returns only reserved time intervals, never other clients' identities or project details.

Log out is presented as a navigation link, submitting the existing same-origin POST form. `/logout` provides a confirmation form for browsers without JavaScript. Mobile conversation controls use explicit spacing, a bounded scrollable message history, a separate composer and touch-size formatting controls.

## Verification

`tests/consultation-layout.spec.ts` checks overview order, dropdown filters, custom duration controls, responsive width, navigation labels and POST logout semantics. `tests/consultation-constraints.sql` verifies variable durations and overlap protection inside a rolled-back transaction; synthetic database profiles and jobs are never retained. Additional workspace, profile and navigation browser tests cover existing flows.

Implementation, test results and production deployment evidence are recorded below once verified. Screenshots with intercepted API fixtures are layout evidence, not live accounts or telemetry.

Local verification: lint, TypeScript and the production webpack build passed. The first targeted desktop/mobile run passed 27 of 28 checks; one mobile workspace scenario timed out. The isolated retry also timed out during initial page navigation, before assertions. The development container had exhausted its 1 GB swap during the build. The full CI suite will provide an independent check on a fresh runner. A database transaction applied migration 006, verified hour/week bookings and overlap rejection, then rolled back all changes and fixtures. Desktop/mobile chat, Account and Users captures were inspected; the correction batch improves mobile account identity wrapping.
