import { getServerAuthSession } from '@/lib/auth/server-auth-session';
import { redirectToExternal } from '@/lib/external-redirect';
import { routes } from '@/lib/routes';
import { getBanks } from '@/server/api';

import { findEnabledBank } from './lib/find-enabled-bank';

/**
 * Server-side gate of `/new`: the `?bank=` param must name an enabled bank,
 * otherwise the user goes back to the requests list (home zone).
 */
const loadNewRequestBank = async (param: unknown) => {
  const { accessToken } = await getServerAuthSession();
  const { data, error } = await getBanks(accessToken);
  if (error) throw error;

  const bank = findEnabledBank(param, data.results);
  return bank ?? redirectToExternal(routes.external.requests());
};

export { loadNewRequestBank };
