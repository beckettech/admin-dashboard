import { AuthGuard } from '@/components/AuthGuard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { LeadsPage } from '@/components/LeadsPage';

export default function Leads() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <LeadsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
