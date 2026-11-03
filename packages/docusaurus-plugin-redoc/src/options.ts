import { Joi } from '@docusaurus/utils-validation';
import type { RawUniversalConfig } from '@redocly/openapi-core';

type LayoutProps = {
  title?: string;
  noFooter?: boolean;
  description?: string;
  image?: string;
  keywords?: string[];
  permalink?: string;
  wrapperClassName?: string;
  searchMetadatas?: {
    version?: string;
    tag?: string;
  };
};

/**
 * Can pass only if directly using plugin.
 * `redocusaurus` auto populates them
 */
export interface PluginDirectUsageOptions {
  debug?: boolean;
  themeId?: string;
  /**
   * Redocly config to bundle file
   * @see https://redocly.com/docs/cli/configuration/configuration-file/
   */
  config?: string | RawUniversalConfig;
  layout?: LayoutProps;
}

export interface PluginOptions extends PluginDirectUsageOptions {
  id?: string;
  spec: string;
  url?: string;
  route?: string;
  normalizeUrl?: boolean;
  /**
   * Render every tag and operation page to static HTML at build time, and
   * register one exact route for each. Only applies to production builds of the
   * default locale.
   *
   * - `true`: if Redoc can't be rendered on the server, warn and fall back to a
   *   client-rendered page (a single prefix route that renders any sub-path).
   * - `'required'`: fail the build instead. Use it when the web server has no
   *   fallback for sub-paths (every page must exist as a file), since a silent
   *   fallback would ship a site where every deep link is a 404.
   * - `false`: never render on the server.
   * @default true
   */
  ssr?: boolean | 'required';
}

export interface PluginOptionsWithDefault extends PluginOptions {
  debug: boolean;
}

export const DEFAULT_OPTIONS = {
  layout: {},
  debug: false,
  normalizeUrl: true,
  ssr: true,
} satisfies Omit<PluginOptions, 'spec'>;

export const PluginOptionSchema = Joi.object<PluginOptions>({
  // Direct Usage without redocusaurus preset
  id: Joi.string(),
  debug: Joi.boolean().default(DEFAULT_OPTIONS.debug),
  config: Joi.any().optional(),
  themeId: Joi.string().optional(),

  // Basic
  spec: Joi.string(),
  url: Joi.string().uri({ allowRelative: true }).optional(),
  normalizeUrl: Joi.boolean().default(DEFAULT_OPTIONS.normalizeUrl),
  route: Joi.string().uri({ relativeOnly: true }).optional(),
  ssr: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid('required'))
    .default(DEFAULT_OPTIONS.ssr),
  layout: Joi.any().default(DEFAULT_OPTIONS.layout),
});
