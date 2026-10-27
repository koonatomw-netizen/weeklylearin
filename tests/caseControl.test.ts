import { describe, expect, it } from "vitest";
import { caseBlockReason } from "../src/worker/view";
import { snapshot } from "./helpers/snapshot";

describe("caseBlockReason", () => {
  it("blocks opening a case once a prompt was submitted", () => {
    expect(caseBlockReason(snapshot({ battles: [], entries: [], votes: [] }))).toMatch(/\S/);
  });

  it("blocks opening a case once battles started", () => {
    expect(caseBlockReason(snapshot({ submissions: [], finals: [] }))).toMatch(/\S/);
  });

  it("allows opening a case with no submissions and no battles", () => {
    expect(caseBlockReason(snapshot({ submissions: [], finals: [], battles: [], entries: [], votes: [] }))).toBeNull();
  });
});
