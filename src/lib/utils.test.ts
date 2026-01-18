import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className utility)", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should handle Tailwind conflict resolution", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle objects with boolean values", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });

  it("should handle null and undefined values", () => {
    expect(cn(null, undefined, "foo")).toBe("foo");
  });

  it("should handle complex combinations", () => {
    expect(
      cn(
        "base-class",
        ["array-class", true && "conditional-array"],
        { "object-class": true, "falsy-object": false },
        false && "falsy-class"
      )
    ).toBe("base-class array-class conditional-array object-class");
  });
});
