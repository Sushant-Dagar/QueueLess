import { describe, expect, it } from "vitest";
import {
  averageServiceMinutes,
  canTransition,
  estimateWaitMinutes,
  formatToken,
  normalizeIndianPhone,
  positionOf,
  serviceDateIST,
  slugify,
} from "@/lib/queue";

const MIN = 60_000;

describe("canTransition", () => {
  it("allows the normal flow", () => {
    expect(canTransition("WAITING", "CALLED")).toBe(true);
    expect(canTransition("CALLED", "SERVED")).toBe(true);
    expect(canTransition("SKIPPED", "WAITING")).toBe(true);
  });
  it("treats SERVED and CANCELLED as final", () => {
    for (const to of ["WAITING", "CALLED", "SERVED", "SKIPPED", "CANCELLED"] as const) {
      expect(canTransition("SERVED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
    }
  });
  it("does not let a waiting ticket jump straight to served", () => {
    expect(canTransition("WAITING", "SERVED")).toBe(false);
  });
});

describe("formatToken", () => {
  it("pads to three digits", () => {
    expect(formatToken(7)).toBe("A-007");
    expect(formatToken(120)).toBe("A-120");
    expect(formatToken(1234)).toBe("A-1234");
  });
});

describe("averageServiceMinutes", () => {
  it("uses the fallback until there are 3 samples", () => {
    expect(averageServiceMinutes([], 10)).toBe(10);
    expect(averageServiceMinutes([5 * MIN, 5 * MIN], 10)).toBe(10);
  });
  it("averages recent service times", () => {
    expect(averageServiceMinutes([4 * MIN, 5 * MIN, 6 * MIN], 10)).toBe(5);
  });
  it("trims outliers so one long appointment doesn't skew the estimate", () => {
    const normal = Array.from({ length: 9 }, () => 5 * MIN);
    expect(averageServiceMinutes([...normal, 90 * MIN], 10)).toBe(5);
  });
  it("only looks at the 20 most recent samples", () => {
    const recent = Array.from({ length: 20 }, () => 3 * MIN);
    const old = Array.from({ length: 50 }, () => 30 * MIN);
    expect(averageServiceMinutes([...recent, ...old], 10)).toBe(3);
  });
  it("ignores invalid durations and clamps to 1–120 minutes", () => {
    expect(averageServiceMinutes([NaN, -5, 0, 5 * MIN, 5 * MIN], 10)).toBe(10); // only 2 valid samples
    expect(averageServiceMinutes([10, 20, 30], 10)).toBe(1);
    expect(averageServiceMinutes([500 * MIN, 500 * MIN, 500 * MIN], 10)).toBe(120);
  });
});

describe("estimateWaitMinutes", () => {
  it("is zero for the next person when the counter is free", () => {
    expect(estimateWaitMinutes(1, 6, false)).toBe(0);
  });
  it("adds half a service for the person at the counter", () => {
    expect(estimateWaitMinutes(1, 6, true)).toBe(3);
  });
  it("scales with people ahead", () => {
    expect(estimateWaitMinutes(5, 6, true)).toBe(27);
  });
  it("is zero when not in line", () => {
    expect(estimateWaitMinutes(0, 6, true)).toBe(0);
  });
});

describe("positionOf", () => {
  it("is 1-based and 0 when absent", () => {
    expect(positionOf("b", ["a", "b", "c"])).toBe(2);
    expect(positionOf("z", ["a", "b"])).toBe(0);
  });
});

describe("serviceDateIST", () => {
  it("rolls over at midnight India time, not UTC", () => {
    // 19:00 UTC on 14 Oct is 00:30 IST on 15 Oct.
    expect(serviceDateIST(new Date("2026-10-14T19:00:00Z"))).toBe("2026-10-15");
    // 18:00 UTC is 23:30 IST, still the 14th.
    expect(serviceDateIST(new Date("2026-10-14T18:00:00Z"))).toBe("2026-10-14");
  });
});

describe("slugify", () => {
  it("makes clean URL slugs", () => {
    expect(slugify("Dr. Mehta's Clinic, Sec 15")).toBe("dr-mehtas-clinic-sec-15");
    expect(slugify("  Café  Délhi  ")).toBe("cafe-delhi");
    expect(slugify("!!!")).toBe("");
  });
});

describe("normalizeIndianPhone", () => {
  it("accepts common Indian formats", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("+91-98765-43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
  });
  it("rejects numbers that aren't Indian mobiles", () => {
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("5876543210")).toBeNull();
    expect(normalizeIndianPhone("abc")).toBeNull();
  });
});
