import { BaseDocumentsStep } from '@/features/base-documents';

interface BaseDocumentsPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const BaseDocumentsPage = async ({
  params,
}: Readonly<BaseDocumentsPageProps>) => {
  const { requestId } = await params;

  return <BaseDocumentsStep requestId={requestId} />;
};

export default BaseDocumentsPage;
