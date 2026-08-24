import { describe, expect, it } from "vitest";
import {
  defaultFrames,
  detachTab,
  insertIndexFromX,
  moveTab,
  normalizeFrames,
  reorderItems,
  type DockFrame,
} from "./dockLayout";

describe("reorderItems", () => {
  it("oge tasir", () => {
    expect(reorderItems(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorderItems(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});

describe("insertIndexFromX", () => {
  it("orta noktalara gore indeks doner", () => {
    expect(insertIndexFromX([10, 30, 50], 5)).toBe(0);
    expect(insertIndexFromX([10, 30, 50], 35)).toBe(2);
    expect(insertIndexFromX([10, 30, 50], 80)).toBe(3);
  });
});

describe("normalizeFrames / moveTab / detachTab", () => {
  it("eksik panelleri geri ekler ve tekrarlilari atar", () => {
    const frames = normalizeFrames([
      {
        id: "a",
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        tabs: ["hierarchy", "hierarchy", "missing" as never],
        active: "assets",
        minimized: false,
      },
    ]);
    expect(frames[0].tabs).toEqual(["hierarchy"]);
    expect(frames[0].active).toBe("hierarchy");
    expect(frames.map((f) => f.tabs[0]).sort()).toEqual(
      ["animation", "assets", "hierarchy", "inspector", "prefab", "project"].sort()
    );
  });

  it("ayni pencerede tab sirasini degistirir", () => {
    const start: DockFrame[] = [
      {
        id: "a",
        x: 0,
        y: 0,
        width: 280,
        height: 200,
        tabs: ["hierarchy", "project"],
        active: "project",
        minimized: false,
      },
    ];
    const next = moveTab(start, "hierarchy", "a", 2);
    expect(next[0].tabs).toEqual(["project", "hierarchy"]);
    expect(next[0].active).toBe("hierarchy");
  });

  it("tabi baska pencereye tasiyip bos frame'i siler", () => {
    const start = defaultFrames().slice(0, 2);
    const next = moveTab(start, "hierarchy", start[1].id, 0);
    expect(next).toHaveLength(1);
    expect(next[0].tabs).toEqual(["hierarchy", "project"]);
    expect(next[0].active).toBe("hierarchy");
  });

  it("tabi ayirip yeni pencere acar", () => {
    const grouped: DockFrame[] = [
      {
        id: "a",
        x: 10,
        y: 10,
        width: 300,
        height: 200,
        tabs: ["hierarchy", "project"],
        active: "hierarchy",
        minimized: false,
      },
    ];
    const next = detachTab(grouped, "project", { x: 80, y: 40 });
    expect(next).toHaveLength(2);
    expect(next[0].tabs).toEqual(["hierarchy"]);
    expect(next[1].tabs).toEqual(["project"]);
    expect(next[1].x).toBe(80);
    expect(next[1].y).toBe(40);
  });
});
