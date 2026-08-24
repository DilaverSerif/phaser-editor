export function keysNeedingHydration(
  assets: Array<{ key: string; base64?: string }>,
  exists: (key: string) => boolean
): string[] {
  const keys: string[] = [];
  for (const asset of assets) {
    if (!asset.base64 || exists(asset.key)) continue;
    keys.push(asset.key);
  }
  return keys;
}

/** Phaser TextureSource, game/renderer yokken texture yaratirsa patlar. */
export function canAcceptTexture(ctx: {
  destroyed: boolean;
  game?: { renderer?: unknown } | null;
}): boolean {
  return !ctx.destroyed && !!ctx.game && !!ctx.game.renderer;
}
