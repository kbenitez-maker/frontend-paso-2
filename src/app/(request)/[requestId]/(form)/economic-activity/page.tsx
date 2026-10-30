import { EconomicActivityStep } from '@/features/economic-activity';

interface EconomicActivityPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const EconomicActivityPage = async ({
  params,
}: Readonly<EconomicActivityPageProps>) => {
  const { requestId } = await params;

  return <EconomicActivityStep requestId={requestId} />;
};

export default EconomicActivityPage;
