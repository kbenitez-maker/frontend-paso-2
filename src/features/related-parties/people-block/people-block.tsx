'use client';

import { use } from 'react';

import type { BlockCardProps } from '@/shared/step-form/block-card';

import { useTranslations } from 'next-intl';

import { isBlockOf } from '@/lib/constants/steps';
import { routeBlockTitle } from '@/lib/related-parties';
import { BlockCard } from '@/shared/step-form/block-card';

import { RouteContext } from '../lib/route-context';
import { MissingRolesNotice } from './missing-roles-notice';

/** Block of a list of people: the route's title (route B names its governing body) and the roles it still lacks. */
const PeopleBlockRoot = (props: Readonly<BlockCardProps>) => {
  const t = useTranslations('Steps');
  const matrix = use(RouteContext);
  const block = props.fields[0]?.field.block;
  if (!isBlockOf('related-parties', block)) return <BlockCard {...props} />;

  return (
    <BlockCard {...props} title={t(`blocks.${routeBlockTitle(block, matrix)}`)}>
      <MissingRolesNotice block={block} bankId={props.bankId} />
    </BlockCard>
  );
};

export { PeopleBlockRoot };
