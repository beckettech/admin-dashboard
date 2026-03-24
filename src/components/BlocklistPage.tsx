'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BLOCKLIST_API = 'https://fastflow.bek-tech.com/api/twilio/blocklist';

interface BlockedCaller {
  phone: string;
  reason: string;
  blocked_at: string;
}

export function BlocklistPage() {
  const [blocked, setBlocked] = useState<BlockedCaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(BLOCKLIST_API);
      const d = await r.json();
      setBlocked(d.blocked || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const blockNumber = async () => {
    if (!phone) return;
    setSaving(true);
    try {
      const r = await fetch(BLOCKLIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, reason: reason || 'Manually blocked' }),
      });
      const d = await r.json();
      if (d.ok) { flash(`✅ Blocked ${phone}`); setPhone(''); setReason(''); await load(); }
      else flash(`❌ ${d.error}`);
    } catch (e) { flash(`❌ ${e}`); }
    setSaving(false);
  };

  const unblock = async (p: string) => {
    try {
      const r = await fetch(BLOCKLIST_API, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p }),
      });
      const d = await r.json();
      if (d.ok) { flash(`✅ Unblocked ${p}`); await load(); }
    } catch (e) { flash(`❌ ${e}`); }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Call Blocklist</h1>
        <p className="text-slate-400 text-sm mt-1">Blocked numbers get an instant busy signal</p>
      </div>

      {msg && <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Block a Number</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="+12395551234" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <Button onClick={blockNumber} disabled={!phone || saving} className="w-full bg-red-600 hover:bg-red-700">
            🚫 Block Number
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Blocked Numbers ({blocked.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-slate-400 text-sm">Loading...</p>
          : blocked.length === 0 ? <p className="text-slate-400 text-sm">No blocked numbers.</p>
          : (
            <div className="space-y-2">
              {blocked.map(b => (
                <div key={b.phone} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <div className="font-mono text-sm text-white">{b.phone}</div>
                    <div className="text-xs text-slate-400">{b.reason} · {new Date(b.blocked_at).toLocaleDateString()}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => unblock(b.phone)} className="text-green-400 hover:text-green-300 text-xs">
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
