/** Browser diagnostic. The payload is limited to fields that are not KYC. */
interface ClientFailure {
  message: string;
  bankId?: string;
  block?: string;
  code?: string;
  status?: number;
}

const reportClientFailure = ({
  message,
  bankId,
  block,
  code,
  status,
}: ClientFailure): void => {
  const details: {
    bankId?: string;
    block?: string;
    code?: string;
    status?: number;
  } = {};
  if (bankId !== undefined) details.bankId = bankId;
  if (block !== undefined) details.block = block;
  if (code !== undefined) details.code = code;
  if (status !== undefined) details.status = status;
  console.error(message, details);
};

export { reportClientFailure };
