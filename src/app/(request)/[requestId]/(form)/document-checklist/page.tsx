import { DocumentChecklistStep } from '@/features/document-checklist';

interface DocumentChecklistPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const DocumentChecklistPage = async ({
  params,
}: Readonly<DocumentChecklistPageProps>) => {
  const { requestId } = await params;

  return <DocumentChecklistStep requestId={requestId} />;
};

export default DocumentChecklistPage;
