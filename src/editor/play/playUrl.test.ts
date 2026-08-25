import { describe, expect, it } from "vitest";
import { playSrc } from "./playUrl";

describe("playSrc", () => {
  it("editorPlay ve reload token ekler", () => {
    const href = playSrc("http://127.0.0.1:5180/", 3);
    const url = new URL(href);
    expect(url.searchParams.get("editorPlay")).toBe("1");
    expect(url.searchParams.get("t")).toBe("3");
  });
});
