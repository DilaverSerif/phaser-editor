export type PlayWebviewEl = HTMLElement & {
  setAudioMuted?: (muted: boolean) => void;
  isAudioMuted?: () => boolean;
  executeJavaScript?: (code: string, userGesture?: boolean) => Promise<unknown>;
  getWebContentsId?: () => number;
  send?: (channel: string, ...args: unknown[]) => void;
};

export type PlayWebviewIpcEvent = Event & {
  channel: string;
  args: unknown[];
};

export function isPlayWebviewReady(webview: PlayWebviewEl) {
  try {
    return typeof webview.getWebContentsId?.() === "number";
  } catch {
    return false;
  }
}
