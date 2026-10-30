import { SurveyStep } from '@/features/survey';

interface SurveyPageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const SurveyPage = async ({ params }: Readonly<SurveyPageProps>) => {
  const { requestId } = await params;

  return <SurveyStep requestId={requestId} />;
};

export default SurveyPage;
