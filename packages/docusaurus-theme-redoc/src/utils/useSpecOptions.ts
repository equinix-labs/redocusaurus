import { useMemo } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import {
  usePluginData,
  useAllPluginInstancesData,
} from '@docusaurus/useGlobalData';
import merge from 'lodash/merge';
import '../global';
import type { RedocRawOptions } from '../types/redoc-compat';
import type { SpecProps } from '../types/common';
import { GlobalData } from '../types/options';

/**
 * Redocusaurus
 * https://redocusaurus.vercel.app/
 * (c) 2024 Rohit Gohri
 * Released under the MIT License
 */
export function useSpecOptions(
  themeId: SpecProps['themeId'] = 'theme-redoc',
  optionsOverrides?: RedocRawOptions,
) {
  const isBrowser = useIsBrowser();

  const defaultThemeOptions = useAllPluginInstancesData(
    'docusaurus-theme-redoc',
    {
      failfast: true,
    },
  );
  const themeOptions =
    (usePluginData('docusaurus-theme-redoc', themeId) as GlobalData) ||
    Object.values(defaultThemeOptions)[0];

  const result = useMemo(() => {
    const { css, cssHref, options: redocOptions } = themeOptions;

    // When a string CSS selector is given for scrollYOffset, Redoc caches
    // the element height at AppStore creation time (during React render).
    // On direct page load this can capture a stale height before the navbar
    // reaches its final dimensions, causing the scroll-spy to pick the
    // previous menu item instead of the one that was clicked.
    // Convert string selectors to a dynamic function so the height is read
    // fresh on every scroll event. On the server there is no DOM, so fall
    // back to 0.
    const scrollYOffset =
      typeof redocOptions.scrollYOffset === 'string'
        ? !isBrowser
          ? 0
          : () =>
              (
                document.querySelector(
                  redocOptions.scrollYOffset as string,
                ) as HTMLElement
              )?.clientHeight ?? 0
        : redocOptions.scrollYOffset;

    // The theme (colors, fonts) is not an option in Redoc 3: it is the `css`
    // stylesheet, which follows the Docusaurus theme in light and dark mode.
    const options: RedocRawOptions = merge(
      { ...redocOptions, scrollYOffset },
      optionsOverrides,
    );

    return { options, css, cssHref };
  }, [isBrowser, themeOptions, optionsOverrides]);

  return result;
}
