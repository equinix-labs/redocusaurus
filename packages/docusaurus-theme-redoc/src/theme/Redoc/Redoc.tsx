import React, { useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useSpecData from '@theme/useSpecData';
import clsx from 'clsx';
import '../../global';
import { RedocStandalone } from 'redoc';
import type { RedocProps } from '../../types/common';
import { useSpecOptions } from '../../utils/useSpecOptions';
import './styles.css';

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
  // told where it lives. Capture the page's route on first render: Redoc moves
  // the URL itself afterwards, and Docusaurus' location doesn't follow.
  const { pathname } = useLocation();
  const basePath = useRef(pathname.replace(/\/+$/, '') || '/').current;

  // Redoc 3 renders from a spec object or URL on the client only; the
  // Redoc 2 server-rendering path (AppStore + styled-components SSR) is gone.
  return (
    <div className={clsx(['redocusaurus', className])}>
      <BrowserOnly>
        {() => <RedocStandalone spec={spec} options={options} basePath={basePath} />}
      </BrowserOnly>
    </div>
  );
}

export default Redoc;
