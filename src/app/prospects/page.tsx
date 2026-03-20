import { AuthGuard } from '@/components/AuthGuard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProspectsPage } from '@/components/ProspectsPage';

export default function Page() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <ProspectsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
