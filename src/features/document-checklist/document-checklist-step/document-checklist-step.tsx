'use client';

import type { DocumentCategory } from '@/server/api';

import { useCurrentStep } from '@/shared/request/use-current-step';

import { ConfirmBlock } from '../confirm-block';
import { DeclarationsBlock } from '../declarations-block';
import { DocumentsBlock } from '../documents-block';

interface DocumentChecklistStepProps {
  requestId: string;
}

const CATEGORY_BY_BLOCK = {
  'legal-documents': 'legal',
  'representatives-documents': 'representatives',
  'board-documents': 'board',
  'shareholders-documents': 'shareholders',
  'fiduciary-documents': 'fiduciaries',
  'financial-documents': 'financial',
  'regulatory-documents': 'regulatory',
} as const satisfies Record<string, DocumentCategory>;

/**
 * Step 6, "Documents": the review of the captured data (`confirm`), one block
 * per document group (the company, each role of the registered people,
 * financial, regulatory) and the declarations, told apart by `?block=`.
 */
const DocumentChecklistStep = ({
  requestId,
}: Readonly<DocumentChecklistStepProps>) => {
  const { block } = useCurrentStep();

  switch (block) {
    case 'legal-documents':
    case 'representatives-documents':
    case 'board-documents':
    case 'shareholders-documents':
    case 'fiduciary-documents':
    case 'financial-documents':
    case 'regulatory-documents': {
      return (
        <DocumentsBlock
          requestId={requestId}
          // eslint-disable-next-line security/detect-object-injection -- `block` is a closed union here
          category={CATEGORY_BY_BLOCK[block]}
        />
      );
    }
    case 'document-declarations': {
      return <DeclarationsBlock requestId={requestId} />;
    }
    default: {
      return <ConfirmBlock requestId={requestId} />;
    }
  }
};

export { DocumentChecklistStep, type DocumentChecklistStepProps };
