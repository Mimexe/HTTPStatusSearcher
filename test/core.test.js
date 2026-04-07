import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  formatStatusLine,
  isCodesOutdated,
  parseCodesFile,
  searchStatusCodes,
  validateStatusInput,
} from "../dist/core.js";

test("validateStatusInput accepts valid wildcard and ranges", () => {
  assert.equal(validateStatusInput("*"), true);
  assert.equal(validateStatusInput("2xx"), true);
  assert.equal(validateStatusInput("200"), true);
  assert.equal(validateStatusInput("99"), false);
  assert.equal(validateStatusInput("600"), false);
  assert.equal(validateStatusInput("abc"), false);
  assert.equal(validateStatusInput("abc", true), "Please enter a valid number");
});

test("parseCodesFile strips download metadata", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "httpstatussearcher-"));
  const filePath = join(tempDir, "codes.json");

  writeFileSync(
    filePath,
    JSON.stringify({
      downloadOn: "2026-04-07T00:00:00.000Z",
      200: { code: 200, message: "OK", description: "Success" },
    }),
  );

  try {
    assert.deepEqual(parseCodesFile(filePath), {
      downloadOn: "2026-04-07T00:00:00.000Z",
      codes: {
        200: { code: 200, message: "OK", description: "Success" },
      },
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("searchStatusCodes matches code, message, and description", () => {
  const codes = {
    200: { code: 200, message: "OK", description: "Success" },
    404: {
      code: 404,
      message: "Not Found",
      description: "The requested page could not be found",
    },
    503: {
      code: 503,
      message: "Service Unavailable",
      description: "The server is currently unavailable",
    },
  };

  assert.deepEqual(searchStatusCodes(codes, "404"), ["404"]);
  assert.deepEqual(searchStatusCodes(codes, "found"), ["404"]);
  assert.deepEqual(searchStatusCodes(codes, "currently"), ["503"]);
});

test("isCodesOutdated treats missing or old dates as stale", () => {
  const now = new Date("2026-04-07T00:00:00.000Z");

  assert.equal(isCodesOutdated(undefined, now), true);
  assert.equal(isCodesOutdated("2026-03-15T00:00:00.000Z", now), false);
  assert.equal(isCodesOutdated("2026-02-01T00:00:00.000Z", now), true);
});

test("formatStatusLine matches CLI output", () => {
  assert.equal(
    formatStatusLine("200", {
      code: 200,
      message: "OK",
      description: "Success",
    }),
    "200 OK - Success",
  );
});
