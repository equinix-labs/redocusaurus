import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Head from '@docusaurus/Head';
import useSpecData from '@theme/useSpecData';
import clsx from 'clsx';
import '../../global';
import { RedocStandalone } from 'redoc';
import type { RedocProps } from '../../types/common';
import { useSpecOptions } from '../../utils/useSpecOptions';
import { redirectLegacyHash } from '../../utils/legacyHash';
import { useRedocColorModeSync } from '../../utils/useRedocColorModeSync';
import { pickDownloadUrl } from '../../utils/downloadUrl';
import './styles.css';

type RedocClientProps = {
  spec: React.ComponentProps<typeof RedocStandalone>['spec'];
  options: React.ComponentProps<typeof RedocStandalone>['options'];
  basePath: string;
  syncColorMode: boolean;
};

function RedocClient({
  spec,
  options,
  basePath,
  syncColorMode,
}: RedocClientProps) {
  // Links from Redoc 2 use `#tag/...` anchors. Map them to Redoc 3 paths before
  // it mounts and reads the URL; the initializer runs once, before first render.
  useState(() => redirectLegacyHash(basePath));

  // Redoc 3 keeps its own color mode and ignores Docusaurus's `data-theme`, so
  // keep the two in step (see utils/redocColorMode.ts for how, and what it relies
  // on). The key remounts Redoc when the mode changes.
  const colorModeKey = useRedocColorModeSync(syncColorMode);

  return (
    <RedocStandalone
      key={colorModeKey}
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
  const {
    options: specOptions,
    css,
    cssHref,
    syncColorMode,
  } = useSpecOptions(themeId, optionsOverrides);

  // Redoc 3 routes by path (it mounts its own BrowserRouter), so it has to be
  // told where it lives. On the spec's own page that is the route the plugin
  // registered. When Redoc is embedded in another page (`ApiDocMdx` in an MDX
  // page, `@theme/Redoc` in a custom page) the spec's data still carries its own
  // route, but Redoc lives at the page it is on. The base is captured on first
  // render because Redoc moves the URL itself afterwards.
  const { pathname } = useLocation();
  // `useBaseUrl` returns undefined when there is no route to resolve
  const routeBaseUrl = (useBaseUrl(finalProps.route) ?? '').replace(/\/+$/, '');

  // Redoc 3 offers a download of the spec through `downloadUrls` (Redoc 2 took
  // the spec's address as `specUrl`). Options set by the site win. See
  // `pickDownloadUrl` for how a relative `url` is read.
  const { url, normalizeUrl: normalizeDownloadUrl = true } = finalProps;
  const withBaseUrl = useBaseUrl(url ?? '');
  const downloadUrl = pickDownloadUrl({
    url,
    normalize: normalizeDownloadUrl,
    withBaseUrl,
    routeBaseUrl,
  });
  const options = useMemo(
    () =>
      downloadUrl && specOptions.downloadUrls === undefined
        ? { ...specOptions, downloadUrls: [{ url: downloadUrl }] }
        : specOptions,
    [specOptions, downloadUrl],
  );
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
          <RedocClient
            spec={spec}
            options={options}
            basePath={basePath}
            syncColorMode={syncColorMode}
          />
        )}
      </BrowserOnly>
    </div>
  );
}

export default Redoc;
