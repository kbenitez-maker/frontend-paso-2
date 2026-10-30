import type { OwnershipTotal } from '@/lib/ownership';

import { useTranslations } from 'next-intl';

import { Modal } from '@lafise/onyx-ui/overlays/modal';
import { Text } from '@lafise/onyx-ui/typography/text';

import { percent } from '../lib/ownership-copy';
import { RouteTable } from './route-table';
import { breakdownModalTheme } from './themes';

const {
  dialog,
  headerSlot,
  headline,
  description,
  body,
  route: routeSlot,
  routeTitle,
  total,
} = breakdownModalTheme();

interface BreakdownModalProps {
  /** Kept while the modal closes, so the exit animation has its content. */
  who: OwnershipTotal | undefined;
  isOpen: boolean;
  onClose: () => void;
}

/** POC modal-de-desglose.tsx: the routes behind an indirect participation (ITDFCJ-47 CA 6). */
const BreakdownModalRoot = ({
  who,
  isOpen,
  onClose,
}: Readonly<BreakdownModalProps>) => {
  const t = useTranslations('RelatedParties.ownership.breakdown');
  const routes = who?.routes ?? [];

  return (
    <Modal.Root
      isOpen={isOpen && who !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal aria-label={t('label')} dialogProps={{ className: dialog() }}>
        <Modal.Header>
          <Modal.Slot>
            <Modal.CloseButton />
          </Modal.Slot>
          <Modal.Slot className={headerSlot()}>
            <Modal.Headline className={headline()}>
              <Modal.Title size='md'>
                {t('title', {
                  name: who?.name ?? '',
                  total: percent(who?.total ?? 0),
                })}
              </Modal.Title>
              <Modal.Description size='md' className={description()}>
                {routes.length <= 1 ?
                  t('oneRoute')
                : t('manyRoutes', { count: routes.length })}
              </Modal.Description>
            </Modal.Headline>
          </Modal.Slot>
        </Modal.Header>
        <Modal.Body className={body()}>
          {routes.map((route, index) => (
            <div
              key={`${who?.document ?? ''}-${String(index)}`}
              className={routeSlot()}
            >
              {routes.length <= 1 ? null : (
                <Text size='sm' className={routeTitle()}>
                  {t('route', {
                    index: index + 1,
                    count: routes.length,
                    percentage: percent(route.percentage),
                  })}
                </Text>
              )}
              <RouteTable route={route} />
            </div>
          ))}
          {routes.length <= 1 ? null : (
            <Text size='sm' className={total()}>
              {t('total', {
                count: routes.length,
                total: percent(who?.total ?? 0),
              })}
            </Text>
          )}
        </Modal.Body>
      </Modal>
    </Modal.Root>
  );
};

export { BreakdownModalRoot, type BreakdownModalProps };
