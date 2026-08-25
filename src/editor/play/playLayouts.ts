export type PlayOrientation = "portrait" | "landscape";

export interface PlayDevice {
  id: string;
  label: string;
  width: number;
  height: number;
}

/** CSS logical viewport (portrait). */
export const PLAY_DEVICES: PlayDevice[] = [
  { id: "iphone-se", label: "iPhone SE", width: 375, height: 667 },
  { id: "iphone-16", label: "iPhone 16", width: 393, height: 852 },
  { id: "iphone-16-pro", label: "iPhone 16 Pro", width: 402, height: 874 },
  { id: "iphone-16-promax", label: "iPhone 16 Pro Max", width: 440, height: 956 },
  { id: "pixel-9", label: "Pixel 9", width: 412, height: 923 },
  { id: "pixel-9-pro-xl", label: "Pixel 9 Pro XL", width: 448, height: 998 },
  { id: "galaxy-s25", label: "Galaxy S25", width: 360, height: 780 },
  { id: "galaxy-s25-ultra", label: "Galaxy S25 Ultra", width: 412, height: 891 },
];

export const DEFAULT_PLAY_DEVICE = "iphone-16";

export function playDeviceById(id: string): PlayDevice {
  return PLAY_DEVICES.find((item) => item.id === id) ?? PLAY_DEVICES[1];
}

export function playViewport(device: PlayDevice, orientation: PlayOrientation) {
  return orientation === "portrait"
    ? { width: device.width, height: device.height }
    : { width: device.height, height: device.width };
}

export function containViewport(
  viewW: number,
  viewH: number,
  boxW: number,
  boxH: number
) {
  if (boxW < 8 || boxH < 8) return { width: 0, height: 0, scale: 0 };
  const scale = Math.min(boxW / viewW, boxH / viewH);
  return {
    width: Math.max(1, Math.floor(viewW * scale)),
    height: Math.max(1, Math.floor(viewH * scale)),
    scale,
  };
}
