import { describe, expect, it } from "vitest";
import {
  applyAxisDelta,
  angleFromPoints,
  RING_HIT_INNER,
  RING_HIT_OUTER,
  ringContains,
  rotateByDelta,
  scaleFromDrag,
} from "./transformGizmo";

describe("applyAxisDelta", () => {
  it("yalniz X uygular", () => {
    expect(applyAxisDelta(10, 20, 5, 9, "x")).toEqual({ x: 15, y: 20 });
  });

  it("yalniz Y uygular", () => {
    expect(applyAxisDelta(10, 20, 5, 9, "y")).toEqual({ x: 10, y: 29 });
  });

  it("xy her iki ekseni uygular", () => {
    expect(applyAxisDelta(10, 20, 5, 9, "xy")).toEqual({ x: 15, y: 29 });
  });
});

describe("angleFromPoints / rotateByDelta", () => {
  it("saga 0, asagi 90 (Phaser Y)", () => {
    expect(angleFromPoints(0, 0, 10, 0)).toBeCloseTo(0, 5);
    expect(angleFromPoints(0, 0, 0, 10)).toBeCloseTo(90, 5);
  });

  it("halka 90 derece donunce aciyi kaydirir", () => {
    expect(rotateByDelta(15, 0, 90)).toBeCloseTo(105, 5);
  });

  it("halka hit merkezi ve ince kemeri yakalar", () => {
    expect(ringContains(0, 0)).toBe(false);
    expect(ringContains(RING_HIT_INNER + 4, 0)).toBe(true);
    expect(ringContains(RING_HIT_OUTER + 4, 0)).toBe(false);
    expect(ringContains(0, 64)).toBe(true);
  });
});

describe("scaleFromDrag", () => {
  it("X tutamaci yalniz scaleX", () => {
    expect(
      scaleFromDrag({ x: 1, y: 2 }, { x: 40, y: 0 }, { x: 80, y: 3 }, "x")
    ).toEqual({ scaleX: 2, scaleY: 2 });
  });

  it("uniform her iki ekseni ayni oranda", () => {
    const next = scaleFromDrag(
      { x: 2, y: 3 },
      { x: 30, y: 40 },
      { x: 60, y: 80 },
      "xy"
    );
    expect(next.scaleX).toBeCloseTo(4, 5);
    expect(next.scaleY).toBeCloseTo(6, 5);
  });

  it("sifir ofsette patlamaz", () => {
    expect(
      scaleFromDrag({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 10, y: 10 }, "xy")
    ).toEqual({ scaleX: 1, scaleY: 1 });
  });
});
