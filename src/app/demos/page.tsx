import { AuthGuard } from '@/components/AuthGuard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DemosPage } from '@/components/DemosPage';

export default function Demos() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <DemosPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
