import { describe, expect, it } from "vitest";
import {
  defaultFrames,
  detachTab,
  hitTabStrip,
  tabBoxHitsStrip,
  insertIndexFromX,
  mergeFrame,
  moveTab,
  normalizeFrames,
  reorderItems,
  type DockFrame,
  type StripRect,
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
      ["animation", "assets", "hierarchy", "inspector", "play", "prefab", "project"].sort()
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

  it("pencereyi baska serideki tablarin yanina birlestirir", () => {
    const start = defaultFrames().slice(0, 2);
    const next = mergeFrame(start, start[0].id, start[1].id, 1);
    expect(next).toHaveLength(1);
    expect(next[0].tabs).toEqual(["project", "hierarchy"]);
    expect(next[0].active).toBe("hierarchy");
  });

  it("ayni pencereye merge no-op", () => {
    const start = defaultFrames().slice(0, 1);
    expect(mergeFrame(start, start[0].id, start[0].id, 0)).toEqual(start);
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

function strip(
  id: string,
  left: number,
  top: number,
  right: number,
  bottom: number,
  tabMids: number[],
  tabBoxes: StripRect["tabBoxes"] = []
): StripRect {
  return { frameId: id, left, top, right, bottom, tabMids, tabBoxes };
}

describe("hitTabStrip / tabBoxHitsStrip", () => {
  const a = strip("a", 0, 0, 200, 30, [40, 120]);
  const b = strip("b", 220, 0, 420, 30, [260, 340]);

  it("baska seridi once secer", () => {
    expect(hitTabStrip([a, b], 230, 10, "a")).toEqual({ frameId: "b", index: 0 });
    expect(hitTabStrip([a, b], 10, 10, "a")).toEqual({ frameId: "a", index: 0 });
  });

  it("serit disindaki temas birlestirmez", () => {
    expect(hitTabStrip([a, b], 210, 10, "a")).toBeNull();
  });

  it("isim kutusu hedef seridin uzerindeyse birlestirir", () => {
    const name = { left: 230, top: 4, right: 300, bottom: 28 };
    expect(tabBoxHitsStrip([name], [b])).toEqual({ frameId: "b", index: 1 });
  });

  it("seritler degse bile isim kutusu binmiyorsa birlestirmez", () => {
    const name = { left: 10, top: 4, right: 80, bottom: 28 };
    const near = strip("b", 190, 0, 390, 30, [230]);
    expect(tabBoxHitsStrip([name], [near])).toBeNull();
  });
});
