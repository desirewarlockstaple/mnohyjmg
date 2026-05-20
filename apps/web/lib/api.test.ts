import { describe, it, expect } from "vitest";
import { bboxToString, clampHorizon } from "./api";

describe("api helpers", () => {
  it("converts bbox to comma-separated string", () => {
    expect(bboxToString([119, 23, 123, 26])).toBe("119,23,123,26");
  });
  it("clamps horizon between 1 and 14", () => {
    expect(clampHorizon(0)).toBe(1);
    expect(clampHorizon(7)).toBe(7);
    expect(clampHorizon(99)).toBe(14);
    expect(clampHorizon(3.7)).toBe(4);
  });
});
