'use client';

import { Users } from '@/components/admin/AdminConsole';
import { useApi } from '@/hooks/useApi';

export default function AccountsPage() {
  // the currency the analytics endpoint reports costs in
  const { data } = useApi('/admin/analytics?days=1');
  return <Users currency={data?.currency || 'USD'} />;
}
