import { describe, expect, it, vi } from "vitest";
import { ignoreOverlayMouseDown, isSceneCanvasEvent } from "./overlayInput";

describe("isSceneCanvasEvent", () => {
  it("yalniz canvas (veya icindeki) hedefi kabul eder", () => {
    const game = {} as EventTarget;
    const button = {} as EventTarget;
    expect(isSceneCanvasEvent({ target: game }, game)).toBe(true);
    expect(isSceneCanvasEvent({ target: button }, game)).toBe(false);
    expect(isSceneCanvasEvent({ target: game }, null)).toBe(false);
  });

  it("canvas child hedefi kabul eder", () => {
    const child = {} as EventTarget;
    const parent = { contains: (node: unknown) => node === child } as unknown as Node;
    expect(isSceneCanvasEvent({ target: child }, parent as unknown as EventTarget)).toBe(true);
  });
});

describe("ignoreOverlayMouseDown", () => {
  it("dock/button mousedown'ini Phaser'a iletmez", () => {
    const game = {} as EventTarget;
    const onMouseDown = vi.fn();
    const manager = { canvas: game, onMouseDown };
    const restore = ignoreOverlayMouseDown(manager);

    const overlay = { target: {} } as unknown as MouseEvent;
    const canvasEvent = { target: game } as unknown as MouseEvent;
    manager.onMouseDown(overlay);
    expect(onMouseDown).not.toHaveBeenCalled();

    manager.onMouseDown(canvasEvent);
    expect(onMouseDown).toHaveBeenCalledTimes(1);

    restore();
    manager.onMouseDown(overlay);
    expect(onMouseDown).toHaveBeenCalledTimes(2);
  });
});
