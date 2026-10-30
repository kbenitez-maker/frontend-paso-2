import { RelatedPartiesStep } from '@/features/related-parties';

interface RelatedPartiesPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const RelatedPartiesPage = async ({
  params,
}: Readonly<RelatedPartiesPageProps>) => {
  const { requestId } = await params;

  return <RelatedPartiesStep requestId={requestId} />;
};

export default RelatedPartiesPage;
