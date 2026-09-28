import { setRequestLocale } from 'next-intl/server';

import { FeaturesPage } from '@/components/marketing/pages';

export default async function Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <FeaturesPage />;
}
