'use client';

import { use, useEffect } from 'react';

import type { BlockCardProps } from '@/shared/step-form/block-card';

import { useFormContext } from 'react-hook-form';

import { HOLDER_LISTED } from '@/lib/related-parties';
import { BlockCard } from '@/shared/step-form/block-card';

import { RouteContext } from '../lib/route-context';

/**
 * The listing question opens the step. With an unmapped legal entity type it
 * carries the notice that registration stops (POC Sad Path 4), shown at once.
 *
 * Changing the answer only hides or shows the shareholders block, keeping its
 * data: the POC rules module (reclasificacion.ts:256-296) empties shareholders
 * on No to Yes, but the POC screen does not, and we follow the screen (user decision).
 */
const ListingBlock = (props: Readonly<BlockCardProps>) => {
  const matrix = use(RouteContext);
  const { trigger } = useFormContext();
  const unmapped = matrix?.route === null;

  useEffect(() => {
    if (unmapped) void trigger(HOLDER_LISTED);
  }, [unmapped, trigger]);

  return <BlockCard {...props} />;
};

export { ListingBlock };
