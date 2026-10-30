import type { ReactNode } from 'react';

import { NewRequestFooter } from '@/shared/request/new-request-footer';
import { RequestLayout } from '@/shared/request/request-layout';
import { StepGateProvider } from '@/shared/request/step-gate';

import { newLayoutTheme } from './themes';

interface NewLayoutProps {
  children: ReactNode;
}

/** Header carries only logo and exit: the screen's title lives in its card. */
const NewLayout = ({ children }: Readonly<NewLayoutProps>) => (
  <StepGateProvider>
    <RequestLayout footer={<NewRequestFooter />}>
      <div className={newLayoutTheme()}>{children}</div>
    </RequestLayout>
  </StepGateProvider>
);

export default NewLayout;
