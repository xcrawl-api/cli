# Changelog

All notable changes to this project will be documented in this file.

## [0.2.8] - 2026-03-31

### Changed
- Removed `email` and `created at` from `xcrawl status` output to avoid exposing unnecessary account details.
- Stopped relying on legacy `username`, `email`, and `created_at` fields in `status` response mapping.
- Added CLI version display to `xcrawl status`, with a themed `XCrawl cli v<version>` header in terminal output.

## [0.2.7] - 2026-03-26

### Added
- Added browser-based authentication with PKCE-style challenge generation and XCrawl dashboard handoff.
- Added `xcrawl init -y --browser` for non-interactive setup during install or onboarding.
- Added interactive authentication fallback when `xcrawl` or an authenticated command runs without an API key.

### Changed
- Updated `login` to support browser authentication and interactive auth method selection.
- Kept authenticated command JSON output clean by routing auth prompts to stderr before command results.
- Expanded integration coverage for browser auth, root onboarding flow, and non-interactive init validation.

## [0.2.6] - 2026-03-18

### Changed
- Removed the `doctor` command and related user-facing references.
- Removed the `Username` line from human-readable `status` output.
- Updated smoke script and README examples to match the current command set.

## [0.2.5] - 2026-03-17

### Changed
- Updated `status` command to always call `https://api.xcrawl.com/web_v1/user/credit-user-info`.
- Updated `status` and `doctor` account checks to send API key as query param `app_key` for account status endpoint requests.
- Removed `--api-base-url` override from `status` to avoid ambiguous routing behavior.
- Refined `README.md` structure to a more user-facing layout and removed the local development section.

## [0.2.0] - 2026-03-12

### Added
- Added `map` command and API integration.
- Added `crawl` command with `crawl status` and optional `--wait` polling.
- Added `config get`, `config set`, and `config keys` commands.
- Added batch scraping support with `--input` and `--concurrency`.
- Added real API smoke test script: `npm run smoke`.
- Added GitHub Actions workflow for build/test/lint and optional smoke test.

### Changed
- Updated default API base URL to `https://run.xcrawl.com`.
- Aligned API method and response mapping for `scrape`, `search`, `map`, and `crawl`.
- Improved `doctor` connectivity behavior for public API account endpoint limitations.
- Improved `whoami` and `credits` with actionable fallback output when account endpoints are not exposed by public API.

### Quality
- Expanded integration test coverage for new commands and fallback behavior.
- Current automated checks: `npm run build`, `npm run test`, and `npm run lint`.
