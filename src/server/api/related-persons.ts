import type { CatalogRef } from '@/contracts/types';
import type { PersonType, RelatedPersonRole } from '@/types/domain';

import { APIVersion } from '@lafise/lde-web-lib';

import { requestFilterOf } from '@/contracts/catalogs';
import { queryKeys } from '@/lib/constants/query-keys';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/**
 * A person registered in the request, one per identification whatever the
 * sections they appear in. `id` is their identity (type and identification
 * number), which is what a step that designates them stores: never a copy of
 * their data (POC vinculos.ts).
 */
interface RelatedPerson {
  id: string;
  name: string;
  person_type: PersonType;
  roles: RelatedPersonRole[];
}

interface RelatedPersons {
  results: RelatedPerson[];
}

/** The people a request-scoped catalog lists (`source: 'request'`), filtered by its roles and person type. */
const relatedPersonsQuery = (requestId: string, catalog: CatalogRef) =>
  queryAdapter.query<RelatedPersons>({
    queryKey: queryKeys.accountRequests.relatedPersons(
      requestId,
      requestFilterOf(catalog),
    ),
    url: endpoints.accountRequests.relatedPersons(requestId),
    options: {
      apiVersion: APIVersion.V1,
      params: {
        ...(catalog.roles === undefined ?
          {}
        : { role: catalog.roles.join(',') }),
        ...(catalog.person_type === undefined ?
          {}
        : { person_type: catalog.person_type }),
      },
    },
  });

export { relatedPersonsQuery, type RelatedPerson, type RelatedPersons };
