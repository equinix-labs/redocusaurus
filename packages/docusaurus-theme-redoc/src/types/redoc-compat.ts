/**
 * Redoc 3 no longer exports the Redoc 2 option/spec types
 * (`RedocRawOptions`, `OpenAPISpec`, ...), so keep small local equivalents that
 * only describe what this package reads.
 */
export type RedocRawOptions = Record<string, unknown>;

export interface OpenAPISpec {
  info?: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
  paths?: Record<string, unknown>;
  [key: string]: unknown;
}
