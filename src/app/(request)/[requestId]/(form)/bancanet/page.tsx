import { BancanetStep } from '@/features/bancanet';

interface BancanetPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const BancanetPage = async ({ params }: Readonly<BancanetPageProps>) => {
  const { requestId } = await params;

  return <BancanetStep requestId={requestId} />;
};

export default BancanetPage;
