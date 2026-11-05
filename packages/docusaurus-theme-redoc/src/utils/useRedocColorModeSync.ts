import { useEffect, useMemo } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import {
  REDOC_MODE_CLASSES,
  reconcileColorMode,
  storeRedocColorMode,
  type RedocColorMode,
} from './redocColorMode';

/**
 * Keep Redoc 3's color mode in step with Docusaurus's, in both directions. See
 * `redocColorMode.ts` for what this relies on.
 *
 * Returns a key that changes with the mode, to remount Redoc with: it only reads
 * its mode when it mounts. Returns `undefined`, and does nothing, when `enabled`
 * is false (`syncColorMode: false`): Redoc then follows its own mode.
 */
export function useRedocColorModeSync(
  enabled: boolean,
): RedocColorMode | undefined {
  const { colorMode, setColorMode } = useColorMode();

  // Docusaurus -> Redoc: store the current mode before Redoc renders.
  useMemo(() => {
    if (enabled) {
      storeRedocColorMode(colorMode);
    }
  }, [enabled, colorMode]);

  // Redoc -> Docusaurus: Redoc's own switcher changes the class on <html>. Also
  // repairs the class if something else overwrites it.
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      const action = reconcileColorMode(html, colorMode);
      if (action?.type === 'restore') {
        html.classList.add(action.mode);
      } else if (action?.type === 'follow') {
        setColorMode(action.mode);
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, [enabled, colorMode, setColorMode]);

  // Redoc leaves its class on <html> for the whole page; drop it on the way out.
  useEffect(
    () => () => {
      if (enabled) {
        document.documentElement.classList.remove(...REDOC_MODE_CLASSES);
      }
    },
    [enabled],
  );

  return enabled ? colorMode : undefined;
}

export default useRedocColorModeSync;
