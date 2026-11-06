import { useEffect, useMemo, useState } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import {
  REDOC_MODE_CLASSES,
  REDOC_SWITCHER_SELECTOR,
  reconcileColorMode,
  redocModeOf,
  storeRedocColorMode,
} from './redocColorMode';

/**
 * Keep Redoc 3's color mode in step with Docusaurus's, in both directions. See
 * `redocColorMode.ts` for what this relies on.
 *
 * Docusaurus -> Redoc: the mode is stored before Redoc mounts, so it starts in
 * the right mode. When it changes afterwards, Redoc's own switcher is clicked,
 * which changes the mode in place. Remounting Redoc instead (a changed `key`)
 * rebuilds the whole page: it scrolls back to the top and its height changes,
 * which makes the switch jump. A remount is only the fallback, for when the
 * switcher is not on the page (for example a Redoc update renamed it).
 *
 * Returns the key to remount Redoc with, which changes only for that fallback.
 * Returns `undefined`, and does nothing, when `enabled` is false
 * (`syncColorMode: false`): Redoc then follows its own mode.
 */
export function useRedocColorModeSync(enabled: boolean): number | undefined {
  const { colorMode, setColorMode } = useColorMode();
  const [remountKey, setRemountKey] = useState(0);

  // Docusaurus -> Redoc: store the current mode before Redoc mounts.
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

    // The mode changed after Redoc mounted: ask Redoc to switch, in place.
    const redocMode = redocModeOf(html);
    if (redocMode && redocMode !== colorMode) {
      const switcher = document.querySelector<HTMLElement>(
        REDOC_SWITCHER_SELECTOR,
      );
      if (switcher) {
        switcher.click();
      } else {
        setRemountKey((key) => key + 1);
      }
    }
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

  return enabled ? remountKey : undefined;
}

export default useRedocColorModeSync;
