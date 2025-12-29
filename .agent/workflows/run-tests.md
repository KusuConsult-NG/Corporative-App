---
description: How to run automated E2E tests for the Corporative App
---

This workflow explains how to run the automated Playwright tests to quickly verify critical flows like Loan Applications and Authentication.

// turbo-all
1. Ensure the local dev server is ready (the test command will start it automatically if not running).
2. Seed the test data in Firebase:
```bash
node tests/helpers/setupTestUsers.js
```
3. Run the E2E tests:
```bash
npx playwright test
```
4. View the test results:
```bash
npx playwright show-report
```

### Critical Flows Covered:
- **Authentication**: Ensures users can log in and session is preserved.
- **Loan Application**: Automates the entire process of applying for a Swift Relief Loan, including file uploads and guarantor selection.
