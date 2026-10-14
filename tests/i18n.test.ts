import { describe, expect, it } from "vitest";
import { en, hi, pickLang, t } from "@/lib/i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("translations", () => {
  it("Hindi has exactly the same keys as English", () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });
  it("Hindi strings keep the same {placeholders}", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(placeholders(hi[key]), key).toEqual(placeholders(en[key]));
    }
  });
  it("fills in variables", () => {
    expect(t("en", "ticket.ahead", { n: 4 })).toBe("4 people ahead of you");
    expect(t("hi", "join.eta", { m: 12 })).toContain("12");
  });
});

describe("pickLang", () => {
  it("prefers the saved cookie, then the browser language, then English", () => {
    expect(pickLang("hi", "en-US")).toBe("hi");
    expect(pickLang(undefined, "hi-IN,hi;q=0.9,en;q=0.8")).toBe("hi");
    expect(pickLang(undefined, "en-IN,en;q=0.9")).toBe("en");
    expect(pickLang("fr", null)).toBe("en");
  });
});
