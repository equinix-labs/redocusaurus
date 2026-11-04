import type { RedocRawOptions } from './redoc-compat';

/**
 * CSS custom properties to set on Redoc, by name (with or without the leading
 * `--`). `light` applies in both modes, and `dark` overrides it in dark mode.
 * @see https://redocly.com/docs/redoc/ for the tokens Redoc 3 defines
 */
export interface CssVariables {
  light?: Record<string, string>;
  dark?: Record<string, string>;
}

export interface ThemeOptions {
  id?: string;
  /**
   * Primary color of Redoc (links, active items, buttons). Any CSS color.
   * Defaults to the primary color of your Docusaurus theme.
   * Ideally this should be all the customization you need
   */
  primaryColor?: string;
  /**
   * Primary color of Redoc in dark mode.
   * This option is only needed if you want a different primary color in dark
   * mode, and will default to `primaryColor` if not set.
   */
  primaryColorDark?: string;
  /**
   * Options to pass to redoc
   * @deprecated
   * @see https://github.com/redocly/redoc#redoc-options-object
   */
  options?: string | Partial<Omit<RedocRawOptions, 'theme'>>;
  /**
   * CSS custom properties to set on Redoc, for anything `primaryColor` does not
   * cover. By default Redoc follows your Docusaurus theme.
   * @example { light: { 'sidebar-width': '320px' }, dark: { 'bg-color': '#000' } }
   */
  cssVariables?: CssVariables;
  /**
   * The Redoc 2 theme object. Redoc 3 has no such option, so this does nothing
   * (a warning says so at build time).
   * @deprecated Use `primaryColor` and `cssVariables`
   */
  theme?: Record<string, unknown>;
}

export type GlobalData = {
  options: RedocRawOptions;
  /** Stylesheet that themes Redoc, see `buildThemeCss` */
  css: string;
  /**
   * Where the stylesheet is served from, in a production build. Without it (the
   * dev server) the pages put `css` in a `<style>` tag.
   */
  cssHref?: string;
};
