'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const PIPELINE_STAGES = [
  { id: 'created', label: 'Demo Created', color: 'bg-slate-500' },
  { id: 'sent', label: 'Demo Sent', color: 'bg-blue-500' },
  { id: 'opened', label: 'Demo Opened', color: 'bg-purple-500' },
  { id: 'used', label: 'Demo Used', color: 'bg-orange-500' },
  { id: 'followed_up', label: 'Followed Up', color: 'bg-green-500' },
  { id: 'not_interested', label: 'Not Interested', color: 'bg-red-500' },
  { id: 'sold', label: 'Sold! 🎉', color: 'bg-emerald-500' },
];

// Map old statuses to new pipeline stages
const STATUS_MAP: Record<string, string> = {
  'found': 'created',
  'building': 'created',
  'draft': 'created',
  'approved': 'sent',
  'pitched': 'opened',
  'responded': 'followed_up',
  'closed': 'sold',
  'passed': 'not_interested',
  'archived': 'not_interested',
};

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetch('/api/leads').then((r) => r.json()).then((d) => {
      setLeads(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const normalizeStatus = (status: string) => STATUS_MAP[status] || status;

  const handleCreate = async (formData: FormData) => {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: formData.get('business_name')?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-') || Date.now().toString(),
        business_name: formData.get('business_name'),
        owner_name: formData.get('owner_name') || null,
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        city: formData.get('city') || null,
        status: 'created',
      }),
    });
    setShowAddDialog(false);
    fetch('/api/leads').then((r) => r.json()).then((d) => setLeads(Array.isArray(d) ? d : []));
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetch('/api/leads').then((r) => r.json()).then((d) => setLeads(Array.isArray(d) ? d : []));
    setSelectedLead(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    fetch('/api/leads').then((r) => r.json()).then((d) => setLeads(Array.isArray(d) ? d : []));
    setSelectedLead(null);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const lines = importText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const leadsToImport = lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '', inQ = false;
        for (const c of line) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { values.push(current.trim()); current = ''; } else current += c; }
        values.push(current.trim());
        const lead: Record<string, string> = {};
        headers.forEach((h, i) => {
          const v = values[i] || '';
          if (h.includes('business')) lead.business_name = v;
          else if (h.includes('contact')) lead.owner_name = v;
          else if (h.includes('email')) lead.email = v;
          else if (h.includes('phone')) lead.phone = v;
          else if (h.includes('demo')) { const m = v.match(/demo\/([a-f0-9-]+)/); if (m) lead.lead_id = m[1]; }
        });
        return lead;
      }).filter(l => l.business_name);
      if (!leadsToImport.length) { alert('No leads'); return; }
      const res = await fetch('/api/leads/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads: leadsToImport }) });
      const r = await res.json();
      alert(`${r.imported} imported, ${r.skipped} skipped`);
      setImportText(''); setShowImportDialog(false);
      fetch('/api/leads').then((r2) => r2.json()).then((d) => setLeads(Array.isArray(d) ? d : []));
    } catch { alert('Failed'); }
    finally { setImporting(false); }
  };

  const demoLink = (lead: Lead) => `https://fastflow.bek-tech.com/api/demo?lead=${lead.id}&business=${encodeURIComponent(lead.business_name)}&type=webchat`;

  const getLeadsByStage = (stage: string) => leads.filter(l => normalizeStatus(l.status) === stage);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)} className="h-10 px-4 text-sm">Import</Button>
          <Button onClick={() => setShowAddDialog(true)} className="h-10 px-4 text-sm">+ Add</Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 min-w-max">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.id} className="w-72 shrink-0">
              <div className={`${stage.color} rounded-t-xl px-4 py-2 flex items-center justify-between`}>
                <span className="font-medium text-sm text-white">{stage.label}</span>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{getLeadsByStage(stage.id).length}</span>
              </div>
              <div className="bg-slate-900/50 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                {getLeadsByStage(stage.id).map((lead) => (
                  <div 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <div className="font-medium text-sm truncate">{lead.business_name}</div>
                    {lead.city && <div className="text-xs text-slate-400 mt-1">{lead.city}</div>}
                    <div className="flex gap-1 mt-2">
                      {lead.phone && <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 bg-slate-700 rounded">📞</a>}
                      {lead.email && <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 bg-slate-700 rounded">✉️</a>}
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(demoLink(lead)); alert('Copied!'); }} className="text-xs px-2 py-1 bg-slate-700 rounded">🔗</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{selectedLead?.business_name}</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                {selectedLead.owner_name && <p><span className="text-slate-400">Contact:</span> {selectedLead.owner_name}</p>}
                {selectedLead.email && <p><span className="text-slate-400">Email:</span> {selectedLead.email}</p>}
                {selectedLead.phone && <p><span className="text-slate-400">Phone:</span> {selectedLead.phone}</p>}
                {selectedLead.city && <p><span className="text-slate-400">City:</span> {selectedLead.city}</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">Move to:</p>
                <div className="grid grid-cols-2 gap-2">
                  {PIPELINE_STAGES.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleUpdateStatus(selectedLead.id, stage.id)}
                      className={`h-10 rounded-lg text-sm font-medium ${normalizeStatus(selectedLead.status) === stage.id ? stage.color + ' text-white' : 'bg-slate-800 text-slate-300'}`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(demoLink(selectedLead)); alert('Copied!'); }}>Copy Demo Link</Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedLead.id)}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={() => setShowAddDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <div><Label>Business Name *</Label><Input name="business_name" required className="h-10" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Contact</Label><Input name="owner_name" className="h-10" /></div>
              <div><Label>City</Label><Input name="city" className="h-10" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Email</Label><Input name="email" className="h-10" /></div>
              <div><Label>Phone</Label><Input name="phone" className="h-10" /></div>
            </div>
            <Button className="w-full h-10">Create</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={() => setShowImportDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import from BotMockups</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste CSV..." className="min-h-[100px] font-mono text-xs" />
            <Button onClick={handleImport} disabled={importing || !importText.trim()} className="w-full h-10">{importing ? 'Importing...' : 'Import'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
