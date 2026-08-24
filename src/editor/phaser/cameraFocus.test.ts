import { describe, it, expect } from "vitest";
import {
  FOCUS_MAX_ZOOM,
  FOCUS_MIN_ZOOM,
  focusCenter,
  focusZoomForBounds,
} from "./cameraFocus";

describe("focusZoomForBounds", () => {
  it("kucuk nesneyi belirli bir yakinliga getirir (tavan)", () => {
    expect(focusZoomForBounds(48, 48, 1280, 720)).toBe(FOCUS_MAX_ZOOM);
  });

  it("StreetBg gibi tam ekran katmani yari olcekte gosterir", () => {
    expect(focusZoomForBounds(1280, 720, 1280, 720)).toBeCloseTo(0.5, 5);
  });

  it("daha buyuk bounds icin zoom tabanina iner", () => {
    expect(focusZoomForBounds(4000, 4000, 1280, 720)).toBe(FOCUS_MIN_ZOOM);
  });

  it("orta boy nesneyi gorununun yarisina yaklastirir", () => {
    const zoom = focusZoomForBounds(320, 180, 1280, 720);
    expect(zoom).toBeCloseTo(2, 5);
  });

  it("sifir boyutta patlamaz", () => {
    expect(focusZoomForBounds(0, 0, 1280, 720)).toBe(FOCUS_MAX_ZOOM);
  });
});

describe("focusCenter", () => {
  it("bounds merkezini doner", () => {
    expect(focusCenter({ x: 100, y: 50, width: 40, height: 20 })).toEqual({
      x: 120,
      y: 60,
    });
  });
});
