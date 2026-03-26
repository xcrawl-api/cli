# XCrawl CLI

XCrawl CLI is the official command-line interface for XCrawl.
Use it to scrape pages, run search queries, map sites, and manage crawl jobs from your terminal.

## Installation

Run directly with `npx`:

```bash
npx -y @xcrawl/cli@latest --help
```

Install globally with npm:

```bash
npm install -g @xcrawl/cli
xcrawl --help
```

## Quick Start

Initialize authentication with browser login:

```bash
npx -y @xcrawl/cli@latest init -y --browser
```

Or authenticate after installation:

```bash
xcrawl login --browser
xcrawl login --api-key <your_api_key>
```

Run core commands:

```bash
xcrawl scrape https://example.com --format markdown
xcrawl search "xcrawl cli" --limit 10
xcrawl status
xcrawl map https://example.com --limit 10
xcrawl crawl https://example.com
xcrawl crawl status <job-id>
```

Default shortcut for scrape:

```bash
xcrawl https://example.com
```

## Authentication

XCrawl CLI supports browser authentication, manual API key entry, and environment variables:

```bash
xcrawl init -y --browser
xcrawl login
xcrawl login --browser
xcrawl login --api-key <your_api_key>
xcrawl logout
export XCRAWL_API_KEY=<your_api_key>
```

Saved credentials are stored in `~/.xcrawl/config.json`.

If no API key is configured, running `xcrawl` or any authenticated command prompts:

```text
XCrawl CLI
Turn websites into LLM-ready data

Welcome! To get started, authenticate with your XCrawl account.

1. Login with browser (recommended)
2. Enter API key manually

Tip: You can also set XCRAWL_API_KEY environment variable
```

## Common Commands

```bash
xcrawl init [-y] [--browser | --api-key <key>]
xcrawl login [--browser | --api-key <key>] [--json]
xcrawl scrape <url...> [--format markdown|json|html|screenshot|text] [--output <path>] [--json]
xcrawl search <query> [--limit <n>] [--json]
xcrawl map <url> [--limit <n>] [--json]
xcrawl crawl <url> [--wait]
xcrawl crawl status <job-id>
xcrawl status [--json]
```

Batch scrape example:

```bash
xcrawl scrape --input ./urls.txt --concurrency 3 --json
```

`urls.txt` should contain one URL per line. Lines starting with `#` are ignored.

## Configuration

Manage config values:

```bash
xcrawl config keys
xcrawl config get api-base-url
xcrawl config set api-base-url https://run.xcrawl.com
```

Configuration priority:
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

- Default output is human-readable text.
- Use `--json` for machine-readable output.
- Use `--output <path>` to save output to a file.
- Multi-URL scrape defaults to `.xcrawl/` when no output path is provided.

## API Routing Notes

- Default API base URL is `https://run.xcrawl.com`.
- `status` always calls `https://api.xcrawl.com/web_v1/user/credit-user-info`.
- `status` authentication is sent as query param: `app_key=<your_api_key>`.
