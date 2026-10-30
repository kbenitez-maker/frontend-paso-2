import { SubmittedStep } from '@/features/submitted';

interface SubmittedPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const SubmittedPage = async ({ params }: Readonly<SubmittedPageProps>) => {
  const { requestId } = await params;

  return <SubmittedStep requestId={requestId} />;
};

export default SubmittedPage;
