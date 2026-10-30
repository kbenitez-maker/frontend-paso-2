import { redirect } from 'next/navigation';

import { getServerAuthSession } from '@/lib/auth/server-auth-session';
import { routes } from '@/lib/routes';
import { getAccountRequest, getRequestProgress } from '@/server/api';
import { resumeTarget } from '@/shared/request/resume-target';

interface RequestPageProps {
  params: Promise<{ requestId: string }>;
}

/**
 * Resumes the request where the applicant left it: a request out of their
 * hands goes to its submitted screen, an editable one to the first block still
 * pending (the layout already validated the id and that the request exists).
 */
const RequestPage = async ({ params }: Readonly<RequestPageProps>) => {
  const { requestId } = await params;
  const { accessToken } = await getServerAuthSession();
  const { data: request, error } = await getAccountRequest(
    requestId,
    accessToken,
  );
  if (error) throw error;
  if (!request.editable) return redirect(routes.submitted(requestId));

  const progress = await getRequestProgress(requestId, accessToken);
  if (progress.error) throw progress.error;
  const { step, block } = resumeTarget(progress.data);

  return redirect(routes.step(requestId, step, { block }));
};

export default RequestPage;
