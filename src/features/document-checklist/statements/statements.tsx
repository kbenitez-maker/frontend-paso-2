'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Document, Pencil } from '@lafise/onyx-icons';
import { ListBox } from '@lafise/onyx-ui/collections/list-box';
import { Card } from '@lafise/onyx-ui/data-display/card';
import { Text } from '@lafise/onyx-ui/typography/text';

import { accountRequestQuery, banksQuery } from '@/server/api';
import { isStatementKey, STATEMENT_KEYS } from '@/types/request';

import { useConfirmation } from '../lib/use-confirmation';
import { statementsTheme } from './themes';

const { card, header, headline, description, clause } = statementsTheme();

interface StatementsProps {
  requestId: string;
}

/**
 * The three declarations that close the checklist. They are accepted one by
 * one and none starts checked: accepting them all at once is not allowed.
 */
const Statements = ({ requestId }: Readonly<StatementsProps>) => {
  const t = useTranslations('DocumentChecklist.statements');
  const { confirmation, choose } = useConfirmation(requestId);
  const { data: request } = useQuery(accountRequestQuery(requestId));
  const { data: banks } = useQuery(banksQuery());

  const bank =
    banks?.results.find((candidate) => candidate.bank_id === request?.bank_id)
      ?.legal_name ?? '';

  if (confirmation === undefined) return null;

  return (
    // The margin leaves room for the indicator, which sits on the top edge.
    <Card className={card()}>
      <Card.Indicator>
        <Document size='md' />
      </Card.Indicator>

      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={2} size='lg'>
            {t('title')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t('description')}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      <Card.Body>
        <ListBox
          aria-label={t('label')}
          dense={false}
          variant='gray'
          layout='stack'
          selectionMode='multiple'
          selectedKeys={confirmation.accepted_statements}
          onSelectionChange={(keys) => {
            choose({
              accepted_statements:
                keys === 'all' ?
                  [...STATEMENT_KEYS]
                : [...keys].map(String).filter(isStatementKey),
            });
          }}
        >
          {STATEMENT_KEYS.map((key) => {
            const text = t(`items.${key}`, { bank });

            return (
              <ListBox.Item key={key} id={key} textValue={text}>
                <ListBox.Prefix>
                  <ListBox.Indicator variant='base-primary'>
                    <Pencil size='md' />
                  </ListBox.Indicator>
                </ListBox.Prefix>
                {/* Loose text, not `ListBox.Description`: that slot cuts at two lines and a legal clause cut short was never really accepted. */}
                <ListBox.Content>
                  <Text size='sm' className={clause()}>
                    {text}
                  </Text>
                </ListBox.Content>
                <ListBox.Suffix>
                  <ListBox.MultipleSelectionIndicator />
                </ListBox.Suffix>
              </ListBox.Item>
            );
          })}
        </ListBox>
      </Card.Body>
    </Card>
  );
};

export { Statements, type StatementsProps };
