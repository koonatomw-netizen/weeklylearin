import { afterEach, describe, expect, it, vi } from "vitest";
import { AiBusyError, AiUnavailableError, aiFeedback, parseFeedback } from "../src/worker/ai";
import { WEEK01_CHALLENGE } from "../src/shared/challenge";

const good = {
  rubric: { context: 10, goal: 20, audience: 5, constraints: 8, format: 12 },
  feedbackEn: "Clear goal.", feedbackTh: "เป้าหมายชัดเจน",
  strengths: ["a", "b", "c", "d"], nextSteps: ["x"],
};
const reply = (content: string) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }));

afterEach(() => vi.unstubAllGlobals());

describe("parseFeedback", () => {
  it("sums the rubric and keeps at most three strengths", () => {
    const result = parseFeedback("```json\n" + JSON.stringify(good) + "\n```");
    expect(result.total).toBe(55);
    expect(result.strengths).toHaveLength(3);
  });

  it("rejects scores outside the rubric limits", () => {
    const bad = { ...good, rubric: { ...good.rubric, goal: 99 } };
    expect(() => parseFeedback(JSON.stringify(bad))).toThrow(AiUnavailableError);
  });

  it("rejects missing Thai feedback and non-JSON text", () => {
    expect(() => parseFeedback(JSON.stringify({ ...good, feedbackTh: " " }))).toThrow(AiUnavailableError);
    expect(() => parseFeedback("no json here")).toThrow(AiUnavailableError);
  });
});

describe("aiFeedback", () => {
  it("refuses to run without a key and never calls the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(aiFeedback("a prompt", WEEK01_CHALLENGE, {})).rejects.toThrow(AiUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never runs more than four requests at once", async () => {
    let active = 0;
    let peak = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      active += 1; peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return reply(JSON.stringify(good));
    }));
    const results = await Promise.all(Array.from({ length: 12 }, () => aiFeedback("a prompt", WEEK01_CHALLENGE, { TOKENME_API_KEY: "test" })));
    expect(results).toHaveLength(12);
    expect(peak).toBe(4);
  });

  it("reports a rate limit as busy and frees the slot", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    await expect(aiFeedback("a prompt", WEEK01_CHALLENGE, { TOKENME_API_KEY: "test" })).rejects.toThrow(AiBusyError);
    vi.stubGlobal("fetch", vi.fn(async () => reply(JSON.stringify(good))));
    await expect(aiFeedback("a prompt", WEEK01_CHALLENGE, { TOKENME_API_KEY: "test" })).resolves.toMatchObject({ total: 55 });
  });
});
