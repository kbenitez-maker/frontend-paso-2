'use client';

import { useQuery } from '@tanstack/react-query';

import { accountRequestQuery } from '@/server/api';

import { ProfileForm } from './profile-form';

interface ProfileStepProps {
  requestId: string;
}

/**
 * The profiling of a request that already exists (POC perfil, reached with
 * "Back" from the base documents): the company is verified, so its
 * identification is fixed and the base data can still change.
 */
const ProfileStep = ({ requestId }: Readonly<ProfileStepProps>) => {
  const { data: request } = useQuery(accountRequestQuery(requestId));
  const country = request?.profile?.country;

  if (!request?.profiling || country === undefined) return null;

  return (
    <ProfileForm
      requestId={requestId}
      bankId={request.bank_id}
      country={country}
      profiling={request.profiling}
    />
  );
};

export { ProfileStep, type ProfileStepProps };
