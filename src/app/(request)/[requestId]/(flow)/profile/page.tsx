import { redirect } from 'next/navigation';

import { ProfileStep } from '@/features/profile';
import { getServerAuthSession } from '@/lib/auth/server-auth-session';
import { routes } from '@/lib/routes';
import { getAccountRequest } from '@/server/api';

interface ProfilePageProps {
  params: Promise<{ requestId: string }>;
}

/**
 * The request layout already validated `requestId`. A request out of the
 * applicant's hands has no profile to change (the POC only reaches it while
 * filling): it goes to its submitted screen, like `/{requestId}`.
 */
const ProfilePage = async ({ params }: Readonly<ProfilePageProps>) => {
  const { requestId } = await params;
  const { accessToken } = await getServerAuthSession();
  const { data: request, error } = await getAccountRequest(
    requestId,
    accessToken,
  );
  if (error) throw error;
  if (!request.editable) return redirect(routes.submitted(requestId));

  return <ProfileStep requestId={requestId} />;
};

export default ProfilePage;
