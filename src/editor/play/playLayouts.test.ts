import { describe, expect, it } from "vitest";
import {
  containViewport,
  playDeviceById,
  playViewport,
} from "./playLayouts";

describe("playViewport", () => {
  it("portrait cihaz boyutunu korur", () => {
    expect(playViewport(playDeviceById("iphone-16"), "portrait")).toEqual({
      width: 393,
      height: 852,
    });
  });

  it("landscape eksenleri takas eder", () => {
    expect(playViewport(playDeviceById("iphone-16"), "landscape")).toEqual({
      width: 852,
      height: 393,
    });
  });
});

describe("containViewport", () => {
  it("paneli tasmadan orani korur", () => {
    expect(containViewport(393, 852, 400, 400)).toEqual({
      width: 184,
      height: 400,
      scale: 400 / 852,
    });
  });
});
