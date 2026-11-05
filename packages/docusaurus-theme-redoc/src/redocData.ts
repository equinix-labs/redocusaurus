import merge from 'lodash/merge';
import omit from 'lodash/omit';
import { loadConfig } from '@redocly/openapi-core';
import type { RedocRawOptions } from './types/redoc-compat';
import type { CssVariables, GlobalData, ThemeOptions } from './types/options';

const defaultOptions: Partial<RedocRawOptions> = {
  scrollYOffset: 'nav.navbar',
  expandSingleSchemaField: true,
  menuToggle: true,
  suppressWarnings: true,
  // Redoc 3 reports usage events (page views, interactions, errors) to Redocly's
  // servers unless this is set. Keep it off by default, so a site does not send its
  // visitors' activity to a third party unless its owner chooses to. Turn it back on
  // with `options: { disableTelemetry: false }` or in `redocly.yaml`.
  disableTelemetry: true,
};

/**
 * Redoc 3 is themed with CSS custom properties (a design token system: light on
 * `:root`, dark on `:root.dark`), and has no `theme` option.
 *
 * By default Redoc's tokens are set from Docusaurus's own (Infima) variables, so
 * the API pages follow the site's fonts, colors and light/dark mode. The Infima
 * variables change with `data-theme`, so one rule serves both modes.
 */
const INFIMA_TOKENS: Record<string, string> = {
  '--font-family-base': 'var(--ifm-font-family-base)',
  '--font-family-monospaced': 'var(--ifm-font-family-monospace)',
  '--font-weight-regular': 'var(--ifm-font-weight-normal)',
  '--font-weight-semibold': 'var(--ifm-font-weight-semibold)',
  '--font-weight-bold': 'var(--ifm-font-weight-bold)',
  '--heading-font-family': 'var(--ifm-heading-font-family)',
  '--heading-font-weight': 'var(--ifm-heading-font-weight)',
  '--bg-color': 'var(--ifm-background-surface-color)',
  '--text-color': 'var(--ifm-font-color-base)',
  '--text-color-secondary': 'var(--ifm-font-color-secondary)',
  '--link-color-primary': 'var(--ifm-link-color)',
  '--color-primary-base': 'var(--ifm-color-primary)',
  '--color-primary-hover': 'var(--ifm-color-primary-dark)',
  '--color-primary-active': 'var(--ifm-color-primary-darker)',
  '--color-primary-bg':
    'color-mix(in srgb, var(--ifm-color-primary) 12%, transparent)',
  '--color-primary-border':
    'color-mix(in srgb, var(--ifm-color-primary) 40%, transparent)',
  '--color-primary-text': 'var(--ifm-color-primary)',
  // about the same as the sidebar in the docs area, for consistency
  // @see https://davidgoss.co/blog/api-documentation-redoc-docusaurus/
  '--sidebar-width': '300px',
  '--sidebar-bg-color': 'var(--ifm-background-surface-color)',
  '--sidebar-text-color': 'var(--ifm-font-color-base)',
};

/**
 * Redoc's primary color tokens for one color. The shades are derived with
 * `color-mix`, so any CSS color works: darker on hover in light mode, lighter in
 * dark mode.
 */
function primaryTokens(color: string, isDark: boolean): Record<string, string> {
  const towards = isDark ? 'white' : 'black';
  return {
    '--color-primary-base': color,
    '--color-primary-hover': `color-mix(in srgb, ${color} 85%, ${towards})`,
    '--color-primary-active': `color-mix(in srgb, ${color} 70%, ${towards})`,
    '--color-primary-bg': `color-mix(in srgb, ${color} 12%, transparent)`,
    '--color-primary-border': `color-mix(in srgb, ${color} 40%, transparent)`,
    '--color-primary-text': color,
    '--link-color-primary': color,
  };
}

/**
 * Keep only usable custom properties from the `cssVariables` option. Names may be
 * given with or without the leading `--`. A value that could end the rule early
 * (`;`, `{` or `}`) is skipped, with a warning.
 */
function normalizeVariables(
  variables: Record<string, string> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(variables ?? {}).forEach(([name, value]) => {
    if (typeof value !== 'string' || /[;{}]/.test(value)) {
      console.warn(
        `[REDOCUSAURUS] Ignoring the cssVariables entry "${name}": the value must be a string without ";", "{" or "}".`,
      );
      return;
    }
    result[name.startsWith('--') ? name : `--${name}`] = value;
  });
  return result;
}

function declarations(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
}

/**
 * The stylesheet that themes Redoc: Redoc's tokens from Infima, then the
 * `primaryColor` options, then the `cssVariables` option, each overriding the last.
 * `light` applies in both modes, and `dark` overrides it in dark mode. The
 * selectors (`html:root`, `html:root.dark`) win over Redoc's own (`:root`,
 * `:root.dark`).
 */
export function buildThemeCss({
  primaryColor,
  primaryColorDark = primaryColor,
  cssVariables,
}: {
  primaryColor?: string;
  primaryColorDark?: string;
  cssVariables?: CssVariables;
}): string {
  const light = {
    ...INFIMA_TOKENS,
    ...(primaryColor ? primaryTokens(primaryColor, false) : {}),
    ...normalizeVariables(cssVariables?.light),
  };
  const dark = {
    ...(primaryColorDark ? primaryTokens(primaryColorDark, true) : {}),
    ...normalizeVariables(cssVariables?.dark),
  };
  const darkCss = Object.keys(dark).length
    ? `html:root.dark{${declarations(dark)}}`
    : '';
  return `html:root{${declarations(light)}}${darkCss}`;
}

let warnedAboutTheme = false;

/**
 * The Redoc 2 `theme` object (and the `theme` of `redocly.yaml`) does nothing in
 * Redoc 3. Say so once, so a site that still sets it knows why it has no effect.
 */
function warnIfThemeIgnored(...themes: unknown[]) {
  const isSet = themes.some(
    (theme) =>
      typeof theme === 'object' && theme !== null && Object.keys(theme).length,
  );
  if (isSet && !warnedAboutTheme) {
    warnedAboutTheme = true;
    console.warn(
      '[REDOCUSAURUS] The Redoc 2 `theme` object (the `theme` theme option, and `theme.openapi.theme` in redocly.yaml) is ignored: Redoc 3 is themed with CSS variables. Use the `primaryColor` and `cssVariables` options instead.',
    );
  }
}

/** Redoc options as set in the theme options or in `redocly.yaml`. */
type RedoclyOptions = Record<string, unknown> & { theme?: unknown };

export async function getGlobalData({
  primaryColor,
  primaryColorDark = primaryColor,
  cssVariables,
  syncColorMode = true,
  theme: customThemeDeprecated,
  options,
}: ThemeOptions): Promise<GlobalData> {
  let redoclyOptions: RedoclyOptions | undefined;

  if (options) {
    if (typeof options === 'string') {
      redoclyOptions = (
        await loadConfig({
          configPath: options,
        })
      ).resolvedConfig.theme?.openapi;
    } else {
      redoclyOptions = options as RedoclyOptions;
    }
  } else {
    redoclyOptions = (await loadConfig()).resolvedConfig.theme?.openapi;
  }

  warnIfThemeIgnored(customThemeDeprecated, redoclyOptions?.theme);

  return {
    options: merge({}, defaultOptions, omit(redoclyOptions, 'theme')),
    css: buildThemeCss({ primaryColor, primaryColorDark, cssVariables }),
    syncColorMode,
  };
}
