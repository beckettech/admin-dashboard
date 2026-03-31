'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LeadContact {
  name: string | null;
  email: string | null;
  phone: string | null;
  primary?: boolean;
}

interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  website: string | null;
  status: string;
  call_status?: string | null;
  called_at?: string | null;
  notes: string | null;
  created_at: string;
  demo_url?: string | null;
  channel?: string | null;
  contacts?: LeadContact[] | null;
  demo_viewed_at?: string | null;
  niche?: string | null;
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

const CALL_STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'human': { label: 'Has Coverage', color: 'text-green-400', icon: '✅' },
  'no_answer': { label: 'No Answer 🎯', color: 'text-orange-400', icon: '🎯' },
  'calling': { label: 'Calling...', color: 'text-blue-400', icon: '📞' },
  'failed': { label: 'Failed', color: 'text-red-400', icon: '❌' },
};

function getDemoTypeLabel(channel?: string | null): string {
  if (!channel) return 'Web Chat';
  const c = channel.toLowerCase();
  if (c.includes('voice') || c.includes('inbound') || c.includes('outbound')) return 'Voice';
  if (c.includes('facebook') || c.includes('instagram') || c.includes('social') || c.includes('organic') || c.includes('lead ads')) return 'Social';
  if (c.includes('sms') || c.includes('text')) return 'SMS';
  return 'Web Chat';
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calling, setCalling] = useState(false);
  const [callResults, setCallResults] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNoAnswerOnly, setShowNoAnswerOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'calls'>('pipeline');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = () => {
    fetch('/api/leads').then((r) => r.json()).then((d) => {
      setLeads(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  const normalizeStatus = (status: string) => STATUS_MAP[status] || status;

  const getCallStatusLabel = (callStatus?: string | null) => {
    if (!callStatus) return null;
    return CALL_STATUS_LABELS[callStatus] || { label: callStatus, color: 'text-slate-400', icon: '?' };
  };

  const calledLeads = leads.filter(l => l.call_status && l.call_status !== 'uncalled');
  const uncalledLeads = leads.filter(l => !l.call_status || l.call_status === 'uncalled');
  const noAnswerCount = leads.filter(l => l.call_status === 'no_answer').length;

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
        niche: formData.get('niche') || null,
        status: 'created',
      }),
    });
    setShowAddDialog(false);
    fetchLeads();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchLeads();
    setSelectedLead(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    fetchLeads();
    setSelectedLead(null);
  };

  const handleImport = async () => {
    const file = selectedFile || (importText.trim() ? new File([importText], 'import.csv', { type: 'text/csv' }) : null);
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const leadsToImport = lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '', inQ = false;
        for (const c of line) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { values.push(current.trim()); current = ''; } else current += c; }
        values.push(current.trim());
        const lead: Record<string, string> = {};
        headers.forEach((h, i) => {
          const v = values[i] || '';
          const headerLower = h.toLowerCase();
          if (headerLower.includes('business')) lead.business_name = v;
          else if (headerLower === 'contact name' || headerLower === 'contact_name' || (headerLower.includes('contact') && headerLower.includes('name'))) lead.owner_name = v;
          else if (headerLower === 'contact email' || headerLower === 'contact_email' || (headerLower.includes('contact') && headerLower.includes('email'))) lead.email = v;
          else if (headerLower.includes('email') && !headerLower.includes('contact')) lead.email = v;
          else if (headerLower.includes('phone')) lead.phone = v;
          else if (headerLower === 'channel') lead.channel = v;
          else if (headerLower.includes('demo url') || headerLower === 'demo_url' || headerLower === 'demo url') {
            if (v && v.includes('/demo/')) {
              lead.demo_url = v;
              const m = v.match(/\/demo\/([a-f0-9-]{36})/);
              if (m) lead.lead_id = m[1];
            }
          }
          else if (headerLower === 'embed code' || headerLower.includes('embed')) { /* skip embed column */ }
        });
        return lead;
      }).filter(l => l.business_name);
      if (!leadsToImport.length) { alert('No leads found in CSV'); return; }
      const res = await fetch('/api/leads/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leads: leadsToImport }) });
      const r = await res.json();
      let message = `✅ ${r.imported} imported`;
      if (r.updated) message += `, ${r.updated} updated`;
      if (r.merged) message += ` (${r.merged} total)`;
      alert(message);
      setImportText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowImportDialog(false);
      fetchLeads();
    } catch (e) { alert('Failed to import CSV. Check the file format.'); }
    finally { setImporting(false); }
  };

  const handleAfterHoursCall = async (testPhone?: string) => {
    setCalling(true);
    setCallResults(null);
    try {
      const res = await fetch('/api/calls/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPhone ? { testPhone } : {}),
      });
      const data = await res.json();
      setCallResults(data);
      if (!testPhone) {
        setTimeout(() => fetchLeads(), 2000);
      }
    } catch (error) {
      setCallResults({ error: String(error) });
    } finally {
      setCalling(false);
    }
  };

  const channelToType = (channel?: string | null) => {
    const c = (channel || '').toLowerCase();
    if (c.includes('voice')) return 'voice';
    if (c.includes('lead ad') || c.includes('leadad')) return 'lead_ads';
    if (c.includes('organic')) return 'organic';
    if (c.includes('facebook') || c.includes('instagram') || c.includes('social')) return 'social';
    if (c.includes('sms') || c.includes('text')) return 'sms';
    return 'webchat';
  };
  const demoLink = (lead: Lead) => {
    const type = channelToType(lead.channel);
    const params = new URLSearchParams({ lead: lead.id, business: lead.business_name, type });
    if (lead.website) params.set('website', lead.website);
    return `https://fastflow.bek-tech.com/api/demo?${params.toString()}`;
  };

  const getLeadsByStage = (stage: string) => {
    let filtered = leads.filter(l => normalizeStatus(l.status) === stage);
    if (showNoAnswerOnly) {
      filtered = filtered.filter(l => l.call_status === 'no_answer');
    }
    return filtered;
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 text-sm font-medium rounded-t ${activeTab === 'pipeline' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2 text-sm font-medium rounded-t flex items-center gap-2 ${activeTab === 'calls' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Call Log {calledLeads.length > 0 && <span className="bg-blue-500 text-xs px-1.5 rounded">{calledLeads.length}</span>}
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{activeTab === 'pipeline' ? 'Demos' : 'Call Log'}</h1>
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'pipeline' && noAnswerCount > 0 && (
            <Button 
              variant={showNoAnswerOnly ? 'default' : 'outline'}
              onClick={() => setShowNoAnswerOnly(!showNoAnswerOnly)}
              className="h-10 px-4 text-sm"
            >
              🎯 No Answer Targets ({noAnswerCount})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowCallDialog(true)} className="h-10 px-4 text-sm">📞 After-Hours Check</Button>
          {activeTab === 'pipeline' && (
            <>
              <Button variant="outline" onClick={() => setShowImportDialog(true)} className="h-10 px-4 text-sm">Import</Button>
              <Button onClick={() => setShowAddDialog(true)} className="h-10 px-4 text-sm">+ Add</Button>
            </>
          )}
        </div>
      </div>

      {/* Call Log Tab */}
      {activeTab === 'calls' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">{leads.filter(l => l.call_status === 'no_answer').length}</div>
              <div className="text-xs text-slate-400">No Answer 🎯</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">{leads.filter(l => l.call_status === 'human').length}</div>
              <div className="text-xs text-slate-400">Has Coverage ✅</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-400">{uncalledLeads.length}</div>
              <div className="text-xs text-slate-400">Not Called Yet</div>
            </div>
          </div>

          {/* Called Leads List */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Call Results</h2>
            {calledLeads.length === 0 ? (
              <div className="bg-slate-800/50 rounded-lg p-8 text-center text-slate-400">
                <p>No calls made yet.</p>
                <p className="text-sm mt-2">Click "📞 After-Hours Check" to start calling leads.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {calledLeads.map((lead) => {
                  const callInfo = getCallStatusLabel(lead.call_status);
                  return (
                    <div 
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{lead.business_name}</div>
                        <div className="text-xs text-slate-400">{lead.phone} {lead.city && `• ${lead.city}`}</div>
                      </div>
                      <div className="text-right">
                        {callInfo && (
                          <div className={`text-sm font-medium ${callInfo.color}`}>
                            {callInfo.icon} {callInfo.label}
                          </div>
                        )}
                        {lead.called_at && (
                          <div className="text-xs text-slate-500">
                            {new Date(lead.called_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {activeTab === 'pipeline' && (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="w-72 shrink-0">
                <div className={`${stage.color} rounded-t-xl px-4 py-2 flex items-center justify-between`}>
                  <span className="font-medium text-sm text-white">{stage.label}</span>
                  <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{getLeadsByStage(stage.id).length}</span>
                </div>
                <div className="bg-slate-900/50 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                  {getLeadsByStage(stage.id).map((lead) => {
                    const callInfo = getCallStatusLabel(lead.call_status);
                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="bg-slate-800 rounded-lg p-3 cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <div className="font-medium text-sm truncate">{lead.business_name}</div>
                        {lead.niche && <div className="text-xs text-blue-400 mt-1 capitalize">🏷️ {lead.niche}</div>}
                        {lead.city && <div className="text-xs text-slate-400 mt-1">{lead.city}</div>}
                        {callInfo && (
                          <div className={`text-xs mt-1 ${callInfo.color}`}>
                            {callInfo.icon} {callInfo.label}
                          </div>
                        )}
                        <div className="flex gap-1 mt-2">
                          {lead.phone && <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 bg-slate-700 rounded">📞</a>}
                          {lead.email && <a href={`mailto:${lead.email}`} onClick={(e) => e.stopPropagation()} className="text-xs px-2 py-1 bg-slate-700 rounded">✉️</a>}
                          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(demoLink(lead)); alert('Copied!'); }} className="text-xs px-2 py-1 bg-slate-700 rounded">🔗</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedLead?.business_name}</DialogTitle></DialogHeader>
          {selectedLead && (() => {
            // Parse contacts
            let contacts: LeadContact[] = [];
            try { contacts = typeof selectedLead.contacts === 'string' ? JSON.parse(selectedLead.contacts) : (selectedLead.contacts || []); } catch { contacts = []; }
            // Merge primary fields into contacts if not already there
            if (contacts.length === 0 && (selectedLead.owner_name || selectedLead.email)) {
              contacts = [{ name: selectedLead.owner_name, email: selectedLead.email, phone: selectedLead.phone, primary: true }];
            }
            const callInfo = getCallStatusLabel(selectedLead.call_status);
            return (
              <div className="space-y-4">
                {/* Business info */}
                <div className="bg-slate-800/50 rounded-lg p-3 text-sm space-y-1">
                  {selectedLead.niche && <p><span className="text-slate-400">Niche:</span> <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full text-xs capitalize">{selectedLead.niche}</span></p>}
                  {selectedLead.phone && <p><span className="text-slate-400">Phone:</span> <a href={`tel:${selectedLead.phone}`} className="text-blue-400">{selectedLead.phone}</a></p>}
                  {selectedLead.website && <p><span className="text-slate-400">Website:</span> <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 truncate">{selectedLead.website}</a></p>}
                  {selectedLead.city && <p><span className="text-slate-400">City:</span> {selectedLead.city}</p>}
                  {selectedLead.channel && <p><span className="text-slate-400">Channel:</span> {selectedLead.channel}</p>}
                  {selectedLead.demo_url && <p><span className="text-slate-400">Demo:</span> <a href={selectedLead.demo_url} target="_blank" rel="noopener noreferrer" className="text-blue-400">View Demo →</a></p>}
                  {selectedLead.demo_viewed_at && <p><span className="text-slate-400">Demo Viewed:</span> {new Date(selectedLead.demo_viewed_at).toLocaleDateString()}</p>}
                  {callInfo && <p><span className="text-slate-400">Call:</span> <span className={callInfo.color}>{callInfo.icon} {callInfo.label}</span>{selectedLead.called_at ? ` · ${new Date(selectedLead.called_at).toLocaleDateString()}` : ''}</p>}
                  {selectedLead.notes && <p><span className="text-slate-400">Notes:</span> {selectedLead.notes}</p>}
                </div>

                {/* Contacts */}
                {contacts.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Contacts</p>
                    <div className="space-y-2">
                      {contacts.map((c, i) => (
                        <div key={i} className="bg-slate-800 rounded-lg p-3 text-sm flex items-start justify-between">
                          <div className="space-y-0.5">
                            {c.name && <p className="font-medium">{c.name}{c.primary && contacts.length > 1 ? <span className="text-xs text-slate-500 ml-1">(primary)</span> : ''}</p>}
                            {c.email && <p className="text-blue-400"><a href={`mailto:${c.email}`}>{c.email}</a></p>}
                            {c.phone && <p className="text-slate-400">{c.phone}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            {c.email && <a href={`mailto:${c.email}`} className="text-xs px-2 py-1 bg-slate-700 rounded">✉️</a>}
                            {c.phone && <a href={`tel:${c.phone}`} className="text-xs px-2 py-1 bg-slate-700 rounded">📞</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Move to stage */}
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
                  <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(selectedLead.demo_url || demoLink(selectedLead)); alert('Copied!'); }}>Copy Demo Link</Button>
                  <Button variant="destructive" onClick={() => handleDelete(selectedLead.id)}>Delete</Button>
                </div>
              </div>
            );
          })()}
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
            <div>
              <Label>Niche</Label>
              <select name="niche" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 h-10 text-sm text-white">
                <option value="">Auto-detect</option>
                <option value="hvac">HVAC</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="roofing">Roofing</option>
                <option value="dental">Dental</option>
                <option value="restaurant">Restaurant</option>
                <option value="salon">Salon / Spa</option>
                <option value="realestate">Real Estate</option>
              </select>
            </div>
            <Button className="w-full h-10">Create</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={() => setShowImportDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Demos CSV</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Upload CSV File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setImportText('');
                  }
                }}
                className="h-12 cursor-pointer"
              />
              {selectedFile && <p className="text-sm text-slate-400 mt-1">Selected: {selectedFile.name}</p>}
            </div>
            <Button onClick={handleImport} disabled={importing || (!selectedFile && !importText.trim())} className="w-full h-12">{importing ? 'Importing...' : 'Import'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* After-Hours Call Dialog */}
      <Dialog open={showCallDialog} onOpenChange={() => setShowCallDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>📞 After-Hours Call Check</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Calls leads to detect if they have after-hours coverage. Silent detection only - no messages left.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{uncalledLeads.filter(l => l.phone).length}</div>
                <div className="text-xs text-slate-400">Leads to Call</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-orange-400">{noAnswerCount}</div>
                <div className="text-xs text-slate-400">No Answer Targets</div>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-300 space-y-1">
                <span className="block">✅ Human answers → "Has Coverage" (not a target)</span>
                <span className="block">🎯 Voicemail or No Answer → "No Answer Target" (potential customer)</span>
              </p>
            </div>

            {/* Test Call */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => handleAfterHoursCall('+12394109645')}
              disabled={calling}
            >
              🧪 Test Call (My Phone: +12394109645)
            </Button>

            {/* Run Batch */}
            <Button 
              onClick={() => handleAfterHoursCall()}
              disabled={calling || uncalledLeads.filter(l => l.phone).length === 0}
              className="w-full h-10"
            >
              {calling ? 'Calling...' : `📞 Call ${uncalledLeads.filter(l => l.phone).length} Leads`}
            </Button>

            {/* Results */}
            {callResults && (
              <div className="bg-slate-800 rounded-lg p-3 text-sm">
                {callResults.error ? (
                  <p className="text-red-400">{callResults.error}</p>
                ) : (
                  <div>
                    <p className="text-green-400">✓ {callResults.message || `Called ${callResults.called} leads`}</p>
                    {callResults.callSid && (
                      <p className="text-xs text-slate-400 mt-1">Call SID: {callResults.callSid}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
