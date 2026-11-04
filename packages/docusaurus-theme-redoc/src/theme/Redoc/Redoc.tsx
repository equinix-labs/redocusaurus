import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Head from '@docusaurus/Head';
import { useColorMode } from '@docusaurus/theme-common';
import useSpecData from '@theme/useSpecData';
import clsx from 'clsx';
import '../../global';
import { RedocStandalone } from 'redoc';
import type { RedocProps } from '../../types/common';
import { useSpecOptions } from '../../utils/useSpecOptions';
import { redirectLegacyHash } from '../../utils/legacyHash';
import './styles.css';

type RedocClientProps = {
  spec: React.ComponentProps<typeof RedocStandalone>['spec'];
  options: React.ComponentProps<typeof RedocStandalone>['options'];
  basePath: string;
};

// Redoc 3 keeps its own color mode: it reads `localStorage['redoc.colorMode']`
// (falling back to the OS preference) and applies it as a `light` or `dark`
// class on <html>. Keep it in step with Docusaurus's `data-theme` in both
// directions.
const REDOC_COLOR_MODE_KEY = 'redoc.colorMode';
const REDOC_MODE_CLASSES = ['light', 'dark'] as const;

function RedocClient({ spec, options, basePath }: RedocClientProps) {
  const { colorMode, setColorMode } = useColorMode();

  // Links from Redoc 2 use `#tag/...` anchors. Map them to Redoc 3 paths before
  // it mounts and reads the URL; the initializer runs once, before first render.
  useState(() => redirectLegacyHash(basePath));

  // Docusaurus -> Redoc: Redoc reads its mode when it mounts, so store the
  // current one before it renders and remount it (key below) when it changes.
  useMemo(() => {
    try {
      window.localStorage.setItem(REDOC_COLOR_MODE_KEY, colorMode);
    } catch {
      // storage unavailable: Redoc falls back to the OS preference
    }
  }, [colorMode]);

  // Redoc -> Docusaurus: Redoc's own toggle changes the class on <html>. Also
  // repairs the class if something else overwrites it.
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      const mode = REDOC_MODE_CLASSES.find((c) => html.classList.contains(c));
      if (!mode) {
        // Docusaurus re-applies its own <html> class on navigation (back and
        // forward included), which wipes Redoc's class and leaves its styles
        // unmatched. Put the current mode back.
        html.classList.add(colorMode);
      } else if (mode !== colorMode) {
        setColorMode(mode);
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
    };
  }, [colorMode, setColorMode]);

  // Redoc leaves its class on <html> for the whole page; drop it on the way out.
  useEffect(
    () => () => {
      document.documentElement.classList.remove(...REDOC_MODE_CLASSES);
    },
    [],
  );

  return (
    <RedocStandalone
      key={colorMode}
      spec={spec}
      options={options}
      basePath={basePath}
    />
  );
}

/*!
 * Redocusaurus
 * https://redocusaurus.vercel.app/
 * (c) 2025 Rohit Gohri
 * Released under the MIT License
 */
function Redoc(initProps: RedocProps): JSX.Element {
  // eslint-disable-next-line react/destructuring-assignment
  const specProps = useSpecData(initProps.id, initProps.spec);
  const finalProps = {
    ...specProps,
    ...initProps,
  };

  const { spec, className, themeId, optionsOverrides } = finalProps;
  const { options, css, cssHref } = useSpecOptions(themeId, optionsOverrides);

  // Redoc 3 routes by path (it mounts its own BrowserRouter), so it has to be
  // told where it lives. On the spec's own page that is the route the plugin
  // registered. When Redoc is embedded in another page (`ApiDocMdx` in an MDX
  // page, `@theme/Redoc` in a custom page) the spec's data still carries its own
  // route, but Redoc lives at the page it is on. The base is captured on first
  // render because Redoc moves the URL itself afterwards.
  const { pathname } = useLocation();
  // `useBaseUrl` returns undefined when there is no route to resolve
  const routeBaseUrl = (useBaseUrl(finalProps.route) ?? '').replace(/\/+$/, '');
  const currentPath = pathname.replace(/\/+$/, '');
  const isSpecPage =
    Boolean(finalProps.route) &&
    (currentPath === routeBaseUrl ||
      currentPath.startsWith(`${routeBaseUrl}/`));
  const basePath = useRef(
    (isSpecPage ? routeBaseUrl : currentPath) || '/',
  ).current;

  // Redoc 3 mounts on the client only. When the plugin rendered this page at
  // build time, that HTML is the fallback: it is what the static HTML and the
  // first client render show, so there is nothing to mismatch on hydration,
  // and Redoc replaces it once it mounts.
  const { ssr } = finalProps;
  const fallback = ssr ? (
    <div
      className="redocusaurus-ssr"
      // Rendered by Redoc itself at build time, not user input
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: ssr.html }}
    />
  ) : undefined;

  return (
    <div className={clsx(['redocusaurus', className])}>
      <Head>
        {/* Redoc is themed with CSS variables that follow the Docusaurus theme.
            A `<style>` is not rendered into the static HTML, so use a file when
            there is one (production builds). */}
        {cssHref ? (
          <link rel="stylesheet" href={cssHref} />
        ) : (
          <style>{css}</style>
        )}
        {ssr?.cssHref && <link rel="stylesheet" href={ssr.cssHref} />}
      </Head>
      <BrowserOnly fallback={fallback}>
        {() => (
          <RedocClient spec={spec} options={options} basePath={basePath} />
        )}
      </BrowserOnly>
    </div>
  );
}

export default Redoc;
