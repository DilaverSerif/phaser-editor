export function playSrc(url: string, reloadToken: number) {
  const parsed = new URL(url);
  parsed.searchParams.set("editorPlay", "1");
  parsed.searchParams.set("t", String(reloadToken));
  return parsed.href;
}
