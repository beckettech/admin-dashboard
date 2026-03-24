import { AuthGuard } from '@/components/AuthGuard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BlocklistPage } from '@/components/BlocklistPage';

export default function Page() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <BlocklistPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
