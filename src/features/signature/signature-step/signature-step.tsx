import { BankDocumentsBlock } from '../bank-documents-block';

interface SignatureStepProps {
  requestId: string;
}

/** Step 7, "Signature": the bank documents the applicant signs and returns. */
const SignatureStep = ({ requestId }: Readonly<SignatureStepProps>) => (
  <BankDocumentsBlock requestId={requestId} />
);

export { SignatureStep, type SignatureStepProps };
