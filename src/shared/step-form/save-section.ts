import type { SectionKey } from '@/contracts';
import type { SaveMode } from '@/server/api';
import type { QueryClient } from '@tanstack/react-query';
import type { Values } from './block-values';

import { MutationObserver } from '@tanstack/react-query';

import { queryKeys } from '@/lib/constants/query-keys';
import { sectionMutation } from '@/server/api';

/**
 * Saves one section and keeps the caches honest: the section query now holds
 * what the server stored, and the rail's progress is reloaded. The mutation
 * is built per call because its URL depends on the section.
 */
const saveSection = async (
  client: QueryClient,
  requestId: string,
  section: SectionKey,
  mode: SaveMode,
  body: Values,
) => {
  const envelope = await new MutationObserver(
    client,
    sectionMutation<Values>(requestId, section, mode),
  ).mutate(body);

  client.setQueryData(
    queryKeys.accountRequests.section(requestId, section),
    envelope,
  );
  void client.invalidateQueries({
    queryKey: queryKeys.accountRequests.progress(requestId),
  });
  return envelope;
};

export { saveSection };
