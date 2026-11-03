import React from 'react';
import Layout from '@theme/Layout';
import Redoc from '@theme/Redoc';
import type { ApiDocProps as Props } from '../../types/common';

function ApiDoc({ layoutProps, specProps, ssrProps }: Props): JSX.Element {
  const defaultTitle = specProps.spec?.info?.title || 'API Docs';
  const defaultDescription =
    specProps.spec?.info?.description || 'Open API Reference Docs for the API';

  return (
    <Layout
      title={defaultTitle}
      description={defaultDescription}
      {...layoutProps}
    >
      {/* ssrProps is the page's HTML. Its styles come from a CSS module that
          docusaurus-plugin-redoc adds to the route, linked from the page head. */}
      <Redoc {...specProps} ssr={ssrProps} />
    </Layout>
  );
}

export default ApiDoc;
