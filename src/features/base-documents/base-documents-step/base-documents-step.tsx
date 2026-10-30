'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Document } from '@lafise/onyx-icons';
import { Card } from '@lafise/onyx-ui/data-display/card';

import { documentChecklistQuery } from '@/server/api';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { DocumentCards } from '../document-cards';
import { baseDocumentsStepTheme } from './themes';

const { card, header, headline, description, body } = baseDocumentsStepTheme();

interface BaseDocumentsStepProps {
  requestId: string;
}

/**
 * Base documents, between profiling and the form. The checklist (which
 * documents, how big, which formats) comes from the API for the request's
 * country and legal entity type; "Continue" opens once every required item has
 * at least one file.
 */
const BaseDocumentsStep = ({ requestId }: Readonly<BaseDocumentsStepProps>) => {
  const t = useTranslations('BaseDocuments');
  const { data: checklist } = useQuery(
    documentChecklistQuery(requestId, 'base'),
  );

  const items = checklist?.items ?? [];
  const missing = items.filter(
    (item) => item.required && item.files.length === 0,
  );

  useRegisterStepGate({
    canContinue: checklist !== undefined && missing.length === 0,
    isPending: false,
    nextLabel: t('footer.next'),
    // Nothing to save: the files are already stored as they are uploaded.
    onContinue: () => Promise.resolve(true),
  });

  if (checklist === undefined) return null;

  return (
    <Card className={card()}>
      <Card.Indicator>
        <Document size='md' />
      </Card.Indicator>

      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='md'>
            {t('card.title')}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {missing.length === 0 ?
              t('card.descriptionComplete')
            : t('card.descriptionPending', { count: items.length })}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      <Card.Body className={body()}>
        <DocumentCards requestId={requestId} items={items} />
      </Card.Body>
    </Card>
  );
};

export { BaseDocumentsStep, type BaseDocumentsStepProps };
