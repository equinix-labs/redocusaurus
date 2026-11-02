import React, { useRef, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import BrowserOnly from '@docusaurus/BrowserOnly';
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

function RedocClient({ spec, options, basePath }: RedocClientProps) {
  // Links from Redoc 2 use `#tag/...` anchors. Map them to Redoc 3 paths before
  // it mounts and reads the URL; the initializer runs once, before first render.
  useState(() => redirectLegacyHash(basePath));

  return <RedocStandalone spec={spec} options={options} basePath={basePath} />;
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
  const { options } = useSpecOptions(themeId, optionsOverrides);

  // Redoc 3 routes by path (it mounts its own BrowserRouter), so it has to be
  // told where it lives. Prefer the route the plugin registered; the current
  // location only works for pages that embed Redoc without one, and is captured
  // on first render because Redoc moves the URL itself afterwards.
  const { pathname } = useLocation();
  const routeBaseUrl = useBaseUrl(finalProps.route);
  const basePath = useRef(
    (finalProps.route ? routeBaseUrl : pathname).replace(/\/+$/, '') || '/',
  ).current;

  // Redoc 3 renders from a spec object or URL on the client only; the
  // Redoc 2 server-rendering path (AppStore + styled-components SSR) is gone.
  return (
    <div className={clsx(['redocusaurus', className])}>
      <BrowserOnly>
        {() => (
          <RedocClient spec={spec} options={options} basePath={basePath} />
        )}
      </BrowserOnly>
    </div>
  );
}

export default Redoc;
