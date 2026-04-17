'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  demo_viewed_at?: string | null;
  demo_url?: string | null;
  contacts?: string; // JSON string of contacts array
}

export function FollowUpPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [sending, setSending] = useState(false);
  
  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = () => {
    fetch('/api/leads').then((r) => r.json()).then((d) => {
      const allLeads = Array.isArray(d) ? d : [];
      // Filter to only opened or used leads
      const followUpLeads = allLeads.filter((l: Lead) => l.status === 'opened' || l.status === 'used');
      setLeads(followUpLeads);
      setLoading(false);
    });
  };

  // Helper to get best email from contacts (skip bounced)
  const getBestEmail = (lead: Lead): string => {
    try {
      const contacts = JSON.parse(lead.contacts || '[]');
      // Find first non-bounced email
      const validContact = contacts.find((c: { email?: string; bounce_status?: string }) => 
        c.email && c.bounce_status !== 'bounced'
      );
      return validContact?.email || lead.email || '';
    } catch {
      return lead.email || '';
    }
  };

  const sendFollowUp = async (lead: Lead) => {
    setSending(true);
    // Use manually edited email if set, otherwise get best email from contacts
    const targetEmail = editEmail || getBestEmail(lead);
    const targetName = editName || lead.owner_name;
    const firstName = (targetName?.split(' ')[0] || 'there');
    const isSWFL = lead.city?.toLowerCase().includes('cape') ||
                    lead.city?.toLowerCase().includes('fort myers') ||
                    lead.city?.toLowerCase().includes('naples') ||
                    lead.city?.toLowerCase().includes('bonita') ||
                    lead.city?.toLowerCase().includes('estero') ||
                    lead.city?.toLowerCase().includes('lehigh');

    const promoHtml = isSWFL ? `<div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:12px 16px;margin:16px 0;"><p style="margin:0;font-size:15px;">🎁 <strong>New SWFL Local Deal</strong>: Use code <code style="background:#dcfce7;padding:2px 8px;border-radius:4px;font-weight:bold;">SWFL50</code> for 50% off every month!</p></div>` : '';

    const subject = `Quick follow-up on your ${lead.business_name} demo`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.7;max-width:600px;">
      <p>Hi ${firstName},</p>
      <p>Just wanted to follow up on the demo I sent over for ${lead.business_name}. Hope you got a chance to take a look!</p>
      ${isSWFL ? promoHtml : '<p>Any questions or want to see how this would work for your specific setup? Just reply and let me know.</p>'}
      ${isSWFL ? '<p>Any questions? Just reply and let me know!</p>' : ''}
      <p>Best,<br><strong>Beck Hoefling</strong></p>
    </div>
    <div style="margin-top:16px;"><a href="https://fastflow.bek-tech.com"><img src="https://fastflow.bek-tech.com/logo_large.png" alt="FastFlow" width="58" height="58" style="display:block;"></a><b><span style="font-size:16px;">FastFlow | <a href="https://fastflow.bek-tech.com" style="color:#2563eb;text-decoration:none;">fastflow.bek-tech.com</a> | (239) 946-1776</span></b></div>`;

    const promoText = isSWFL ? '\n\n🎁 New SWFL Local Deal: Use code SWFL50 for 50% off every month!' : '';
    const text = `Hi ${firstName},\n\nJust wanted to follow up on the demo I sent over for ${lead.business_name}. Hope you got a chance to take a look!${promoText}\n\nAny questions or want to see how this would work for your specific setup? Just reply and let me know.\n\nBest,\nBeck Hoefling`;

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          toName: targetName,
          subject,
          html,
          text
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update status to followed_up
        await fetch(`/api/leads/${lead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'followed_up' })
        });
        fetchLeads();
      } else if (data.bounced) {
        alert(`❌ Email bounced: ${data.reason}`);
      } else {
        alert(`❌ Failed: ${data.error}`);
      }
    } catch (e) {
      alert(`❌ Error: ${e}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Follow Up</h1>
        {leads.length > 0 && (
          <span className="bg-purple-500 text-xs px-2 py-1 rounded-full text-white">{leads.length}</span>
        )}
      </div>

      <p className="text-sm text-slate-400">Leads that opened or used their demo - send a quick follow-up!</p>

      {leads.length === 0 ? (
        <div className="bg-slate-800/50 rounded-lg p-8 text-center text-slate-400">
          <p className="text-4xl mb-4">📭</p>
          <p>No leads to follow up with yet.</p>
          <p className="text-sm mt-2">When leads view or interact with their demo, they'll appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const firstName = (lead.owner_name?.split(' ')[0] || 'there');
            const isSWFL = lead.city?.toLowerCase().includes('cape') ||
                            lead.city?.toLowerCase().includes('fort myers') ||
                            lead.city?.toLowerCase().includes('naples') ||
                            lead.city?.toLowerCase().includes('bonita') ||
                            lead.city?.toLowerCase().includes('estero') ||
                            lead.city?.toLowerCase().includes('lehigh');
            const promoHtml = isSWFL ? `<div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:12px 16px;margin:16px 0;"><p style="margin:0;font-size:15px;">🎁 <strong>New SWFL Local Deal</strong>: Use code <code style="background:#dcfce7;padding:2px 8px;border-radius:4px;font-weight:bold;">SWFL50</code> for 50% off every month!</p></div>` : '';
            const previewHtml = `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.7;max-width:600px;">
              <p>Hi ${firstName},</p>
              <p>Just wanted to follow up on the demo I sent over for ${lead.business_name}. Hope you got a chance to take a look!</p>
              ${isSWFL ? promoHtml : '<p>Any questions or want to see how this would work for your specific setup? Just reply and let me know.</p>'}
              ${isSWFL ? '<p>Any questions? Just reply and let me know!</p>' : ''}
              <p>Best,<br><strong>Beck Hoefling</strong></p>
            </div>
            <div style="margin-top:16px;"><img src="https://fastflow.bek-tech.com/logo_large.png" alt="FastFlow" width="58" height="58" style="display:block;"></div>`;

            return (
              <div key={lead.id} className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{lead.business_name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {lead.email} {lead.city && `• ${lead.city}`}
                    </div>
                    <div className="text-xs text-purple-400 mt-1 flex items-center gap-2">
                      <span>{lead.status === 'opened' ? '👁️ Opened' : '✅ Used'}</span>
                      {lead.demo_viewed_at && (
                        <span>• {new Date(lead.demo_viewed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={() => setFollowUpLead(lead)}
                      variant="outline"
                      className="h-9 px-3 text-sm border-purple-500 text-purple-400 hover:bg-purple-500/10"
                    >
                      Preview
                    </Button>
                    <Button
                      onClick={() => sendFollowUp(lead)}
                      className="h-9 px-3 text-sm bg-purple-600 hover:bg-purple-700"
                      disabled={!lead.email}
                    >
                      Send
                    </Button>
                  </div>
                </div>

                {/* Inline Preview */}
                {followUpLead?.id === lead.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    {/* Editable fields */}
                    <div className="bg-slate-900/50 rounded-lg p-3 mb-3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-slate-500 text-xs w-16">Name:</span>
                        <input
                          type="text"
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                          defaultValue={lead.owner_name || ''}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Contact name"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-slate-500 text-xs w-16">Email:</span>
                        <input
                          type="email"
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
                          defaultValue={getBestEmail(lead)}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="email@example.com"
                        />
                        {getBestEmail(lead) !== lead.email && (
                          <span className="text-xs text-green-400">✓ Best email</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Subject: Quick follow-up on your {lead.business_name} demo
                      </div>
                      {isSWFL && <div className="text-green-400 text-xs">🎁 SWFL promo included (SWFL50 for 50% off)</div>}
                    </div>
                    <div
                      className="border border-slate-700 rounded-lg p-4 bg-white text-black text-sm max-h-64 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                    <div className="flex gap-2 justify-end mt-3">
                      <Button variant="outline" size="sm" onClick={() => { setFollowUpLead(null); setEditName(''); setEditEmail(''); }}>Cancel</Button>
                      <Button
                        size="sm"
                        onClick={() => { sendFollowUp(lead); setFollowUpLead(null); setEditName(''); setEditEmail(''); }}
                        disabled={sending || !getBestEmail(lead)}
                      >
                        {sending ? 'Sending...' : 'Send Follow-Up'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
