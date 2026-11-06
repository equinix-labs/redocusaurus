import React, { useMemo } from 'react';
import Redoc from '@theme/Redoc';
import useSpecData from '@theme/useSpecData';
import { useSpecOptions } from '../../utils/useSpecOptions';
import type { MdxProps } from '../../types/common';

const ApiDocMdx: React.FC<MdxProps> = ({ id, spec }: MdxProps): JSX.Element => {
  const specProps = useSpecData(id, spec);
  const { options } = useSpecOptions(specProps.themeId);
  // An API embedded in a docs page is narrow, and Redoc 3's three columns
  // squeeze the content into a thin strip. Stack them, unless the site chose a
  // layout itself (Redoc 2 did this with `theme.breakpoints`, which Redoc 3
  // ignores).
  const siteChoseLayout = options.layout !== undefined;
  const optionsOverrides = useMemo(
    () => (siteChoseLayout ? undefined : { layout: 'stacked' }),
    [siteChoseLayout],
  );

  return <Redoc {...specProps} optionsOverrides={optionsOverrides} />;
};

export default ApiDocMdx;
