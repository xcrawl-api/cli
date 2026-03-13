# Changelog

All notable changes to this project will be documented in this file.

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
