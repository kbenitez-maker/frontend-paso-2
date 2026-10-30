'use client';

import { ClassifiedErrorPage } from '@/shared/error/classified-error-page';

interface ErrorPageProps {
  error: Error & { digest?: string };
}

const ErrorPage = ({ error }: ErrorPageProps) => {
  return <ClassifiedErrorPage error={error} />;
};

export default ErrorPage;
