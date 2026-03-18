'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Stats {
  total: number;
  byType: { demo_type: string; count: string }[];
  recent: { date: string; count: string }[];
}

interface LeadStats {
  byStatus: { status: string; count: string }[];
}

export function DashboardStats() {
  const [demoStats, setDemoStats] = useState<Stats | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/demos?stats=true').then((r) => r.json()),
      fetch('/api/leads?stats=true').then((r) => r.json()),
    ])
      .then(([demos, leads]) => {
        setDemoStats(demos);
        setLeadStats(leads);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalLeads = leadStats?.byStatus.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Big stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-5">
          <p className="text-sm text-blue-100">Demo Views</p>
          <p className="text-4xl font-bold mt-1">{demoStats?.total || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl p-5">
          <p className="text-sm text-purple-100">Total Leads</p>
          <p className="text-4xl font-bold mt-1">{totalLeads}</p>
        </div>
      </div>

      {/* Quick actions - large buttons */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-300">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3">
          <Button 
            onClick={() => window.location.href = '/leads'}
            className="h-16 text-lg justify-start px-6 bg-blue-600 hover:bg-blue-700"
          >
            <span className="text-2xl mr-4">📊</span>
            <span>View Pipeline</span>
          </Button>
          <Button 
            onClick={() => window.location.href = '/templates'}
            className="h-16 text-lg justify-start px-6 bg-slate-700 hover:bg-slate-600"
          >
            <span className="text-2xl mr-4">📧</span>
            <span>Email Templates</span>
          </Button>
        </div>
      </div>

      {/* Pipeline breakdown */}
      <div className="bg-slate-900 rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Pipeline Overview</h2>
        <div className="space-y-3">
          {leadStats?.byStatus.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusDot status={item.status} />
                <span className="text-slate-300 capitalize">{item.status.replace('_', ' ')}</span>
              </div>
              <span className="text-xl font-bold">{item.count}</span>
            </div>
          ))}
          {(!leadStats?.byStatus.length) && (
            <p className="text-slate-500 text-center py-6">No leads yet</p>
          )}
        </div>
      </div>

      {/* Recent views */}
      <div className="bg-slate-900 rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Views by Type</h2>
        <div className="space-y-3">
          {demoStats?.byType.map((item) => (
            <div key={item.demo_type} className="flex items-center justify-between">
              <span className="text-slate-300">{item.demo_type}</span>
              <span className="text-xl font-bold">{item.count}</span>
            </div>
          ))}
          {(!demoStats?.byType.length) && (
            <p className="text-slate-500 text-center py-6">No views yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    created: 'bg-slate-400',
    sent: 'bg-blue-400',
    opened: 'bg-purple-400',
    used: 'bg-orange-400',
    followed_up: 'bg-green-400',
    not_interested: 'bg-red-400',
    sold: 'bg-emerald-400',
    found: 'bg-slate-400',
    building: 'bg-amber-400',
    draft: 'bg-orange-400',
    approved: 'bg-green-400',
    pitched: 'bg-blue-400',
    responded: 'bg-purple-400',
    closed: 'bg-emerald-400',
    passed: 'bg-red-400',
    archived: 'bg-slate-500',
  };
  
  return (
    <div className={`w-3 h-3 rounded-full ${colors[status] || 'bg-slate-400'}`} />
  );
}
