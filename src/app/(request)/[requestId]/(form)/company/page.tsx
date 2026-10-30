import { CompanyStep } from '@/features/company';

interface CompanyPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const CompanyPage = async ({ params }: Readonly<CompanyPageProps>) => {
  const { requestId } = await params;

  return <CompanyStep requestId={requestId} />;
};

export default CompanyPage;
