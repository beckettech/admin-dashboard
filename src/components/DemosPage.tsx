'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DemoView {
  id: number;
  lead_id: string;
  business_name: string;
  website: string;
  demo_type: string;
  viewed_at: string;
}

interface MergedDemo {
  lead_id: string;
  business_name: string;
  website: string;
  demo_type: string;
  view_count: number;
  last_viewed: string;
  first_viewed: string;
  view_ids: number[];
}

export function DemosPage() {
  const [views, setViews] = useState<DemoView[]>([]);
  const [merged, setMerged] = useState<MergedDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch('/api/demos?limit=100')
      .then((res) => res.json())
      .then((data) => {
        const allViews = Array.isArray(data) ? data : [];
        setViews(allViews);
        
        // Merge duplicates by lead_id
        const grouped = new Map<string, MergedDemo>();
        allViews.forEach((v: DemoView) => {
          const key = v.lead_id;
          if (!grouped.has(key)) {
            grouped.set(key, {
              lead_id: v.lead_id,
              business_name: v.business_name,
              website: v.website,
              demo_type: v.demo_type,
              view_count: 1,
              last_viewed: v.viewed_at,
              first_viewed: v.viewed_at,
              view_ids: [v.id],
            });
          } else {
            const existing = grouped.get(key)!;
            existing.view_count++;
            existing.view_ids.push(v.id);
            if (new Date(v.viewed_at) > new Date(existing.last_viewed)) {
              existing.last_viewed = v.viewed_at;
            }
            if (new Date(v.viewed_at) < new Date(existing.first_viewed)) {
              existing.first_viewed = v.viewed_at;
            }
          }
        });
        
        setMerged(Array.from(grouped.values()).sort((a, b) => 
          new Date(b.last_viewed).getTime() - new Date(a.last_viewed).getTime()
        ));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDeleteOne = async (id: number) => {
    if (!confirm('Delete this view?')) return;
    await fetch(`/api/demos/${id}`, { method: 'DELETE' });
    setViews(views.filter(v => v.id !== id));
    // Recalculate merged
    setMerged(merged.map(m => ({
      ...m,
      view_count: m.view_ids.includes(id) ? m.view_count - 1 : m.view_count,
      view_ids: m.view_ids.filter(vid => vid !== id),
    })).filter(m => m.view_count > 0));
  };

  const handleDeleteAll = async (viewIds: number[]) => {
    if (!confirm(`Delete all ${viewIds.length} views for this demo?`)) return;
    for (const id of viewIds) {
      await fetch(`/api/demos/${id}`, { method: 'DELETE' });
    }
    setViews(views.filter(v => !viewIds.includes(v.id)));
    setMerged(merged.filter(m => !viewIds.includes(m.view_ids[0])));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const displayList = showAll ? views : merged;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demos</h1>
          <p className="text-slate-400 text-sm">{merged.length} unique • {views.length} total views</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="h-10"
        >
          {showAll ? 'Show Merged' : 'Show All'}
        </Button>
      </div>

      {/* Views list */}
      <div className="space-y-3">
        {showAll ? (
          // Show all individual views
          views.map((view) => (
            <div 
              key={view.id}
              className="bg-slate-900 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{view.business_name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{formatDate(view.viewed_at)}</p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {view.demo_type}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://fastflow.bek-tech.com/api/demo?lead=${view.lead_id}&business=${encodeURIComponent(view.business_name)}&website=${encodeURIComponent(view.website || '')}&type=${view.demo_type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-slate-800 rounded-xl text-slate-300 text-sm active:bg-slate-700"
                >
                  👁️ View
                </a>
                <button
                  onClick={() => handleDeleteOne(view.id)}
                  className="flex items-center justify-center gap-2 h-11 bg-slate-800 rounded-xl text-red-400 text-sm active:bg-slate-700"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          // Show merged/grouped views
          merged.map((demo) => (
            <div 
              key={demo.lead_id}
              className="bg-slate-900 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{demo.business_name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Last: {formatDate(demo.last_viewed)}
                    {demo.view_count > 1 && (
                      <span className="ml-2 text-blue-400">• {demo.view_count} views</span>
                    )}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {demo.demo_type}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://fastflow.bek-tech.com/api/demo?lead=${demo.lead_id}&business=${encodeURIComponent(demo.business_name)}&website=${encodeURIComponent(demo.website || '')}&type=${demo.demo_type}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-slate-800 rounded-xl text-slate-300 text-sm active:bg-slate-700"
                >
                  👁️ View Demo
                </a>
                <button
                  onClick={() => handleDeleteAll(demo.view_ids)}
                  className="flex items-center justify-center gap-2 h-11 bg-slate-800 rounded-xl text-red-400 text-sm active:bg-slate-700"
                >
                  🗑️ Delete All
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {displayList.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No demo views yet
        </div>
      )}
    </div>
  );
}
