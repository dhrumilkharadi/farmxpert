import { setRequestLocale } from 'next-intl/server';

import { HowItWorksPage } from '@/components/marketing/pages';

export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HowItWorksPage />;
}
