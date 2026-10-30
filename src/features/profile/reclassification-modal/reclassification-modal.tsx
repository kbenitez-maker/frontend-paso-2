'use client';

import type { BrokenLink, Reclassification } from '@/server/api';
import type { BankId } from '@/types/domain';

import { useFormatter, useTranslations } from 'next-intl';

import { Modal } from '@lafise/onyx-ui/overlays/modal';
import { Text } from '@lafise/onyx-ui/typography/text';

import { useCatalog } from '@/shared/form/hooks';

import { reclassificationModalTheme } from './themes';

const { dialog, consequence } = reclassificationModalTheme();

interface ReclassificationModalProps {
  bankId: BankId;
  /** The consequence the API computed; the modal only opens when it asks to confirm. */
  change: Reclassification;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation of a new legal entity type (POC classification change modal):
 * the related parties registered under the old classification stop applying,
 * so it says who goes, who loses which role, which designations outside the
 * step are left without their person and how many form fields change before
 * anything is removed. It cannot be undone.
 */
const ReclassificationModal = ({
  bankId,
  change,
  isPending,
  onConfirm,
  onCancel,
}: Readonly<ReclassificationModalProps>) => {
  const t = useTranslations('Profile.reclassification');
  const format = useFormatter();
  const types = useCatalog({
    bankId,
    catalog: { name: 'legal-entity-types', source: 'api' },
    parentValue: undefined,
  });
  const roles = useCatalog({
    bankId,
    catalog: { name: 'related-party-roles', source: 'api' },
    parentValue: undefined,
  });
  const type =
    types.options.find(
      (option) => option.code === change.legal_entity_type_after,
    )?.name ?? change.legal_entity_type_after;
  const list = (items: readonly string[]) =>
    format.list(items, { type: 'conjunction' });
  const removed = list(change.removed_people.map((person) => person.name));
  const losing = list(
    change.people_losing_roles.map((person) =>
      t('losesRoles', {
        name: person.name,
        roles: list(
          person.role_ids.map(
            (role) =>
              roles.options.find((option) => option.code === role)?.name ??
              role,
          ),
        ),
      }),
    ),
  );

  const linkOf = ({ kind, position, name }: BrokenLink) =>
    t('link', { kind, position, name });

  const consequenceOf = (): string => {
    if (change.scenario === 'route_change') {
      return t('routeChange', { type, removed });
    }
    if (change.removed_people.length === 0)
      return t('rolesTaken', { type, losing });
    if (change.people_losing_roles.length === 0) {
      return t('rolesRemoved', { type, removed });
    }
    return `${t('rolesRemoved', { type, removed })} ${t('alsoLosing', { losing })}`;
  };
  const what = consequenceOf();

  return (
    <Modal.Root
      isOpen
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Modal role='alertdialog' dialogProps={{ className: dialog() }}>
        <Modal.Header>
          <Modal.Slot>
            <Modal.Headline>
              <Modal.Title size='sm'>{t('title')}</Modal.Title>
              <Modal.Description>{t('description')}</Modal.Description>
            </Modal.Headline>
            <Modal.CloseButton />
          </Modal.Slot>
        </Modal.Header>

        <Modal.Body>
          <Text size='md' className={consequence()}>
            {what} {t('irreversible')}
            {change.broken_links.length === 0 ? null : (
              t('brokenLinks', { links: list(change.broken_links.map(linkOf)) })
            )}
            {t('fields', { count: change.changed_fields })}
          </Text>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Actions>
            <Modal.Cancel onPress={onCancel}>{t('cancel')}</Modal.Cancel>
            <Modal.Action onPress={onConfirm} isPending={isPending}>
              {change.removed_people.length === 0 ?
                t('confirm')
              : t('confirmAndRemove')}
            </Modal.Action>
          </Modal.Actions>
        </Modal.Footer>
      </Modal>
    </Modal.Root>
  );
};

export { ReclassificationModal, type ReclassificationModalProps };
