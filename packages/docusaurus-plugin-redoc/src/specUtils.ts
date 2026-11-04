import { createHash } from 'crypto';
import type { OpenAPISpec } from './types/redoc-compat';

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

/** Short stable hash, for data file names. */
export function shortHash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 12);
}

type Operation = { operationId?: unknown } & Record<string, unknown>;
type PathItem = Record<string, Operation | undefined>;

/**
 * Redoc 3 builds each operation's URL from its operationId, so surrounding
 * whitespace in one (a typo, e.g. `"getFoo "`) ends up at the edge of a path
 * segment. Such a route can't be linked to or validated reliably, so use the
 * trimmed id, and say which operations were changed so the spec can be fixed.
 *
 * The spec that is passed in is not changed (it is also the copy offered for
 * download): the result shares everything with it except the paths that were
 * trimmed, and is the same object if nothing needed trimming.
 */
export function trimOperationIds(
  parsed: OpenAPISpec,
  specName: string,
): OpenAPISpec {
  const paths = (parsed?.paths ?? {}) as Record<string, PathItem | undefined>;
  let trimmedPaths: Record<string, PathItem | undefined> | undefined;

  Object.entries(paths).forEach(([apiPath, pathItem]) => {
    HTTP_METHODS.forEach((method) => {
      const operation = pathItem?.[method];
      const id = operation?.operationId;
      if (operation && typeof id === 'string' && id !== id.trim()) {
        console.warn(
          `[REDOCUSAURUS_PLUGIN] ${specName}: operationId ${JSON.stringify(
            id,
          )} (${method.toUpperCase()} ${apiPath}) has surrounding whitespace; using ${JSON.stringify(
            id.trim(),
          )}. Fix it in the spec.`,
        );
        trimmedPaths = trimmedPaths ?? { ...paths };
        trimmedPaths[apiPath] = {
          ...(trimmedPaths[apiPath] ?? pathItem),
          [method]: { ...operation, operationId: id.trim() },
        };
      }
    });
  });

  return trimmedPaths ? { ...parsed, paths: trimmedPaths } : parsed;
}
