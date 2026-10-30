import { BaseDataFields } from './base-data-fields';
import { ProfilingCardContext } from './context';
import { IdentificationField } from './identification-field';
import { ProfilingFrame } from './profiling-frame';

/**
 * The profiling card (POC perfil), shared by `/new` and the in-request
 * profile: `<ProfilingCard>` is the card; inside `ProfilingCard.Provider` its
 * fields read the bank, the country and the moment.
 */
const ProfilingCard = Object.assign(ProfilingFrame, {
  Provider: ProfilingCardContext,
  Identification: IdentificationField,
  BaseData: BaseDataFields,
});

export { ProfilingCard };
export type { Moment as ProfilingMoment } from './context';
export {
  bodyOf,
  identificationOf,
  profileSchema,
  schemaOf,
  type ProfileValues,
} from './lib/profile-schema';
