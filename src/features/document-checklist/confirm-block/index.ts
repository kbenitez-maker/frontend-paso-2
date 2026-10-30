import { ConfirmBlockRoot } from './confirm-block';
import { ConfirmFields } from './confirm-fields';
import { SignerCard } from './signer-card';

/** Review block: `<ConfirmBlock />` renders both cards; its parts read the review from context. */
const ConfirmBlock = Object.assign(ConfirmBlockRoot, {
  Fields: ConfirmFields,
  Signer: SignerCard,
});

export { ConfirmBlock };
export type { ConfirmBlockProps } from './confirm-block';
