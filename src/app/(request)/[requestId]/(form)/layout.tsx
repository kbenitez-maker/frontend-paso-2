import type { ReactNode } from 'react';

import { FormFooter } from '@/shared/request/form-footer';
import { FormSession } from '@/shared/request/form-session';
import { RequestLayout } from '@/shared/request/request-layout';
import { StepProgress } from '@/shared/request/step-progress';
import { StepRail } from '@/shared/request/step-rail';

import { formLayoutTheme } from './themes';

interface FormLayoutProps {
  children: ReactNode;
  params: Promise<{ requestId: string }>;
}

const FormLayout = async ({ children, params }: Readonly<FormLayoutProps>) => {
  const { requestId } = await params;

  return (
    <FormSession>
      <RequestLayout
        title={<StepProgress requestId={requestId} />}
        rail={<StepRail requestId={requestId} />}
        footer={<FormFooter requestId={requestId} />}
      >
        <div className={formLayoutTheme()}>{children}</div>
      </RequestLayout>
    </FormSession>
  );
};

export default FormLayout;
