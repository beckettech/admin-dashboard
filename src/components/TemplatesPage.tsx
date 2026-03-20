'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Niche configs ────────────────────────────────────────────
const NICHES: Record<string, { label: string; industry: string; services: string[] }> = {
  hvac: {
    label: 'HVAC',
    industry: 'HVAC companies',
    services: ['answer calls, book jobs, handle after-hours inquiries', 'never lose a lead when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for maintenance, filters, etc.'],
  },
  plumbing: {
    label: 'Plumbing',
    industry: 'plumbing companies',
    services: ['answer calls, book jobs, handle after-hours inquiries', 'never lose a lead when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for inspections and maintenance'],
  },
  roofing: {
    label: 'Roofing',
    industry: 'roofing companies',
    services: ['answer calls, book inspections, handle storm season inquiries', 'never lose a lead when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for estimates and annual inspections'],
  },
  dental: {
    label: 'Dental',
    industry: 'dental practices',
    services: ['answer calls, book appointments, handle patient inquiries', 'never lose a patient when you front desk is busy', 'respond to social messages instantly', 'automated appointment reminders and follow-ups'],
  },
  restaurant: {
    label: 'Restaurant',
    industry: 'restaurants',
    services: ['answer calls, take reservations, handle menu questions', 'never miss a reservation or catering inquiry', 'respond to social messages instantly', 'automated review requests and loyalty follow-ups'],
  },
  salon: {
    label: 'Salon / Spa',
    industry: 'salons and spas',
    services: ['answer calls, book appointments, handle service questions', 'never lose a booking when you\'re with a client', 'respond to social messages instantly', 'automated appointment reminders and rebooking follow-ups'],
  },
  realestate: {
    label: 'Real Estate',
    industry: 'real estate agencies',
    services: ['answer calls, schedule showings, handle listing inquiries', 'never miss a buyer or seller lead', 'respond to social messages instantly', 'automated follow-ups for open houses and listings'],
  },
  electrical: {
    label: 'Electrical',
    industry: 'electrical contractors',
    services: ['answer calls, book jobs, handle after-hours emergencies', 'never lose a lead when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for inspections and panel upgrades'],
  },
};

// ─── Demo types ───────────────────────────────────────────────
const DEMO_TYPES = [
  { value: 'webchat', label: 'Webchat Demo' },
  { value: 'voice', label: 'Voice Agent Demo' },
  { value: 'sms', label: 'SMS / Text-Back Demo' },
  { value: 'social', label: 'Social DM Demo' },
];

// ─── Template builder ─────────────────────────────────────────
function buildEmail(p: {
  firstName: string;
  business: string;
  demoLink: string;
  niche: string;
  demoType: string;
  isLocal: boolean;
  missedCall: boolean;
}) {
  const niche = NICHES[p.niche] || NICHES.hvac;
  const demoLabel = DEMO_TYPES.find(d => d.value === p.demoType)?.label || 'Demo';
  const localLine = p.isLocal ? ' I\'m a SWFL local (Cape Coral).' : '';
  const missedCallLine = p.missedCall ? '\n\nSomeone mentioned that your business doesn\'t always answer calls after hours — this is exactly what we solve with after hours answering. Never lose a lead again!' : '';
  const introText = p.isLocal
    ? `My name is Beck.${localLine} My company FastFlow helps businesses like yours capture more leads and save time with AI-powered automation.`
    : `My name is Beck and my company FastFlow helps businesses like yours capture more leads and save time with AI-powered automation.`;

  // All possible upsell items — exclude the current demo type
  const ALL_OFFERS: Record<string, { label: string; plain: string; html: string }> = {
    voice: { label: 'AI voice agents', plain: `answer calls, book jobs, handle after-hours inquiries`, html: `answer calls, book jobs, handle after-hours inquiries` },
    missed: { label: 'Missed call text-back', plain: `never lose a lead when you can't pick up`, html: `never lose a lead when you can't pick up` },
    social: { label: 'Facebook & Instagram DM automation', plain: `respond to social messages instantly`, html: `respond to social messages instantly` },
    reminders: { label: 'Reorder & checkup reminders', plain: `automated follow-ups for maintenance, filters, etc.`, html: `automated follow-ups for maintenance, filters, etc.` },
    webchat: { label: 'AI webchat', plain: `answer questions and capture leads on your website 24/7`, html: `answer questions and capture leads on your website 24/7` },
    sms: { label: 'SMS / text-back automation', plain: `instant replies to missed calls and inbound texts`, html: `instant replies to missed calls and inbound texts` },
  };

  // Build upsell list: always show 4 items, exclude the current demo type
  const upsellOrder = p.demoType === 'voice'
    ? ['missed', 'social', 'webchat', 'reminders']
    : p.demoType === 'social'
    ? ['voice', 'missed', 'webchat', 'reminders']
    : p.demoType === 'sms'
    ? ['voice', 'social', 'webchat', 'reminders']
    : /* webchat default */ ['voice', 'missed', 'social', 'reminders'];

  const upsellItems = upsellOrder.map(k => ALL_OFFERS[k]);

  const subject = `${p.business} was selected for this Free ${demoLabel}`;

  const bodyText = `Hi ${p.firstName},

${introText}${missedCallLine}

I built a ${demoLabel.toLowerCase()} for ${p.business}:
 ${p.demoLink}

It's a live prototype — play with it to see how it handles common customer questions. This kind of tool could help you capture leads 24/7, answer FAQs, and book jobs even when your team's off the clock.

Beyond that, FastFlow also offers:
${upsellItems.map(i => `- ${i.label} — ${i.plain}`).join('\n')}

Would love to get your thoughts on the demo.

Best,
Beck Hoefling`;

  const missedCallHtml = p.missedCall ? '<p>Someone mentioned that your business doesn\'t always answer calls after hours — this is exactly what we solve with after hours answering. Never lose a lead again!</p>' : '';
  const introHtml = p.isLocal
    ? `My name is Beck. I'm a SWFL local (Cape Coral). My company <strong>FastFlow</strong> helps businesses like yours capture more leads and save time with AI-powered automation.`
    : `My name is Beck and my company <strong>FastFlow</strong> helps businesses like yours capture more leads and save time with AI-powered automation.`;
  const bodyHtml = `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.7;max-width:600px;">
  <p>Hi ${p.firstName},</p>
  <p>${introHtml}</p>
  ${missedCallHtml}
  <p>I built a ${demoLabel.toLowerCase()} for <strong>${p.business}</strong>:</p>
  <p><a href="${p.demoLink}" target="_blank" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${p.business}'s Custom Demo →</a></p>
  <p>It's a live prototype — play with it to see how it handles common customer questions. This kind of tool could help you capture leads 24/7, answer FAQs, and book jobs even when your team's off the clock.</p>
  <p>Beyond that, FastFlow also offers:</p>
  <ul style="padding-left:20px;margin:8px 0;">
    ${upsellItems.map(i => `<li><strong>${i.label}</strong> — ${i.html}</li>`).join('\n    ')}
  </ul>

  <p>Would love to get your thoughts on the demo.</p>
  <p>Best,<br><strong>Beck Hoefling</strong></p>
</div>
<div style="margin-top:16px;"><a href="https://fastflow.bek-tech.com"><img src="https://fastflow.bek-tech.com/logo_large.png" alt="FastFlow" width="58" height="58" style="display:block;"></a><b><span style="font-size:16px;">FastFlow | <a href="https://fastflow.bek-tech.com" style="color:#2563eb;text-decoration:none;">fastflow.bek-tech.com</a> | (239) 946-1776</span></b></div>`;

  return { subject, text: bodyText, html: bodyHtml };
}

// ─── Channel → demo type mapping ─────────────────────────────
function channelToDemoType(channel?: string | null): string {
  if (!channel) return 'webchat';
  const c = channel.toLowerCase();
  if (c.includes('voice') || c.includes('inbound') || c.includes('outbound')) return 'voice';
  if (c.includes('facebook') || c.includes('instagram') || c.includes('social') || c.includes('organic') || c.includes('lead ads')) return 'social';
  if (c.includes('sms') || c.includes('text')) return 'sms';
  return 'webchat';
}

// ─── Component ────────────────────────────────────────────────
interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  call_status?: string | null;
  called_at?: string | null;
  notes: string | null;
  created_at: string;
  demo_url?: string | null;
  channel?: string | null;
}

export function TemplatesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [niche, setNiche] = useState('hvac');
  const [demoType, setDemoType] = useState('webchat');
  const [isLocal, setIsLocal] = useState(true);
  const [missedCall, setMissedCall] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const [fields, setFields] = useState({
    toEmail: '',
    toName: '',
    firstName: '',
    business: '',
    demoLink: '',
  });

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        const arr: Lead[] = Array.isArray(data) ? data : (data.leads || []);
        setLeads(arr);
        if (arr.length > 0) prefill(arr[0]);
      })
      .catch(() => {});
  }, []);

  const prefill = (lead: Lead) => {
    const rawName = (lead.owner_name || '').trim();
    // Skip if name looks like a phone number
    const cleanName = (rawName && !rawName.startsWith('+') && !/^\d/.test(rawName)) ? rawName : '';
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'there';
    const detectedType = channelToDemoType(lead.channel);
    setDemoType(detectedType);
    setMissedCall(detectedType === 'voice');
    setFields({
      toEmail: lead.email || '',
      toName: cleanName,
      firstName,
      business: lead.business_name || '',
      demoLink: lead.demo_url || `https://fastflow.bek-tech.com/api/demo?lead=${lead.id}&business=${encodeURIComponent(lead.business_name)}&type=${detectedType}`,
    });
  };

  const handleLeadSelect = (id: string) => {
    setSelectedLeadId(id);
    const lead = leads.find(l => l.id === id);
    if (lead) prefill(lead);
    setSent(false);
    setError('');
  };

  const email = buildEmail({ ...fields, niche, demoType, isLocal, missedCall });

  const send = async () => {
    if (!fields.toEmail) { setError('No email address for this lead'); return; }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: fields.toEmail,
          toName: fields.toName,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        // Mark email_sent on the lead
        if (selectedLeadId) {
          await fetch(`/api/leads/${selectedLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_sent: true }),
          });
        }
      } else {
        setError(data.error || 'Send failed');
      }
    } catch (e) {
      setError(String(e));
    }
    setSending(false);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Email Templates</h1>
        <p className="text-slate-400 text-sm mt-1">Send outreach emails via Zoho</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Left panel: lead selector & template settings */}
        <div className="lg:col-span-1 space-y-4">
          {/* Lead selector */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Select Lead</CardTitle></CardHeader>
            <CardContent>
              <select
                value={selectedLeadId}
                onChange={e => handleLeadSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">— pick a lead —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.business_name}{l.owner_name ? ` · ${l.owner_name}` : ''}{l.status ? ` [${l.status}]` : ''}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Template settings */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Template Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <Label>SWFL Local line</Label>
                <button
                  onClick={() => setIsLocal(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isLocal ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLocal ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label>After-Hours Line</Label>
                  <p className="text-xs text-slate-500 mt-0.5">Auto-on for voice demos. Inserts missed call sentence in intro.</p>
                </div>
                <button
                  onClick={() => setMissedCall(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${missedCall ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${missedCall ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="space-y-1">
                <Label>Niche</Label>
                <select
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {Object.entries(NICHES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Demo Type</Label>
                <select
                  value={demoType}
                  onChange={e => {
                    setDemoType(e.target.value);
                    // Update demo link type param if it's an auto-generated link
                    if (fields.demoLink.includes('fastflow.bek-tech.com/api/demo')) {
                      setFields(f => ({
                        ...f,
                        demoLink: f.demoLink.replace(/&type=[^&]*/, `&type=${e.target.value}`),
                      }));
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {DEMO_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Editable fields */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Override Fields</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>To Email</Label>
                <Input value={fields.toEmail} onChange={e => setFields({ ...fields, toEmail: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={fields.firstName} onChange={e => setFields({ ...fields, firstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Business Name</Label>
                <Input value={fields.business} onChange={e => setFields({ ...fields, business: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Demo Link</Label>
                <Input value={fields.demoLink} onChange={e => setFields({ ...fields, demoLink: e.target.value })} />
                {fields.demoLink && (
                  <div className="flex gap-2 items-center">
                    <a
                      href={`${fields.demoLink}${fields.demoLink.includes('?') ? '&' : '?'}internal=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-2"
                    >
                      Preview {fields.business || "Demo"}
                    </a>
                    <span className="text-xs text-slate-500">(won't track opens)</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Send */}
          <div className="space-y-2">
            {error && <p className="text-red-400 text-sm">❌ {error}</p>}
            {sent && <p className="text-green-400 text-sm">✅ Email sent to {fields.toEmail}</p>}
            <Button
              onClick={send}
              disabled={sending || !fields.toEmail}
              className="w-full h-12 text-base bg-blue-600 hover:bg-blue-500"
            >
              {sending ? '📤 Sending...' : sent ? '✅ Sent!' : `📧 Send to ${fields.toEmail || '...'}`}
            </Button>
          </div>
        </div>

        {/* Right panel: preview */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription className="text-xs break-all">
                <span className="text-slate-400">To:</span> {fields.toName ? `${fields.toName} ` : ''}{fields.toEmail}<br/>
                <span className="text-slate-400">Subject:</span> {email.subject}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-lg p-4" style={{ minHeight: '500px' }}>
                <div dangerouslySetInnerHTML={{ __html: email.html }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
