const PREVIEW_BANK = /^BL[A-Z]{2}$/u;

/** Bank from `?bank=` when it is an operating bank code. Ignored in production. */
const previewBankOf = (
  value: string | null | undefined,
): string | undefined => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- production builds must not switch the request by URL
  if (process.env.NODE_ENV === 'production') return undefined;
  const bank = value?.trim().toUpperCase() ?? '';
  return PREVIEW_BANK.test(bank) ? bank : undefined;
};

export { previewBankOf };
