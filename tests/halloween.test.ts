import { describe, expect, it } from "vitest";
import { HALLOWEEN_ICONS, ICON_PALETTE } from "../src/shared/pixelIcons";
import { THEMES, nextTheme, seasonalTheme } from "../src/theme";

describe("seasonalTheme", () => {
  it("turns Halloween on from 20 October to 2 November only", () => {
    expect(seasonalTheme(new Date(2026, 9, 19))).toBeNull();
    expect(seasonalTheme(new Date(2026, 9, 20))).toBe("halloween");
    expect(seasonalTheme(new Date(2026, 9, 31))).toBe("halloween");
    expect(seasonalTheme(new Date(2026, 10, 2))).toBe("halloween");
    expect(seasonalTheme(new Date(2026, 10, 3))).toBeNull();
    expect(seasonalTheme(new Date(2026, 5, 15))).toBeNull();
  });
});

describe("nextTheme", () => {
  it("cycles dark, light, Halloween and back", () => {
    expect(THEMES).toEqual(["dark", "light", "halloween"]);
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("halloween");
    expect(nextTheme("halloween")).toBe("dark");
  });
});

describe("Halloween sprites", () => {
  it("are 12x12 grids that only use palette colours", () => {
    expect(Object.keys(HALLOWEEN_ICONS).sort()).toEqual(["bat", "candy", "ghost", "pumpkin", "skull"]);
    for (const [name, rows] of Object.entries(HALLOWEEN_ICONS)) {
      expect(rows, name).toHaveLength(12);
      for (const row of rows) {
        expect(row.length, `${name} row width`).toBe(12);
        for (const ch of row) expect(ch === "." || ch in ICON_PALETTE, `${name}: ${ch}`).toBe(true);
      }
    }
  });
});
