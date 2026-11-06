import { parentPort, workerData } from 'worker_threads';
import { renderSpecRoutes } from './ssr';

/**
 * Entry point of the SSR worker thread, started by `prerenderSpec` in ssr.ts.
 */
renderSpecRoutes(workerData).then(
  (pages) => parentPort?.postMessage({ pages }),
  (error) =>
    parentPort?.postMessage({
      error: error instanceof Error ? error.message : String(error),
    }),
);
