'use client';

import { HelpPopover } from './help-popover';
import { HelpTrigger } from './help-trigger';

interface HelpButtonProps {
  /** Without a request (`/new`) there is nothing to attach an inquiry to: only the button shows. */
  requestId?: string;
}

/** Help trigger of the footer: a popover to ask the officer without leaving the screen. */
const HelpButton = ({ requestId }: Readonly<HelpButtonProps>) =>
  requestId === undefined ?
    <HelpTrigger />
  : <HelpPopover requestId={requestId} />;

export { HelpButton, type HelpButtonProps };
