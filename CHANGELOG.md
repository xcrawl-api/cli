# Changelog

All notable changes to this project will be documented in this file.

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
