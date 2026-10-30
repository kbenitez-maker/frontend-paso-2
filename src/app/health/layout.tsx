'use client';

import type { ReactNode } from 'react';

import { Background } from '@lafise/lde-web-core';
import { Body } from '@lafise/onyx-ui/layout/app-shell/body';

import { healthLayoutTheme } from './themes';

const HealthLayout = ({ children }: { children: ReactNode }) => (
  <Body className={healthLayoutTheme()}>
    <Background.Home />
    {children}
  </Body>
);

export default HealthLayout;
