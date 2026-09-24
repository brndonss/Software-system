import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the conversation mounted above the generated draft section", async () => {
  const source = await readFile("src/app/components/CommandCanvas.tsx", "utf8");

  assert.match(source, /turns\.map\(\(turn, index\)/);
  assert.match(source, /className="command-canvas-learned"/);
  assert.match(source, /draftSectionRef\.current\?\.scrollIntoView/);
  assert.match(source, /className="command-canvas-draft-bar"/);
});

test("does not restore the pre-session-version conversation cache", async () => {
  const source = await readFile("src/app/components/CommandCanvas.tsx", "utf8");

  assert.match(source, /command-canvas:v2:/);
  assert.doesNotMatch(source, /sessionStorage\.(getItem|setItem)\(`command-canvas:\$\{/);
});