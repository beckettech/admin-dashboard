import { AuthGuard } from '@/components/AuthGuard';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CustomersPage } from '@/components/CustomersPage';

export default function Customers() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <CustomersPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
