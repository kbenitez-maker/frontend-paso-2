'use client';

import { useEffect } from 'react';

import type { BlockCardProps } from '@/shared/step-form/block-card';

import { useFormContext, useWatch } from 'react-hook-form';

import { BlockCard } from '@/shared/step-form/block-card';

const MARK_ALL_KEY = 'mark_all_features';

/** Default card plus the sheet's shortcut: answering Sí to "mark all" turns on every other feature. */
const FeaturesBlock = (props: Readonly<BlockCardProps>) => {
  const { control, getValues, setValue } = useFormContext();
  const markAll: unknown = useWatch({ control, name: MARK_ALL_KEY });

  useEffect(() => {
    if (markAll !== true) return;
    for (const { field } of props.fields) {
      if (field.key === MARK_ALL_KEY || getValues(field.key) === true) continue;
      setValue(field.key, true, { shouldDirty: true, shouldValidate: true });
    }
  }, [markAll, props.fields, getValues, setValue]);

  return <BlockCard {...props} />;
};

export { FeaturesBlock };
