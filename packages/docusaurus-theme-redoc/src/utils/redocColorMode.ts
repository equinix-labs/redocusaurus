/**
 * Everything Redocusaurus knows about Redoc 3's color mode that Redoc does not
 * document. Redoc 3 has no option for it, so this is the one place that touches
 * its internals, and `syncColorMode: false` (a theme option) turns all of it off.
 *
 * What it relies on, found in the Redoc 3.0.1 bundle:
 * - Redoc keeps its mode in `localStorage['redoc.colorMode']`, and reads it when
 *   it mounts (it does not watch the key afterwards).
 * - It applies the mode as a `light` or `dark` class on `<html>`. Its own
 *   switcher changes that class. Its inline no-flash script (rendered into the
 *   static HTML) reads the same key and sets the same class.
 * - Its own switcher, `[data-testid="color-mode-switcher"]`, changes the mode in
 *   place (a two-state toggle). Clicking it is how a mode change that comes from
 *   Docusaurus reaches Redoc without remounting it.
 *
 * `test/redocColorMode.test.js` checks the installed Redoc still has these, so
 * a Redoc upgrade that changes them fails a test instead of silently leaving
 * the API pages in the wrong mode.
 */

/** The `localStorage` key Redoc reads its color mode from. */
export const REDOC_COLOR_MODE_KEY = 'redoc.colorMode';

/** Selects Redoc's own color mode switcher (the button in its sidebar). */
export const REDOC_SWITCHER_SELECTOR = '[data-testid="color-mode-switcher"]';

/** The classes Redoc puts on `<html>`, one per mode. */
export const REDOC_MODE_CLASSES = ['light', 'dark'] as const;

export type RedocColorMode = (typeof REDOC_MODE_CLASSES)[number];

/** Tell Redoc which mode to start in. It reads this when it mounts. */
export function storeRedocColorMode(mode: RedocColorMode): void {
  try {
    window.localStorage.setItem(REDOC_COLOR_MODE_KEY, mode);
  } catch {
    // storage unavailable: Redoc falls back to the OS preference
  }
}

/** The mode Redoc has applied to `<html>`, if it has applied one. */
export function redocModeOf(html: {
  classList: { contains(name: string): boolean };
}): RedocColorMode | undefined {
  return REDOC_MODE_CLASSES.find((c) => html.classList.contains(c));
}

/** What to do about the class on `<html>`, given the mode Docusaurus is in. */
export type ColorModeAction =
  /** Redoc's class is gone: put the current mode's class back */
  | { type: 'restore'; mode: RedocColorMode }
  /** Redoc's switcher changed the mode: make Docusaurus follow it */
  | { type: 'follow'; mode: RedocColorMode };

/**
 * Compare the class Redoc left on `<html>` with the current Docusaurus mode.
 * Nothing to do (undefined) when they agree.
 */
export function reconcileColorMode(
  html: { classList: { contains(name: string): boolean } },
  colorMode: RedocColorMode,
): ColorModeAction | undefined {
  const mode = redocModeOf(html);
  if (!mode) {
    // Docusaurus re-applies its own `<html>` class on navigation (back and
    // forward included), which wipes Redoc's class and leaves its styles
    // unmatched.
    return { type: 'restore', mode: colorMode };
  }
  return mode !== colorMode ? { type: 'follow', mode } : undefined;
}
