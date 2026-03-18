#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function runCli(args) {
  const output = execFileSync('node', ['dist/index.js', ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      XCRAWL_API_KEY: process.env.XCRAWL_API_KEY
    }
  });
  return output.trim();
}

function printSection(title, content) {
  console.log(`\n=== ${title} ===`);
  console.log(content || '<empty>');
}

function main() {
  if (!process.env.XCRAWL_API_KEY) {
    console.error('Missing XCRAWL_API_KEY. Export it before running npm run smoke.');
    process.exit(1);
  }

  printSection('status', runCli(['status', '--json']));
  printSection('search', runCli(['search', 'xcrawl', '--limit', '2', '--json']));
  printSection('scrape', runCli(['scrape', 'https://example.com', '--format', 'markdown', '--json']));
  printSection('map', runCli(['map', 'https://example.com', '--limit', '2', '--json']));

  const crawlStartText = runCli(['crawl', 'https://example.com', '--json']);
  printSection('crawl start', crawlStartText);

  const crawlStart = JSON.parse(crawlStartText);
  if (crawlStart.jobId) {
    printSection('crawl status', runCli(['crawl', 'status', crawlStart.jobId, '--json']));
  } else {
    printSection('crawl status', '{"error":"crawl start did not return jobId"}');
  }

  writeFileSync('/tmp/xcrawl_urls.txt', 'https://example.com\nhttps://example.com\n', 'utf8');
  printSection('scrape input+concurrency', runCli(['scrape', '--input', '/tmp/xcrawl_urls.txt', '--concurrency', '2', '--json']));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Smoke test failed: ${message}`);
  process.exit(1);
}
