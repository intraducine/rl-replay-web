export function publicAsset(path: string) {
  return publicAssetWithBase(path, import.meta.env.BASE_URL || "/");
}

export function publicAssetWithBase(path: string, base: string) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizedBase}${normalizedPath}`;
}
