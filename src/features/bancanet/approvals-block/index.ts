import { ApprovalsBlockRoot } from './approvals-block';
import { ApproverField } from './approver-field';

/** Approvals card: `<ApprovalsBlock />` renders the fields, `ApprovalsBlock.Approver` is the approver select. */
const ApprovalsBlock = Object.assign(ApprovalsBlockRoot, {
  Approver: ApproverField,
});

export { ApprovalsBlock };
