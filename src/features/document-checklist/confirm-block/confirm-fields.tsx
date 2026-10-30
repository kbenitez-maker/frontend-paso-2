'use client';

import { useRouter } from 'next/navigation';

import type { ConfirmationField } from '@/server/api';

import { useTranslations } from 'next-intl';

import { Pencil } from '@lafise/onyx-icons';
import { Button } from '@lafise/onyx-ui/base/button';
import { ListBox } from '@lafise/onyx-ui/collections/list-box';
import { Card } from '@lafise/onyx-ui/data-display/card';
import { Notification } from '@lafise/onyx-ui/status/notification';

import { routes } from '@/lib/routes';

import { useConfirmBlock } from './context';
import { confirmBlockTheme } from './themes';

const { card, header, headline, description, body } = confirmBlockTheme();

/** The answers that decide the checklist, each with the way to fix it. */
const ConfirmFields = () => {
  const t = useTranslations('DocumentChecklist.confirm');
  const router = useRouter();
  const { requestId, confirmation } = useConfirmBlock();

  const show = ({ value }: ConfirmationField): string => {
    if (value === null) return t('unanswered');
    if (typeof value === 'boolean') return value ? t('yes') : t('no');
    return value;
  };

  return (
    <Card className={card()}>
      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='md'>
            {t('card.title')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t('card.description')}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      <Card.Body className={body()}>
        <Notification status='warning'>
          <Notification.Icon />
          <Notification.Content>{t('notice')}</Notification.Content>
        </Notification>

        <ListBox
          aria-label={t('listLabel')}
          dense={false}
          variant='gray'
          layout='stack'
          selectionMode='none'
        >
          {confirmation.fields.map((field) => {
            const label = t(`fields.${field.key}`);
            const { source } = field;

            return (
              <ListBox.Item key={field.key} id={field.key} textValue={label}>
                <ListBox.Content>
                  <ListBox.Label>{label}</ListBox.Label>
                  <ListBox.Description>{show(field)}</ListBox.Description>
                </ListBox.Content>
                {/* A button, not a clickable row: it leaves for another step, so the jump should read as one. */}
                <ListBox.Suffix>
                  <Button
                    variant='white'
                    size='sm'
                    onPress={() => {
                      router.push(
                        source === 'profile' ?
                          routes.profile(requestId)
                        : routes.step(requestId, source.step, {
                            block: source.block,
                          }),
                      );
                    }}
                  >
                    <Pencil size='md' />
                    {t('edit')}
                  </Button>
                </ListBox.Suffix>
              </ListBox.Item>
            );
          })}
        </ListBox>
      </Card.Body>
    </Card>
  );
};

export { ConfirmFields };
