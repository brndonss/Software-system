import { createHash } from "node:crypto";
import { stableStringify } from "./canonicalize";

export function sha256(value: unknown): string {
  return `sha256-${createHash("sha256").update(stableStringify(value), "utf8").digest("hex")}`;
}

export function buildIdempotencyKey(input: {
  workspaceId: string;
  blueprintId: string;
  blueprintVersion: number;
  compilerVersion: number;
  blueprintHash: string;
  compatibilityHash: string;
}): string {
  return [
    input.workspaceId,
    input.blueprintId,
    input.blueprintVersion,
    input.compilerVersion,
    input.compatibilityHash,
    input.blueprintHash,
  ].join(":");
}
