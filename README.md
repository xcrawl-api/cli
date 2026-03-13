# XCrawl CLI

XCrawl CLI is a Node.js command-line tool for scraping, searching, mapping, and crawling websites.

## Install

### Run with npx (no global install)

```bash
npx -y xcrawl-cli@latest doctor
```

### Install globally with npm

```bash
npm install -g xcrawl-cli
xcrawl --help
```

## Authenticate

Use either login command or environment variable.

```bash
# Save API key locally
xcrawl login --api-key <your_api_key>

# Or use env var
export XCRAWL_API_KEY=<your_api_key>
```

## Quickstart

```bash
# Scrape a page
xcrawl scrape https://example.com --format markdown

# Search
xcrawl search "xcrawl cli" --limit 10

# Map links in a site
xcrawl map https://example.com --limit 10

# Start a crawl
xcrawl crawl https://example.com

# Check crawl status
xcrawl crawl status <job-id>
```

Default shortcut:

```bash
xcrawl https://example.com
# same as:
xcrawl scrape https://example.com
```

## Batch Scraping

```bash
xcrawl scrape --input ./urls.txt --concurrency 3 --json
```

`urls.txt` should contain one URL per line. Lines starting with `#` are ignored.

## Config

```bash
xcrawl config keys
xcrawl config get api-base-url
xcrawl config set api-base-url https://run.xcrawl.com
```

Config priority:
1. CLI flags
2. Environment variables
3. Local config file `~/.xcrawl/config.json`
4. Defaults

Environment variables:
- `XCRAWL_API_KEY`
- `XCRAWL_API_BASE_URL`
- `XCRAWL_TIMEOUT_MS`
- `XCRAWL_OUTPUT_DIR`
- `XCRAWL_DEBUG`

## Output

- Default: human-readable text
- `--json`: machine-readable JSON
- `--output`: write output to file
- Multi-URL scrape defaults to `.xcrawl/` when no output path is provided

## Public API Notes

- Default API base URL is `https://run.xcrawl.com`.
- Public API currently does not expose standalone `whoami` / `credits` endpoints.
- CLI handles this with explicit fallback output instead of hard failure.

## Local Development

```bash
npm install
npm run build
npm run test
npm run lint
```

Real API smoke test:

```bash
export XCRAWL_API_KEY=<your_api_key>
npm run smoke
```
