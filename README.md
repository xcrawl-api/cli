# XCrawl CLI

XCrawl CLI is the official command-line interface for XCrawl.
Use it to scrape pages, run search queries, inspect SERP engines, web scrapers, and LLM models, map sites, and manage crawl jobs from your terminal.

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
xcrawl llm --list-models
xcrawl llm chatgpt_model 'prompt=What is XCrawl CLI?' --param location=US
xcrawl search "xcrawl cli" --limit 10
xcrawl serp --list-engines
xcrawl serp google_search 'q=xcrawl cli'
xcrawl scraper --list-scrapers
xcrawl scraper reddit_user_posts 'url_list=["https://www.reddit.com/r/test/comments/abc"]'
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
xcrawl llm --list-models
xcrawl llm <model> [key=value...] [--param <key=value>] [--describe] [--json]
xcrawl search <query> [--limit <n>] [--json]
xcrawl serp --list-engines
xcrawl serp <engine> [key=value...] [--param <key=value>] [--describe] [--json]
xcrawl scraper --list-scrapers
xcrawl scraper <scraper> [key=value...] [--param <key=value>] [--describe] [--json]
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

LLM examples:

```bash
xcrawl llm --list-models
xcrawl llm chatgpt_model --describe
xcrawl llm chatgpt_model 'prompt=What is XCrawl CLI?' --param location=US --json
```

SERP examples:

```bash
xcrawl serp --list-engines
xcrawl serp bing_shopping --describe
xcrawl serp google_search 'q=xcrawl cli' --param page=2 --param no_cache=true --json
```

Web scraper examples:

```bash
xcrawl scraper --list-scrapers
xcrawl scraper reddit_user_posts --describe
xcrawl scraper reddit_user_posts 'url_list=["https://www.reddit.com/r/test/comments/abc"]' --json
```

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
- `xcrawl status` starts with `XCrawl cli v<version>` before account usage details.
- Use `--json` for machine-readable output.
- Use `--output <path>` to save output to a file.
- Multi-URL scrape defaults to `.xcrawl/` when no output path is provided.

## API Routing Notes

- Default API base URL is `https://run.xcrawl.com`.
- `llm` executes against `https://run.xcrawl.com/v1/llm` and loads metadata from `https://api.xcrawl.com/web_v1/scraping/xcrawl*`.
- `scraper` executes against `https://run.xcrawl.com/v1/data` and loads metadata from `https://api.xcrawl.com/web_v1/scraping/xcrawl*`.
- `status` always calls `https://api.xcrawl.com/web_v1/user/credit-user-info`.
- `status` authentication is sent as query param: `app_key=<your_api_key>`.
