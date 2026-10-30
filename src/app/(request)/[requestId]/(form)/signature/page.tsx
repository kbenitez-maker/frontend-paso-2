import { SignatureStep } from '@/features/signature';

interface SignaturePageProps {
  params: Promise<{ requestId: string }>;
}

/** The request layout already validated `requestId`. */
const SignaturePage = async ({ params }: Readonly<SignaturePageProps>) => {
  const { requestId } = await params;

  return <SignatureStep requestId={requestId} />;
};

export default SignaturePage;
