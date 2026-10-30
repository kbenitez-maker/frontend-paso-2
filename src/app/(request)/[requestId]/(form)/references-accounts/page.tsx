import { ReferencesAccountsStep } from '@/features/references-accounts';

interface ReferencesAccountsPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const ReferencesAccountsPage = async ({
  params,
}: Readonly<ReferencesAccountsPageProps>) => {
  const { requestId } = await params;

  return <ReferencesAccountsStep requestId={requestId} />;
};

export default ReferencesAccountsPage;
