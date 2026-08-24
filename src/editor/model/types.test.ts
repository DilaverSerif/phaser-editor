import { describe, it, expect } from "vitest";
import { textureKeyOf, withTextureKey } from "../model/types";
import type { GameObjectNode } from "../model/types";

describe("textureKeyOf", () => {
  it("string texture doner", () => {
    const n = { id: "1", type: "Image", label: "a", texture: "foo" } as GameObjectNode;
    expect(textureKeyOf(n)).toBe("foo");
  });

  it("{key} nesnesinden anahtari cikarir", () => {
    const n = { id: "1", type: "Image", label: "a", texture: { key: "bar" } } as GameObjectNode;
    expect(textureKeyOf(n)).toBe("bar");
  });

  it("texture yoksa bos string", () => {
    const n = { id: "1", type: "Rectangle", label: "a" } as GameObjectNode;
    expect(textureKeyOf(n)).toBe("");
  });
});

describe("withTextureKey", () => {
  it("string formati korur", () => {
    const n = { id: "1", type: "Image", label: "a", texture: "foo" } as GameObjectNode;
    expect(withTextureKey(n, "baz")).toEqual({ texture: "baz" });
  });

  it("{key} formatini korur", () => {
    const n = {
      id: "1",
      type: "Image",
      label: "a",
      texture: { key: "foo", frame: "f1" },
    } as GameObjectNode;
    expect(withTextureKey(n, "baz")).toEqual({ texture: { key: "baz", frame: "f1" } });
  });
});
