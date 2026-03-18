'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Customer {
  id: string;
  stripe_customer_id: string;
  email: string;
  name: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  lead_business_name: string | null;
  created_at: string;
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-slate-400 mt-1">Synced from Stripe</p>
        </div>
        <Button variant="outline" onClick={() => window.open('https://dashboard.stripe.com/customers', '_blank')}>
          Open Stripe Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-slate-400">No customers synced yet.</p>
              <p className="text-sm text-slate-500">Customers will appear here after Stripe webhook integration.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name || '-'}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        {customer.subscription_plan ? (
                          <Badge variant="secondary">{customer.subscription_plan}</Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={customer.subscription_status} />
                      </TableCell>
                      <TableCell>
                        {customer.lead_business_name || <span className="text-slate-500">-</span>}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-500">-</span>;
  
  const styles: Record<string, string> = {
    active: 'bg-green-500/20 text-green-300',
    trialing: 'bg-blue-500/20 text-blue-300',
    past_due: 'bg-red-500/20 text-red-300',
    canceled: 'bg-slate-500/20 text-slate-300',
    incomplete: 'bg-yellow-500/20 text-yellow-300',
  };

  return (
    <Badge className={styles[status] || 'bg-slate-500/20'}>
      {status}
    </Badge>
  );
}
