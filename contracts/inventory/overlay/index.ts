import type { Overlay } from '../schema';

import { bancanetOverlay } from './bancanet';
import { companyOverlay } from './company';
import { economicActivityOverlay } from './economic-activity';
import { referencesAccountsOverlay } from './references-accounts';
import { relatedPartiesOverlay } from './related-parties';

/** Only tabs with an overlay are generated; one overlay per step. */
const overlays: Overlay[] = [
  companyOverlay,
  economicActivityOverlay,
  relatedPartiesOverlay,
  referencesAccountsOverlay,
  bancanetOverlay,
];

export { overlays };
