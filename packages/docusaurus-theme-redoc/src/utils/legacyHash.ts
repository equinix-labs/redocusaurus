/**
 * Redoc 2 linked to sections with hash anchors such as
 * `#tag/Accounts/operation/getBillingAccounts`. Redoc 3 routes by path instead
 * (`<basePath>/accounts/getbillingaccounts`): the tag and operation id,
 * lowercased, with the `tag/` and `operation/` markers dropped.
 *
 * Returns the Redoc 3 sub-path for a legacy hash, or `undefined` if the hash
 * isn't one that can be mapped (`#operation/<id>` has no tag to build a path
 * from; `#section/...` and `#schema/...` have no route).
 */
export function legacyHashToPath(hash: string): string | undefined {
  const match = /^#\/?tag\/([^/]+)(?:\/operation\/([^/]+))?\/?$/.exec(hash);
  if (!match) {
    return undefined;
  }
  const [, tag, operation] = match;
  return `/${[tag, operation].filter(Boolean).join('/')}`.toLowerCase();
}

/**
 * Rewrite a legacy hash URL to its Redoc 3 path. Must run before Redoc mounts,
 * since Redoc reads the location once when its router is created.
 * @returns true if the URL was rewritten
 */
export function redirectLegacyHash(basePath: string): boolean {
  const subPath = legacyHashToPath(window.location.hash);
  if (subPath === undefined) {
    return false;
  }
  const base = basePath === '/' ? '' : basePath;
  window.history.replaceState(
    window.history.state,
    '',
    `${base}${subPath}${window.location.search}`,
  );
  return true;
}
