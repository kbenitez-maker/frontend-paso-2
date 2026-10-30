/// <reference types="vitest" />

import { configure } from '@testing-library/react';

import '@lafise/onyx-vitest/setup';

// ponytail: async queries wait 3s instead of 1s; form tests render the whole
// registry-driven block and time out on loaded CI machines with the default.
configure({ asyncUtilTimeout: 3000 });

// jsdom has no Web Animations API; the Onyx tab indicator awaits it when the selected tab changes.
// Node-environment suites have no DOM at all.
if (typeof Element !== 'undefined') Element.prototype.getAnimations = () => [];

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Node suites omit window (Sonar S7741)
if (globalThis.window !== undefined) {
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
