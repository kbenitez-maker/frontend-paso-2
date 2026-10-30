import type { BankId, CountryCode } from '@/types/domain';
import type { Page } from '@/types/page';

import { APIVersion } from '@lafise/lde-web-lib';

import { queryKeys } from '@/lib/constants/query-keys';
import { Http } from '@/lib/http';
import { queryAdapter } from '@/lib/query';

import { endpoints } from './endpoints';

/** A bank as the API returns it; `enabled: false` blocks new requests. */
interface BankDto {
  bank_id: BankId;
  /** `dxb_app.country.country_code` (ISO 3166-1 alpha-3, e.g. `NIC`). */
  country: string;
  name: string;
  /** Registered name of the bank entity, as the declarations cite it (e.g. "Banco LAFISE BANCENTRO, S.A."). */
  legal_name: string;
  enabled: boolean;
}

/** A bank a request can be opened for, with the zone country code. */
interface Bank extends Omit<BankDto, 'country'> {
  country: CountryCode;
}

const banksQuery = () =>
  queryAdapter.query<Page<BankDto>>({
    queryKey: queryKeys.banks.list(),
    url: endpoints.banks.list(),
    options: { apiVersion: APIVersion.V1 },
  });

/** Server-side read (Server Components); the browser uses `banksQuery`. */
const getBanks = (accessToken: string | null) =>
  Http.get<Page<BankDto>>(endpoints.banks.list(), {
    apiVersion: APIVersion.V1,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

export { banksQuery, getBanks, type Bank, type BankDto };
