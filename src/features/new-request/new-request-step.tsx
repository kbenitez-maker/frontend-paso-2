import type { Bank } from '@/server/api';

import { NewRequestBankProvider } from './new-request-bank';
import { ProfilingCard } from './profiling-card';

interface NewRequestStepProps {
  bank: Bank;
}

/** The bank stays fixed for the request; it is provided, never shown or editable here. */
const NewRequestStep = ({ bank }: Readonly<NewRequestStepProps>) => (
  <NewRequestBankProvider bank={bank}>
    <ProfilingCard />
  </NewRequestBankProvider>
);

export { NewRequestStep };
