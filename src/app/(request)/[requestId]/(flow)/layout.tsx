import type { ReactNode } from 'react';

import { FlowFooter } from '@/shared/request/flow-footer';
import { RequestLayout } from '@/shared/request/request-layout';
import { StepGateProvider } from '@/shared/request/step-gate';

import { flowLayoutTheme } from './themes';

interface FlowLayoutProps {
  children: ReactNode;
  params: Promise<{ requestId: string }>;
}

/**
 * Profile, base documents, survey and submitted: header only, no step rail.
 * Each screen sets the width of its own card.
 */
const FlowLayout = async ({ children, params }: Readonly<FlowLayoutProps>) => {
  const { requestId } = await params;

  return (
    <StepGateProvider>
      <RequestLayout footer={<FlowFooter requestId={requestId} />}>
        <div className={flowLayoutTheme()}>{children}</div>
      </RequestLayout>
    </StepGateProvider>
  );
};

export default FlowLayout;
