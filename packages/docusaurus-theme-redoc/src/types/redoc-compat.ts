/**
 * Redoc 3 no longer exports the Redoc 2 option/spec types
 * (`RedocRawOptions`, `OpenAPISpec`, ...), so keep loose local equivalents.
 */
export type RedocRawOptions = Record<string, any>;
export type OpenAPISpec = Record<string, any>;
