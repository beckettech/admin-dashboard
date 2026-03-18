import { AuthGuard } from '@/components/AuthGuard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TemplatesPage } from '@/components/TemplatesPage';

export default function Templates() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <TemplatesPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
