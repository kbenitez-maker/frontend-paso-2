import { useState } from 'react';
import { usePathname } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { Divider } from '@lafise/onyx-ui/layout/divider';
import { Popover, PopoverTrigger } from '@lafise/onyx-ui/overlays/popover';

import { isStepSlug } from '@/lib/constants/steps';
import { inquiriesQuery } from '@/server/api';

import { HelpTrigger } from './help-trigger';
import { InquiryForm } from './inquiry-form';
import { InquiryHistory } from './inquiry-history';
import { helpButtonTheme } from './themes';

const { panel } = helpButtonTheme();

interface HelpPopoverProps {
  requestId: string;
}

/**
 * Opens over the same screen, so what is typed in the form is never lost. The
 * step the applicant asks from is set by the system, not typed.
 */
const HelpPopover = ({ requestId }: Readonly<HelpPopoverProps>) => {
  const slug = usePathname().split('/').at(-1);
  const [draft, setDraft] = useState('');
  const { data: inquiries = [] } = useQuery({
    ...inquiriesQuery(requestId),
    throwOnError: false,
  });

  return (
    <PopoverTrigger>
      <HelpTrigger />
      <Popover className={panel()}>
        {inquiries.length === 0 ? null : (
          <>
            <InquiryHistory inquiries={inquiries} />
            <Divider />
          </>
        )}
        <InquiryForm
          requestId={requestId}
          step={isStepSlug(slug) ? slug : null}
          hasHistory={inquiries.length > 0}
          draft={draft}
          onDraftChange={setDraft}
        />
      </Popover>
    </PopoverTrigger>
  );
};

export { HelpPopover };
