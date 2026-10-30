'use client';

import type { ReclassificationTrace } from '@/server/api';
import type { BankId } from '@/types/domain';

import { useQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';

import { Notification } from '@lafise/onyx-ui/status/notification';

import { requestProgressQuery } from '@/server/api';

import { useCatalogNames } from '../lib/use-catalog-names';

interface ReclassificationNoticeProps {
  requestId: string;
  bankId: BankId;
  trace: ReclassificationTrace;
  /** Block on screen: once it is complete again the notice has said its part. */
  block: string;
}

/**
 * What the last legal entity type change did to the related parties (POC
 * aviso-de-reclasificacion, ITDFCJ-45 CA 14): who it removed and which roles
 * the new classification asks for. The trace stays on the request; the notice
 * hides while the block on screen is complete.
 */
const ReclassificationNotice = ({
  requestId,
  bankId,
  trace,
  block,
}: Readonly<ReclassificationNoticeProps>) => {
  const t = useTranslations('RelatedParties.reclassification');
  const format = useFormatter();
  const { data: progress } = useQuery(requestProgressQuery(requestId));
  const typeName = useCatalogNames(bankId, ['legal-entity-types']);
  const roleName = useCatalogNames(bankId, [
    'related-party-roles',
    'trust-administration-roles',
    'trust-party-roles',
  ]);

  const current = progress?.steps
    .find((step) => step.slug === 'related-parties')
    ?.blocks.find((entry) => entry.key === block);
  const resolved =
    current !== undefined && current.completed_fields === current.total_fields;
  if (progress === undefined || resolved) return null;

  const list = (items: readonly string[]) =>
    format.list(items, { type: 'conjunction' });

  return (
    <Notification status='warning'>
      <Notification.Icon />
      <Notification.Content>
        {t('message')}
        {trace.removed_people.length === 0 ? null : (
          t('removed', {
            type: typeName(trace.legal_entity_type_after),
            removed: list(trace.removed_people),
          })
        )}
        {trace.roles_added.length === 0 ? null : (
          t('required', { roles: list(trace.roles_added.map(roleName)) })
        )}
      </Notification.Content>
    </Notification>
  );
};

export { ReclassificationNotice, type ReclassificationNoticeProps };
