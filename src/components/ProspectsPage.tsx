'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Prospect {
  id: string;
  company_name: string;
  website: string | null;
  niche: string | null;
  location: string | null;
  rating: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  call_status: string | null;
  call_result: string | null;
  call_transcript: string | null;
  called_at: string | null;
  scheduled_call_time: string | null;
  notes: string | null;
}

const CALL_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  uncalled: { label: 'Not Called', color: 'text-slate-400', icon: '⬜' },
  calling: { label: 'Calling...', color: 'text-blue-400', icon: '📞' },
  human: { label: 'Answered', color: 'text-green-400', icon: '✅' },
  voicemail: { label: 'Voicemail', color: 'text-orange-400', icon: '📲' },
  no_answer: { label: 'No Answer', color: 'text-yellow-400', icon: '📵' },
  failed: { label: 'Failed', color: 'text-red-400', icon: '❌' },
};

interface CallLog {
  id: string;
  prospect_id: string | null;
  company_name: string;
  phone: string;
  call_status: string;
  call_result: string | null;
  call_transcript: string | null;
  called_at: string;
}

export function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showCallLogs, setShowCallLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showDetail, setShowDetail] = useState<Prospect | null>(null);
  const [showSchedule, setShowSchedule] = useState<Prospect | null>(null);
  const [showScheduleAll, setShowScheduleAll] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleAllTime, setScheduleAllTime] = useState('');
  const [filter, setFilter] = useState<'all' | 'uncalled' | 'voicemail' | 'human'>('all');
  const [queueRunning, setQueueRunning] = useState(false);
  const [callLog, setCallLog] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const scheduledTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Load call log from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('prospect_call_log');
    if (saved) setCallLog(JSON.parse(saved));
  }, []);

  // Save call log to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('prospect_call_log', JSON.stringify(callLog));
  }, [callLog]);

  useEffect(() => {
    setup();
    return () => { scheduledTimers.current.forEach(t => clearTimeout(t)); };
  }, []);

  const setup = async () => {
    await fetch('/api/prospects/setup');
    await fetch('/api/setup-call-logs');
    fetchProspects();
    fetchCallLogs();
  };

  const fetchProspects = async () => {
    const res = await fetch('/api/prospects');
    const data = await res.json();
    setProspects(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const fetchCallLogs = async () => {
    const res = await fetch('/api/call-logs');
    const data = await res.json();
    setCallLogs(Array.isArray(data) ? data : []);
  };

  const normalizePhone = (raw: string): string => {
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return '+1' + digits.slice(1);
    if (digits.length === 10) return '+1' + digits;
    return '';
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split('\n');

    const parsed = lines.slice(1).map(line => {
      const allValues = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const phoneRegex = /^(\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
      let phone = '';
      for (const v of allValues) {
        const cleaned = v.replace(/[^\d+]/g, '');
        if (phoneRegex.test(v.trim())) { phone = normalizePhone(v); break; }
        if (/^\d{10,11}$/.test(cleaned)) { phone = normalizePhone(cleaned); break; }
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = allValues.find(v => emailRegex.test(v)) || '';
      const websiteRegex = /^https?:\/\//;
      const websites = allValues.filter(v => websiteRegex.test(v));
      const website = websites.find(v => !v.includes('supabase') && !v.includes('googleusercontent')) || '';
      const logoUrl = websites.find(v => v.includes('supabase') || v.includes('googleusercontent') || v.includes('.png') || v.includes('.jpg')) || '';
      const nicheKeywords = ['Contractor', 'Service', 'Conditioning', 'Heating', 'Cooling', 'HVAC'];
      const niche = allValues.find(v => nicheKeywords.some(k => v.includes(k))) || '';
      const ratingVal = allValues.find(v => /\d\.\d\s*stars?/i.test(v) || /\d\s*stars?/i.test(v)) || '';
      const locationVal = allValues.filter(v => /\bFL\b/.test(v)).join(', ') || '';
      const company_name = allValues[0] || '';
      return { company_name, website, niche, location: locationVal, rating: ratingVal, contact: '', email, phone, logo_url: logoUrl };
    }).filter(p => p.company_name && p.company_name !== 'Company Name');

    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospects: parsed }),
    });
    const result = await res.json();
    alert(`✅ Imported ${result.imported}, skipped ${result.skipped} duplicates`);
    setShowImport(false);
    if (fileRef.current) fileRef.current.value = '';
    fetchProspects();
  };

  const callProspect = async (prospect: Prospect) => {
    if (!prospect.phone) { alert('No phone number'); return; }
    setCalling(prospect.id);
    setCallLog(prev => [`📞 Calling ${prospect.company_name} (${prospect.phone})...`, ...prev]);
    try {
      const res = await fetch('/api/prospects/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId: prospect.id, phone: prospect.phone, companyName: prospect.company_name }),
      });
      const data = await res.json();
      if (!data.success) {
        setCallLog(prev => [`❌ Failed: ${prospect.company_name} — ${data.error}`, ...prev]);
        setCalling(null);
        return null;
      }

      // Poll every 3s until status changes from 'calling' (max 60s)
      return await new Promise<string | null>((resolve) => {
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const r = await fetch('/api/prospects');
            const all = await r.json();
            const updated: Prospect = (Array.isArray(all) ? all : []).find((p: Prospect) => p.id === prospect.id);
            if (updated) setProspects(Array.isArray(all) ? all : []);
            if (updated && updated.call_status && updated.call_status !== 'calling') {
              clearInterval(poll);
              setCalling(p => p === prospect.id ? null : p);
              setCallLog(prev => [`✓ Done: ${prospect.company_name} — ${updated.call_status}`, ...prev]);
              resolve(updated.call_status);
            } else if (attempts >= 20) { // 60s max
              clearInterval(poll);
              setCalling(p => p === prospect.id ? null : p);
              setCallLog(prev => [`✓ Done: ${prospect.company_name}`, ...prev]);
              resolve(null);
            }
          } catch {
            if (attempts >= 20) { clearInterval(poll); setCalling(null); resolve(null); }
          }
        }, 3000);
      });
    } catch {
      setCallLog(prev => [`❌ Error calling ${prospect.company_name}`, ...prev]);
      setCalling(null);
      return null;
    }
  };

  const runQueueNow = async () => {
    const uncalled = prospects.filter(p => p.phone && (!p.call_status || p.call_status === 'uncalled'));
    if (!uncalled.length) { alert('No uncalled prospects with phone numbers'); return; }
    setQueueRunning(true);
    setCallLog([`🚀 Starting batch: ${uncalled.length} prospects...`]);
    for (const p of uncalled) {
      await callProspect(p);
      // 2s gap between calls
      await new Promise(r => setTimeout(r, 2000));
    }
    setQueueRunning(false);
    setCallLog(prev => ['✅ Batch complete!', ...prev]);
    fetchProspects();
  };

  const scheduleAll = () => {
    if (!scheduleAllTime) return;
    const startTime = new Date(scheduleAllTime).getTime();
    const uncalled = prospects.filter(p => p.phone && (!p.call_status || p.call_status === 'uncalled'));
    if (!uncalled.length) { alert('No uncalled prospects'); return; }

    // Schedule each with 30s gap
    uncalled.forEach(async (p, i) => {
      const callAt = new Date(startTime + i * 30000).toISOString();
      await fetch(`/api/prospects/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_call_time: callAt }),
      });

      const delayMs = startTime + i * 30000 - Date.now();
      if (delayMs > 0) {
        const t = setTimeout(async () => {
          setCallLog(prev => [`⏰ Scheduled call: ${p.company_name}`, ...prev]);
          await callProspect(p);
        }, delayMs);
        scheduledTimers.current.push(t);
      }
    });

    setCallLog([`🗓 Scheduled ${uncalled.length} calls starting at ${new Date(startTime).toLocaleTimeString()}`]);
    setShowScheduleAll(false);
    setScheduleAllTime('');
    fetchProspects();
    alert(`✅ ${uncalled.length} calls scheduled starting at ${new Date(startTime).toLocaleTimeString()}`);
  };

  const scheduleOne = async () => {
    if (!showSchedule || !scheduleTime) return;
    const callAt = new Date(scheduleTime).toISOString();
    await fetch(`/api/prospects/${showSchedule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_call_time: callAt }),
    });
    // Set timer for this call
    const delayMs = new Date(callAt).getTime() - Date.now();
    if (delayMs > 0) {
      const p = showSchedule;
      const t = setTimeout(async () => {
        setCallLog(prev => [`⏰ Scheduled call: ${p.company_name}`, ...prev]);
        await callProspect(p);
        fetchProspects();
      }, delayMs);
      scheduledTimers.current.push(t);
    }
    setShowSchedule(null);
    setScheduleTime('');
    fetchProspects();
  };

  const deletePerspect = async (id: string) => {
    await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
    fetchProspects();
  };

  const clearAll = async () => {
    if (!confirm('Delete ALL prospects?')) return;
    await fetch('/api/prospects/clear', { method: 'DELETE' });
    setProspects([]);
    setCallLog([]);
  };

  const resetStuckCalls = async () => {
    if (!confirm('Reset all prospects stuck in "calling" back to "uncalled"?')) return;
    await fetch('/api/prospects/reset', { method: 'POST' });
    fetchProspects();
    setCallLog(prev => ['🔄 Reset stuck calls', ...prev]);
  };

  const filteredProspects = prospects.filter(p => {
    if (filter === 'uncalled') return !p.call_status || p.call_status === 'uncalled';
    if (filter === 'voicemail') return p.call_status === 'voicemail';
    if (filter === 'human') return p.call_status === 'human';
    return true;
  });

  const stats = {
    total: prospects.length,
    uncalled: prospects.filter(p => !p.call_status || p.call_status === 'uncalled').length,
    voicemail: prospects.filter(p => p.call_status === 'voicemail').length,
    human: prospects.filter(p => p.call_status === 'human').length,
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{showCallLogs ? 'Call Logs' : 'Prospects'}</h1>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setShowCallLogs(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${!showCallLogs ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Prospects
            </button>
            <button
              onClick={() => setShowCallLogs(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${showCallLogs ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
            >
              Call Logs
            </button>
          </div>
        </div>
        {!showCallLogs && (
          <div className="flex gap-2 flex-wrap">
            {prospects.filter(p => p.call_status === 'calling').length > 0 && (
              <Button variant="outline" onClick={resetStuckCalls} className="h-9 text-sm text-yellow-400 border-yellow-900">🔄 Reset Stuck</Button>
            )}
            {prospects.length > 0 && (
              <Button variant="outline" onClick={clearAll} className="h-9 text-sm text-red-400 border-red-900">🗑 Clear All</Button>
            )}
            <Button variant="outline" onClick={() => setShowImport(true)} className="h-9 text-sm">📥 Import</Button>
            <Button variant="outline" onClick={() => setShowScheduleAll(true)} disabled={stats.uncalled === 0} className="h-9 text-sm">🗓 Schedule All</Button>
            <Button onClick={runQueueNow} disabled={queueRunning || stats.uncalled === 0} className="h-9 text-sm bg-blue-600 hover:bg-blue-500">
              {queueRunning ? '📞 Running...' : `📞 Call All (${stats.uncalled})`}
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', val: stats.total, color: '' },
          { label: 'Uncalled', val: stats.uncalled, color: 'text-slate-400' },
          { label: 'Voicemail', val: stats.voicemail, color: 'text-orange-400' },
          { label: 'Answered', val: stats.human, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 rounded-lg p-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'uncalled', 'voicemail', 'human'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          >
            {f === 'all' ? `All (${stats.total})` : f === 'uncalled' ? `Uncalled (${stats.uncalled})` : f === 'voicemail' ? `Voicemail 📲 (${stats.voicemail})` : `Answered ✅ (${stats.human})`}
          </button>
        ))}
      </div>

      {/* Call Log */}
      {callLog.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-3 max-h-28 overflow-y-auto">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-slate-500 font-medium">CALL LOG</p>
            <button onClick={() => setCallLog([])} className="text-xs text-slate-600 hover:text-slate-400">clear</button>
          </div>
          {callLog.map((log, i) => <p key={i} className="text-xs text-slate-300 font-mono">{log}</p>)}
        </div>
      )}

      {!showCallLogs ? (
        /* Prospects List */
        <div className="space-y-2">
          {filteredProspects.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-8 text-center text-slate-400">
              <p className="text-lg mb-2">No prospects yet</p>
              <p className="text-sm">Click "📥 Import" to upload your CSV</p>
            </div>
          ) : filteredProspects.map(p => {
            const status = CALL_STATUS[p.call_status || 'uncalled'] || CALL_STATUS.uncalled;
            return (
              <div
                key={p.id}
                onClick={() => setShowDetail(p)}
                className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700 active:bg-slate-600 transition-colors"
              >
                {p.logo_url ? (
                  <img src={p.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-700"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">🏢</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.company_name}</div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs ${status.color}`}>{status.icon} {status.label}</span>
                    {p.rating && <span className="text-xs text-slate-500">⭐ {p.rating}</span>}
                    {p.phone && <span className="text-xs text-slate-500">{p.phone}</span>}
                  </div>
                  {p.scheduled_call_time && (
                    <div className="text-xs text-blue-400 mt-0.5">🗓 {new Date(p.scheduled_call_time).toLocaleString()}</div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {p.phone && (
                    <button onClick={() => callProspect(p)} disabled={calling === p.id || queueRunning}
                      className={`p-2 rounded-lg text-sm ${calling === p.id ? 'bg-blue-600 animate-pulse' : 'bg-slate-700'}`}>
                      {calling === p.id ? '⏳' : '📞'}
                    </button>
                  )}
                  <button onClick={() => { setShowSchedule(p); setScheduleTime(''); }} className="p-2 bg-slate-700 rounded-lg text-sm">🗓</button>
                  <button onClick={() => deletePerspect(p.id)} className="p-2 bg-slate-700 rounded-lg text-sm text-red-400">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Call Logs */
        <div className="space-y-2">
          {callLogs.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg p-8 text-center text-slate-400">
              <p className="text-lg mb-2">No call logs yet</p>
              <p className="text-sm">Call some prospects to see the logs here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {callLogs.map(log => {
                const status = CALL_STATUS[log.call_status] || CALL_STATUS.uncalled;
                return (
                  <div key={log.id} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{log.company_name}</p>
                        <p className="text-xs text-slate-500">{log.phone}</p>
                      </div>
                      <p className="text-xs text-slate-500">{new Date(log.called_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium ${status.color}`}>{status.icon} {status.label}</span>
                      {log.call_result && <span className="text-xs text-slate-500">AMD: {log.call_result}</span>}
                    </div>
                    {log.call_transcript && (
                      <p className="text-xs text-slate-400 font-mono bg-slate-900 rounded p-2 mt-2 break-all">
                        {log.call_transcript}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={() => setShowImport(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Import Prospects CSV</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Supports: Company Name, Website, Niche, Location, Rating, Email, Phone, Logo URL</p>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileImport}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white cursor-pointer" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{showDetail?.company_name}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-2 text-sm">
              {showDetail.niche && <p><span className="text-slate-400">Type:</span> {showDetail.niche}</p>}
              {showDetail.location && <p><span className="text-slate-400">Location:</span> {showDetail.location}</p>}
              {showDetail.rating && <p><span className="text-slate-400">Rating:</span> ⭐ {showDetail.rating}</p>}
              {showDetail.phone && <p><span className="text-slate-400">Phone:</span> <a href={`tel:${showDetail.phone}`} className="text-blue-400">{showDetail.phone}</a></p>}
              {showDetail.email && <p><span className="text-slate-400">Email:</span> <a href={`mailto:${showDetail.email}`} className="text-blue-400">{showDetail.email}</a></p>}
              {showDetail.website && <p><span className="text-slate-400">Website:</span> <a href={showDetail.website} target="_blank" className="text-blue-400 break-all">Visit ↗</a></p>}
              {/* Manual status picker */}
              <div className="bg-slate-900 rounded-lg p-3 mt-2">
                <p className="font-medium mb-2 text-xs text-slate-400 uppercase">Set Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CALL_STATUS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={async () => {
                        await fetch(`/api/prospects/${showDetail.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ call_status: key }),
                        });
                        setShowDetail({ ...showDetail, call_status: key });
                        fetchProspects();
                      }}
                      className={`p-2 rounded-lg text-xs text-left transition-colors ${showDetail.call_status === key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {val.icon} {val.label}
                    </button>
                  ))}
                </div>
                {showDetail.called_at && <p className="text-xs text-slate-500 mt-2">Last called: {new Date(showDetail.called_at).toLocaleString()}</p>}
                {showDetail.call_result && <p className="text-xs text-slate-500">AMD: {showDetail.call_result}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                {showDetail.phone && <Button onClick={() => { callProspect(showDetail); setShowDetail(null); }} className="flex-1 h-9 text-sm">📞 Call Now</Button>}
                <Button variant="outline" onClick={() => { setShowSchedule(showDetail); setShowDetail(null); }} className="flex-1 h-9 text-sm">🗓 Schedule</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule One Dialog */}
      <Dialog open={!!showSchedule} onOpenChange={() => setShowSchedule(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Schedule Call — {showSchedule?.company_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Pick date & time to automatically call this prospect</p>
            <Input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="h-10" />
            <Button onClick={scheduleOne} disabled={!scheduleTime} className="w-full h-10">✅ Schedule Call</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule All Dialog */}
      <Dialog open={showScheduleAll} onOpenChange={() => setShowScheduleAll(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>🗓 Schedule All Calls</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Set a start time. All <strong>{stats.uncalled} uncalled prospects</strong> will be called in order, 30 seconds apart.
            </p>
            <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-300">
              <p>Total call time: ~{Math.ceil(stats.uncalled * 0.5)} minutes</p>
              <p className="mt-1">Each call: 20s max + 10s gap</p>
            </div>
            <Input type="datetime-local" value={scheduleAllTime} onChange={e => setScheduleAllTime(e.target.value)} className="h-10" />
            <Button onClick={scheduleAll} disabled={!scheduleAllTime} className="w-full h-10">🚀 Schedule {stats.uncalled} Calls</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
