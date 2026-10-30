import { loadNewRequestBank, NewRequestStep } from '@/features/new-request';

interface NewRequestPageProps {
  searchParams: Promise<{ bank?: string | string[] }>;
}

/** The bank (country) is picked in the requests list and arrives as `?bank=`. */
const NewRequestPage = async ({
  searchParams,
}: Readonly<NewRequestPageProps>) => {
  const { bank } = await searchParams;

  return <NewRequestStep bank={await loadNewRequestBank(bank)} />;
};

export default NewRequestPage;
