import { describe, expect, it } from "vitest";
import { scorePromptDemo } from "../src/worker/scoring-demo";

describe("scorePromptDemo", () => {
  it("returns a bounded score with all five rubric dimensions", () => {
    const result = scorePromptDemo("Write a short LINE message to invite 4Seas Nimman guests to our appreciation event. Do not invent the date, price, or offer. Use warm Thai and English in two sentences.");
    expect(result.mode).toBe("demo");
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(Object.keys(result.rubric)).toEqual(["context", "goal", "audience", "constraints", "format"]);
  });

  it("does not give an empty submission the same score as a complete brief", () => {
    expect(scorePromptDemo("hi").total).toBeLessThan(scorePromptDemo("Write a warm bilingual LINE invitation to 4Seas Nimman guests for a fictional appreciation evening. Keep it under 90 Thai words, do not invent a date, price, location detail, or offer, and include an RSVP placeholder.").total);
  });
});
