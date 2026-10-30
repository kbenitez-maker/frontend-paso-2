'use client';

import type { DocumentCategory } from '@/server/api';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Card } from '@lafise/onyx-ui/data-display/card';

import { DocumentCards } from '@/features/base-documents';
import { documentChecklistQuery } from '@/server/api';
import { useRegisterStepGate } from '@/shared/request/step-gate';

import { documentsBlockTheme } from './themes';

const { card, header, headline, description, body } = documentsBlockTheme();

interface DocumentsBlockProps {
  requestId: string;
  category: DocumentCategory;
}

/**
 * One group of the documents that close the form for the request's country
 * and legal entity type. "Continue" opens once every required document of the
 * group has a file; the profiling ones count as delivered and items without a
 * category count as legal.
 */
const DocumentsBlock = ({
  requestId,
  category,
}: Readonly<DocumentsBlockProps>) => {
  const t = useTranslations('DocumentChecklist.documents');
  const { data: checklist } = useQuery(
    documentChecklistQuery(requestId, 'checklist'),
  );

  const items = (checklist?.items ?? []).filter(
    (item) => (item.category ?? 'legal') === category,
  );
  const loaded = items.filter(
    (item) => item.from_profile === true || item.files.length > 0,
  );
  const missing = items.filter(
    (item) =>
      item.required && item.from_profile !== true && item.files.length === 0,
  );

  useRegisterStepGate({
    canContinue: checklist !== undefined && missing.length === 0,
    isPending: false,
    // Nothing to save: files are stored as they change.
    onContinue: () => Promise.resolve(true),
  });

  if (checklist === undefined) return null;

  return (
    <Card className={card()}>
      <Card.Header className={header()}>
        <Card.Headline className={headline()}>
          <Card.Title level={1} size='md'>
            {t(`categories.${category}`)}
          </Card.Title>
          <Card.Description size='md' className={description()}>
            {t('loaded', { loaded: loaded.length, total: items.length })}
          </Card.Description>
        </Card.Headline>
      </Card.Header>

      <Card.Body className={body()}>
        <DocumentCards requestId={requestId} items={items} />
      </Card.Body>
    </Card>
  );
};

export { DocumentsBlock, type DocumentsBlockProps };
