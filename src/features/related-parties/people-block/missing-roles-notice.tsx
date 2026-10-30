'use client';

import { use } from 'react';

import type { RelatedPartiesBlock } from '@/lib/related-parties';
import type { BankId, CatalogName } from '@/types/domain';

import { useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';

import { Text } from '@lafise/onyx-ui/typography/text';

import {
  hasMissing,
  missingRoles,
  peopleCollectionOf,
} from '@/lib/related-parties';

import { RouteContext } from '../lib/route-context';
import { useCatalogNames } from '../lib/use-catalog-names';
import { missingRolesNoticeTheme } from './themes';

const { notice } = missingRolesNoticeTheme();

/** Role catalog each people block offers. */
const ROLE_CATALOGS: Partial<Record<RelatedPartiesBlock, CatalogName>> = {
  administrators: 'related-party-roles',
  'trust-administrators': 'trust-administration-roles',
  'trust-parties': 'trust-party-roles',
};

const POSITION_CATALOGS: readonly CatalogName[] = [
  'board-positions',
  'administrative-positions',
  'technical-committee-positions',
];

interface MissingRolesNoticeProps {
  block: RelatedPartiesBlock;
  bankId: BankId;
}

/** POC `mensajeDeFaltantes`: names exactly which roles and positions the matrix still requires. */
const MissingRolesNotice = ({
  block,
  bankId,
}: Readonly<MissingRolesNoticeProps>) => {
  const t = useTranslations('RelatedParties.missingRoles');
  const matrix = use(RouteContext);
  const collection = peopleCollectionOf(block) ?? '';
  const items: unknown = useWatch({ name: collection });
  // eslint-disable-next-line security/detect-object-injection -- `block` is a registry block
  const roleCatalog = ROLE_CATALOGS[block];
  const roleName = useCatalogNames(
    bankId,
    roleCatalog === undefined ? [] : [roleCatalog],
  );
  const positionName = useCatalogNames(bankId, POSITION_CATALOGS);

  if (matrix === undefined || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  const missing = missingRoles(matrix, block, { [collection]: items });
  if (!hasMissing(missing)) return null;

  const roles = missing.roles.map(roleName).join(', ');
  const positions = missing.positions
    .map(({ role_id, position_id }) =>
      t('position', {
        position: positionName(position_id),
        role: roleName(role_id),
      }),
    )
    .join(', ');

  const messageOf = (): string => {
    if (missing.positions.length === 0) {
      return t('roles', { count: missing.roles.length, roles });
    }
    if (missing.roles.length === 0) {
      return t('positions', { count: missing.positions.length, positions });
    }
    return t('both', {
      roleCount: missing.roles.length,
      roles,
      positionCount: missing.positions.length,
      positions,
    });
  };

  return (
    <Text size='sm' role='alert' className={notice()}>
      {messageOf()}
    </Text>
  );
};

export { MissingRolesNotice, type MissingRolesNoticeProps };
