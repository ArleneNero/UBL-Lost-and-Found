#!/usr/bin/env node

/**
 * UBL Lost and Found — Automated Smoke Test Script
 * Zero-dependency ESM Node.js script (>= Node 20 native fetch & performance.now).
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   node scripts/smoke-test.mjs --base-url=http://localhost:3000 --frontend-url=http://localhost:4173
 *   node scripts/smoke-test.mjs --base-url=https://lostandfound-budiluhur.web.id
 */

const REQUEST_TIMEOUT_MS = 15_000;

function parseArgs(argv) {
  let baseUrl = 'http://localhost:3000';
  let frontendUrl = null;

  for (const arg of argv) {
    if (arg.startsWith('--base-url=')) {
      baseUrl = arg.slice('--base-url='.length).trim();
    } else if (arg.startsWith('--frontend-url=')) {
      frontendUrl = arg.slice('--frontend-url='.length).trim();
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: node scripts/smoke-test.mjs [options]',
          '',
          'Options:',
          '  --base-url=<url>       Backend API base URL (default: http://localhost:3000)',
          '  --frontend-url=<url>   Frontend URL (default: same as --base-url)',
          '  -h, --help             Show this help message',
        ].join('\n')
      );
      process.exit(0);
    }
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedFrontend = (frontendUrl || normalizedBase).replace(/\/+$/, '');

  return { baseUrl: normalizedBase, frontendUrl: normalizedFrontend };
}

async function timedFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/yaml, text/html, */*',
        ...(options.headers || {}),
      },
    });
    const bodyText = await response.text();
    const latencyMs = performance.now() - start;
    return { ok: true, status: response.status, bodyText, latencyMs };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 'ERR', bodyText: '', latencyMs, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' };
  }
}

function formatTable(rows) {
  const headers = ['Probe', 'Endpoint', 'Status', 'Latency (ms)', 'Result'];
  const widths = headers.map((h, idx) =>
    Math.max(h.length, ...rows.map((r) => String(r[idx]).length))
  );

  const line = (cols) =>
    '| ' + cols.map((c, idx) => String(c).padEnd(widths[idx])).join(' | ') + ' |';
  const sep =
    '|-' + widths.map((w) => '-'.repeat(w)).join('-|-') + '-|';

  return [line(headers), sep, ...rows.map(line)].join('\n');
}

async function main() {
  const { baseUrl, frontendUrl } = parseArgs(process.argv.slice(2));

  const probes = [
    {
      name: '1. Health Check & Version',
      endpoint: `${baseUrl}/api/v1/health`,
      validate: (res) => {
        if (res.status !== 200) return `Expected HTTP 200, got ${res.status}`;
        const parsed = safeJsonParse(res.bodyText);
        if (!parsed.ok) return `Invalid JSON: ${parsed.error}`;
        const { status, version } = parsed.value ?? {};
        if (status !== 'ok') return `Expected status === "ok", got ${JSON.stringify(status)}`;
        if (typeof version !== 'string' || version.trim().length === 0) {
          return `Expected non-empty version string, got ${JSON.stringify(version)}`;
        }
        return null;
      },
    },
    {
      name: '2. Public Service Posts',
      endpoint: `${baseUrl}/api/v1/posts`,
      validate: (res) => {
        if (res.status !== 200) return `Expected HTTP 200, got ${res.status}`;
        const parsed = safeJsonParse(res.bodyText);
        if (!parsed.ok) return `Invalid JSON: ${parsed.error}`;
        const data = parsed.value?.data;
        if (!Array.isArray(data) || data.length === 0) {
          return 'Expected non-empty JSON data array';
        }
        return null;
      },
    },
    {
      name: '3. Public Items (Zero PII Leak)',
      endpoint: `${baseUrl}/api/v1/items?page=1&limit=5`,
      validate: (res) => {
        if (res.status !== 200) return `Expected HTTP 200, got ${res.status}`;
        if (/private_verification_notes|privateVerificationNotes/i.test(res.bodyText)) {
          return 'PII leak detected: private_verification_notes present in payload';
        }
        const parsed = safeJsonParse(res.bodyText);
        if (!parsed.ok) return `Invalid JSON: ${parsed.error}`;
        const data = parsed.value?.data;
        if (!Array.isArray(data)) return 'Expected JSON data array';
        return null;
      },
    },
    {
      name: '4. Officer RBAC Guard (Unauth)',
      endpoint: `${baseUrl}/api/v1/officer/inventory`,
      validate: (res) => {
        if (res.status !== 401) return `Expected HTTP 401, got ${res.status}`;
        return null;
      },
    },
    {
      name: '5. OpenAPI YAML Contract',
      endpoint: `${baseUrl}/openapi.yaml`,
      validate: (res) => {
        if (res.status !== 200) return `Expected HTTP 200, got ${res.status}`;
        if (!res.bodyText.includes('openapi:')) {
          return 'Response body does not contain "openapi:"';
        }
        return null;
      },
    },
    {
      name: '6. Frontend SPA Entrypoint',
      endpoint: `${frontendUrl}/`,
      validate: (res) => {
        if (res.status !== 200) return `Expected HTTP 200, got ${res.status}`;
        const lower = res.bodyText.toLowerCase();
        if (!lower.includes('<div id="root">') && !lower.includes('<!doctype html>')) {
          return 'HTML missing <div id="root"> or <!doctype html>';
        }
        return null;
      },
    },
  ];

  console.log(`\nUBL Lost and Found — Smoke Test Suite`);
  console.log(`Backend Base URL : ${baseUrl}`);
  console.log(`Frontend URL     : ${frontendUrl}\n`);

  const tableRows = [];
  const failures = [];

  for (const probe of probes) {
    const res = await timedFetch(probe.endpoint);
    const errorDetail = res.ok ? probe.validate(res) : `Network error: ${res.error}`;
    const passed = errorDetail === null;

    tableRows.push([
      probe.name,
      probe.endpoint,
      String(res.status),
      res.latencyMs.toFixed(1),
      passed ? 'PASS' : 'FAIL',
    ]);

    if (!passed) {
      failures.push({ probe: probe.name, endpoint: probe.endpoint, reason: errorDetail });
    }
  }

  console.log(formatTable(tableRows));

  const passedCount = probes.length - failures.length;
  console.log(`\nSummary: ${passedCount}/${probes.length} probes PASSED.`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const f of failures) {
      console.error(`  - [${f.probe}] (${f.endpoint}): ${f.reason}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
