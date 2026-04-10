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
const NICHES: Record<string, { label: string; industry: string; services: string[]; terminology: { bookAction: string; followUpItem: string } }> = {
  hvac: {
    label: 'HVAC',
    industry: 'HVAC companies',
    services: ['answer calls, book jobs, handle after-hours inquiries', 'never lose a customer when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for maintenance, filters, etc.'],
    terminology: { bookAction: 'book jobs', followUpItem: 'maintenance, filters, etc.' },
  },
  plumbing: {
    label: 'Plumbing',
    industry: 'plumbing companies',
    services: ['answer calls, book jobs, handle after-hours inquiries', 'never lose a customer when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for inspections and maintenance'],
    terminology: { bookAction: 'book jobs', followUpItem: 'inspections and maintenance' },
  },
  roofing: {
    label: 'Roofing',
    industry: 'roofing companies',
    services: ['answer calls, book inspections, handle storm season inquiries', 'never lose a customer when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for estimates and annual inspections'],
    terminology: { bookAction: 'book inspections', followUpItem: 'estimates and annual inspections' },
  },
  dental: {
    label: 'Dental',
    industry: 'dental practices',
    services: ['answer calls, book appointments, handle patient inquiries', 'never lose a patient when you front desk is busy', 'respond to social messages instantly', 'automated appointment reminders and follow-ups'],
    terminology: { bookAction: 'book appointments', followUpItem: 'appointment reminders and follow-ups' },
  },
  restaurant: {
    label: 'Restaurant',
    industry: 'restaurants',
    services: ['answer calls, take reservations, handle menu questions', 'never miss a reservation or catering inquiry', 'respond to social messages instantly', 'automated review requests and loyalty follow-ups'],
    terminology: { bookAction: 'take reservations', followUpItem: 'review requests and loyalty follow-ups' },
  },
  salon: {
    label: 'Salon / Spa',
    industry: 'salons and spas',
    services: ['answer calls, book appointments, handle service questions', 'never lose a booking when you\'re with a client', 'respond to social messages instantly', 'automated appointment reminders and rebooking follow-ups'],
    terminology: { bookAction: 'book appointments', followUpItem: 'appointment reminders and rebooking' },
  },
  realestate: {
    label: 'Real Estate',
    industry: 'real estate agencies',
    services: ['answer calls, schedule showings, handle listing inquiries', 'never miss a buyer or seller', 'respond to social messages instantly', 'automated follow-ups for open houses and listings'],
    terminology: { bookAction: 'schedule showings', followUpItem: 'open houses and listings' },
  },
  electrical: {
    label: 'Electrical',
    industry: 'electrical contractors',
    services: ['answer calls, book jobs, handle after-hours emergencies', 'never lose a customer when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for inspections and panel upgrades'],
    terminology: { bookAction: 'book jobs', followUpItem: 'inspections and panel upgrades' },
  },
  lawncare: {
    label: 'Lawn Care',
    industry: 'lawn care and landscaping companies',
    services: ['answer calls, book estimates, handle seasonal inquiries', 'never lose a customer when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for seasonal services and recurring mowing'],
    terminology: { bookAction: 'book estimates', followUpItem: 'seasonal services and recurring mowing' },
  },
  contractor: {
    label: 'Contractor',
    industry: 'general contractors and construction companies',
    services: ['answer calls, book estimates, handle project inquiries', 'never lose a customer when you can\'t pick up', 'respond to social messages instantly', 'automated follow-ups for project quotes and scheduling'],
    terminology: { bookAction: 'book estimates', followUpItem: 'project quotes and scheduling' },
  },
};

// ─── Demo types ───────────────────────────────────────────────
const DEMO_TYPES = [
  { value: 'webchat', label: 'Webchat Demo' },
  { value: 'voice', label: 'Voice Agent Demo' },
  { value: 'sms', label: 'SMS / Text-Back Demo' },
  { value: 'social', label: 'Social DM Demo' },
  { value: 'lead_ads', label: 'Facebook Lead Ads Demo' },
  { value: 'organic', label: 'Facebook Organic Demo' },
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
  const missedCallLine = p.missedCall ? '\n\nSomeone mentioned that your business doesn\'t always answer calls after hours — this is exactly what we solve with after hours answering. Never lose a customer again!' : '';
  const introText = p.isLocal
    ? `My name is Beck.${localLine} My company FastFlow helps businesses like yours capture more customers and save time with AI-powered automation.`
    : `My name is Beck and my company FastFlow helps businesses like yours capture more customers and save time with AI-powered automation.`;

  // All possible upsell items — exclude the current demo type
  const ALL_OFFERS: Record<string, { label: string; plain: string; html: string }> = {
    voice: { label: 'AI voice agents', plain: `answer calls, book jobs, handle after-hours inquiries`, html: `answer calls, book jobs, handle after-hours inquiries` },
    missed: { label: 'Missed call text-back', plain: `never lose a customer when you can't pick up`, html: `never lose a customer when you can't pick up` },
    social: { label: 'Facebook & Instagram DM automation', plain: `respond to social messages instantly`, html: `respond to social messages instantly` },
    lead_ads: { label: 'Facebook Lead Ads AI', plain: `instantly text leads who click your ads and book them automatically`, html: `instantly text leads who click your ads and book them automatically` },
    organic: { label: 'Facebook Organic auto-DM', plain: `auto-message everyone who comments on your posts`, html: `auto-message everyone who comments on your posts` },
    reminders: { label: 'Reorder & checkup reminders', plain: `automated follow-ups for maintenance, filters, etc.`, html: `automated follow-ups for maintenance, filters, etc.` },
    webchat: { label: 'AI webchat', plain: `answer questions and capture customers on your website 24/7`, html: `answer questions and capture customers on your website 24/7` },
    sms: { label: 'SMS / text-back automation', plain: `instant replies to missed calls and inbound texts`, html: `instant replies to missed calls and inbound texts` },
  };

  // Build upsell list: always show 4 items, exclude the current demo type
  const upsellOrder = p.demoType === 'voice'
    ? ['missed', 'social', 'webchat', 'reminders']
    : p.demoType === 'social'
    ? ['voice', 'missed', 'webchat', 'reminders']
    : p.demoType === 'sms'
    ? ['voice', 'social', 'webchat', 'reminders']
    : p.demoType === 'lead_ads'
    ? ['voice', 'organic', 'webchat', 'missed']
    : p.demoType === 'organic'
    ? ['voice', 'lead_ads', 'webchat', 'missed']
    : /* webchat default */ ['voice', 'missed', 'social', 'reminders'];

  // Apply niche-specific overrides to upsell items
  const upsellItems = upsellOrder.map(k => {
    const item = ALL_OFFERS[k];
    if (k === 'reminders') {
      return {
        label: item.label,
        plain: `automated follow-ups for ${niche.terminology.followUpItem}`,
        html: `automated follow-ups for ${niche.terminology.followUpItem}`,
      };
    }
    return item;
  });

  const subject = p.demoType === 'lead_ads'
    ? `${p.business} — your Facebook leads are going cold (here's the fix)`
    : p.demoType === 'organic'
    ? `${p.business} — your Facebook commenters could be booking appointments`
    : `${p.business} was selected for this Free ${demoLabel}`;

  // Type-specific intro copy
  const demoBodyLine = p.demoType === 'lead_ads'
    ? `When someone clicks your Facebook ad and fills out a lead form, the worst thing that can happen is silence. Most businesses take hours — or days — to follow up, and by then the lead is gone.\n\nI built a demo that shows how ${p.business} could instantly text every new Facebook lead, ask a couple quick questions, and get them booked — automatically:`
    : p.demoType === 'organic'
    ? `Every time someone comments on one of your Facebook posts, that's a real person showing interest. Most businesses never follow up. I built a demo that shows how ${p.business} could auto-message every commenter, qualify them, and book appointments — without lifting a finger:`
    : `I built a ${demoLabel.toLowerCase()} for ${p.business}:`;

  const demoClosingLine = p.demoType === 'lead_ads'
    ? `Play with the demo — it texts back, asks qualifying questions, and tries to book an appointment. This is exactly what would happen with your real Facebook leads.`
    : p.demoType === 'organic'
    ? `Play with the demo — it responds like a real rep, answers questions, and pushes toward a booking. This is what your commenters would experience automatically.`
    : `It's a live prototype — play with it to see how it handles common customer questions. This kind of tool could help you capture customers 24/7, answer FAQs, and ${niche.terminology.bookAction} even when your team's off the clock.`;

  const bodyText = `Hi ${p.firstName},

${introText}${missedCallLine}

${demoBodyLine}
 ${p.demoLink}

${demoClosingLine}

Beyond that, FastFlow also offers:
${upsellItems.map(i => `- ${i.label} — ${i.plain}`).join('\n')}

Would love to get your thoughts on the demo.

Best,
Beck Hoefling`;

  const missedCallHtml = p.missedCall ? '<p>Someone mentioned that your business doesn\'t always answer calls after hours — this is exactly what we solve with after hours answering. Never lose a customer again!</p>' : '';
  const introHtml = p.isLocal
    ? `My name is Beck. I'm a SWFL local (Cape Coral). My company <strong>FastFlow</strong> helps businesses like yours capture more customers and save time with AI-powered automation.`
    : `My name is Beck and my company <strong>FastFlow</strong> helps businesses like yours capture more customers and save time with AI-powered automation.`;

  const demoBodyHtml = p.demoType === 'lead_ads'
    ? `<p>When someone clicks your Facebook ad and fills out a lead form, the worst thing that can happen is silence. Most businesses take hours — or days — to follow up, and by then the lead is gone.</p>
  <p>I built a demo that shows how <strong>${p.business}</strong> could instantly text every new Facebook lead, ask a couple quick questions, and get them booked — automatically:</p>`
    : p.demoType === 'organic'
    ? `<p>Every time someone comments on one of your Facebook posts, that's a real person showing interest. Most businesses never follow up.</p>
  <p>I built a demo that shows how <strong>${p.business}</strong> could auto-message every commenter, qualify them, and book appointments — without lifting a finger:</p>`
    : `<p>I built a ${demoLabel.toLowerCase()} for <strong>${p.business}</strong>:</p>`;

  const demoClosingHtml = p.demoType === 'lead_ads'
    ? `<p>Play with the demo — it texts back, asks qualifying questions, and tries to book an appointment. This is exactly what would happen with your real Facebook leads.</p>`
    : p.demoType === 'organic'
    ? `<p>Play with the demo — it responds like a real rep, answers questions, and pushes toward a booking. This is what your commenters would experience automatically.</p>`
    : `<p>It's a live prototype — play with it to see how it handles common customer questions. This kind of tool could help you capture customers 24/7, answer FAQs, and ${niche.terminology.bookAction} even when your team's off the clock.</p>`;

  const bodyHtml = `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.7;max-width:600px;">
  <p>Hi ${p.firstName},</p>
  <p>${introHtml}</p>
  ${missedCallHtml}
  ${demoBodyHtml}
  <p><a href="${p.demoLink}" target="_blank" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">${p.business}'s Custom Demo →</a></p>
  ${demoClosingHtml}
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

// ─── DM / Text Message builder ─────────────────────────────────
function buildDM(p: {
  firstName: string;
  business: string;
  demoLink: string;
  niche: string;
  demoType: string;
  isLocal: boolean;
}) {
  const niche = NICHES[p.niche] || NICHES.hvac;
  const demoLabel = DEMO_TYPES.find(d => d.value === p.demoType)?.label || 'Demo';
  const localIntro = p.isLocal ? 'SWFL local here ' : '';

  const lines = [
    `Hey there! ${localIntro}Beck from FastFlow.`,
    ``,
    `I built an ${demoLabel.toLowerCase()} for ${p.business} showing how AI could ${niche.terminology.bookAction} and capture customers 24/7:`,
    p.demoLink,
    ``,
    `Would love to get your thoughts on the demo.`,
    ``,
    `Beyond that, FastFlow also offers:`,
    `- Missed call text-back`,
    `- Facebook & Instagram DM automation`,
    `- ${niche.terminology.followUpItem.charAt(0).toUpperCase() + niche.terminology.followUpItem.slice(1)} reminders`,
  ];

  return lines.join('\n').trim();
}

// ─── Channel → demo type mapping ─────────────────────────────
function channelToDemoType(channel?: string | null): string {
  if (!channel) return 'webchat';
  const c = channel.toLowerCase();
  if (c.includes('voice') || c.includes('inbound') || c.includes('outbound')) return 'voice';
  if (c.includes('lead ad') || c.includes('lead_ad') || c.includes('leadad')) return 'lead_ads';
  if (c.includes('organic')) return 'organic';
  if (c.includes('facebook') || c.includes('instagram') || c.includes('social')) return 'social';
  if (c.includes('sms') || c.includes('text')) return 'sms';
  return 'webchat';
}

// ─── Component ────────────────────────────────────────────────
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
  status: string;
  call_status?: string | null;
  called_at?: string | null;
  notes: string | null;
  created_at: string;
  demo_url?: string | null;
  website?: string | null;
  channel?: string | null;
  contacts?: LeadContact[] | string | null;
  niche?: string | null;
  bounce_status?: string | null;
  bounce_reason?: string | null;
}

// Convert a raw demo URL (e.g. demos.fastflow.bek-tech.com/demo/<uuid>)
// into a branded FastFlow tracking link with lead metadata.
function toBrandedDemoUrl(lead: { id: string; business_name: string; website?: string | null }, demoType: string, rawUrl?: string | null): string {
  const base = `https://fastflow.bek-tech.com/api/demo`;
  const params = new URLSearchParams({
    lead: lead.id,
    business: lead.business_name,
    ...(lead.website ? { website: lead.website } : {}),
    type: demoType,
  });

  // If already a branded link, just update the type param
  if (rawUrl && rawUrl.includes('fastflow.bek-tech.com/api/demo')) {
    const url = new URL(rawUrl);
    url.searchParams.set('type', demoType);
    if (lead.website) url.searchParams.set('website', lead.website);
    return url.toString();
  }

  // If it's a demos.fastflow link, extract the UUID and rebuild
  if (rawUrl && rawUrl.includes('demos.fastflow.bek-tech.com/demo/')) {
    const match = rawUrl.match(/\/demo\/([a-f0-9-]{36})/);
    const uuid = match ? match[1] : lead.id;
    const p2 = new URLSearchParams({
      lead: uuid,
      business: lead.business_name,
      ...(lead.website ? { website: lead.website } : {}),
      type: demoType,
    });
    return `${base}?${p2.toString()}`;
  }

  // Fallback: build from lead data
  return `${base}?${params.toString()}`;
}

function parseContacts(lead: Lead): LeadContact[] {
  let contacts: LeadContact[] = [];
  try {
    const raw = lead.contacts;
    contacts = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
  } catch { contacts = []; }
  // Always ensure primary fields are represented
  if (contacts.length === 0 && (lead.owner_name || lead.email)) {
    contacts = [{ name: lead.owner_name, email: lead.email, phone: lead.phone, primary: true }];
  }
  return contacts.filter(c => c.email || c.name);
}

export function TemplatesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedContactIdx, setSelectedContactIdx] = useState(0);
  const [niche, setNiche] = useState('hvac');
  const [demoType, setDemoType] = useState('webchat');
  const [isLocal, setIsLocal] = useState(true);
  const [missedCall, setMissedCall] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [previewMode, setPreviewMode] = useState<'html' | 'dm'>('html');
  const [copied, setCopied] = useState(false);

  const [fields, setFields] = useState({
    toEmail: '',
    toName: '',
    firstName: '',
    business: '',
    demoLink: '',
  });

  // Status normalization (same as LeadsPage)
  const normalizeStatus = (status: string) => {
    const STATUS_MAP: Record<string, string> = {
      'found': 'created',
      'building': 'created',
      'draft': 'created',
      'new': 'created',
      'created': 'created',
      'approved': 'sent',
      'pitched': 'opened',
      'responded': 'followed_up',
      'closed': 'sold',
      'passed': 'not_interested',
      'archived': 'not_interested',
      'opened': 'opened',
      'sent': 'sent',
    };
    return STATUS_MAP[status] || status;
  };

  // Exclude leads that are already processed (sent, opened, used, not interested, sold, followed up)
  const excludedStatuses = ['sent', 'opened', 'used', 'not_interested', 'sold', 'followed_up', 'pitched', 'approved', 'responded', 'closed', 'passed', 'archived', 'building', 'draft'];
  const isExcluded = (lead: Lead) => excludedStatuses.includes(lead.status) || excludedStatuses.includes(normalizeStatus(lead.status));

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => {
        const arr: Lead[] = Array.isArray(data) ? data : (data.leads || []);
        const filtered = arr.filter(l => normalizeStatus(l.status) === 'created' && l.bounce_status !== 'bounced');
        setLeads(filtered);
        if (filtered.length > 0) prefillLead(filtered[0], 0);
      })
      .catch(() => {});
  }, []);

  const prefillLead = (lead: Lead, contactIdx = 0) => {
    const contacts = parseContacts(lead);
    const contact = contacts[contactIdx] || contacts[0] || null;
    const rawName = (contact?.name || lead.owner_name || '').trim();
    const cleanName = (rawName && !rawName.startsWith('+') && !/^\d/.test(rawName)) ? rawName : '';
    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || 'there';
    const detectedType = channelToDemoType(lead.channel);
    setDemoType(detectedType);
    // Auto-detect niche from business name (always, even if DB has wrong value)
    const name = (lead.business_name || '').toLowerCase();
    const plumbingKw = ['plumb', 'pipe', 'drain', 'sewer', 'water heater', 'septic', 'rooter', 'toilet'];
    const roofingKw = ['roof', 'shingle', 'gutter'];
    const electricalKw = ['electric', 'wiring', 'panel'];
    const dentalKw = ['dental', 'dentist', 'ortho'];
    const restaurantKw = ['restaurant', 'cafe', 'catering', 'diner', 'food', 'grill'];
    const salonKw = ['salon', 'spa', 'barber', 'hair', 'nail', 'beauty'];
    const realestateKw = ['real estate', 'realtor', 'property', 'realty', 'realty group', 'properties'];
    const lawncareKw = ['lawn', 'landscape', 'landscaping', 'yard', 'mowing', 'turf', 'grounds', 'garden'];
    if (plumbingKw.some(k => name.includes(k))) setNiche('plumbing');
    else if (roofingKw.some(k => name.includes(k))) setNiche('roofing');
    else if (electricalKw.some(k => name.includes(k))) setNiche('electrical');
    else if (dentalKw.some(k => name.includes(k))) setNiche('dental');
    else if (restaurantKw.some(k => name.includes(k))) setNiche('restaurant');
    else if (salonKw.some(k => name.includes(k))) setNiche('salon');
    else if (realestateKw.some(k => name.includes(k))) setNiche('realestate');
    else if (lawncareKw.some(k => name.includes(k))) setNiche('lawncare');
    else if (['contractor', 'construct', 'builder', 'remodel', 'renovation'].some(k => name.includes(k))) setNiche('contractor');
    else if (lead.niche) setNiche(lead.niche);
    // Only show after-hours line if we confirmed they don't pickup (call_status = no_answer)
    setMissedCall(lead.call_status === 'no_answer');
    setSelectedContactIdx(contactIdx);
    const contactEmail = (contact?.email && contact.email.includes('@')) ? contact.email : (lead.email || '');
    setFields({
      toEmail: contactEmail,
      toName: cleanName,
      firstName,
      business: lead.business_name || '',
      demoLink: toBrandedDemoUrl(lead, detectedType, lead.demo_url),
    });
  };

  const handleLeadSelect = (id: string) => {
    setSelectedLeadId(id);
    const lead = leads.find(l => l.id === id);
    if (lead) prefillLead(lead, 0);
    setSent(false);
    setError('');
  };

  const handleContactSelect = (idx: number) => {
    const lead = leads.find(l => l.id === selectedLeadId);
    if (lead) prefillLead(lead, idx);
  };

  const email = buildEmail({ ...fields, niche, demoType, isLocal, missedCall });
  const dmMessage = buildDM({ ...fields, niche, demoType, isLocal });

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

      if (res.status === 409) {
        // Previously bounced - don't send
        setError(`⚠️ Email previously bounced: ${data.reason || 'Unknown error'}. Click "Reset Bounce" in lead details to try again.`);
      } else if (data.success) {
        setSent(true);
        // Mark email_sent and move to "Demo Sent" stage in pipeline
        if (selectedLeadId) {
          await fetch(`/api/leads/${selectedLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email_sent: true, status: 'sent' }),
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
            <CardContent className="space-y-3">
              <select
                value={selectedLeadId}
                onChange={e => handleLeadSelect(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">— pick a lead —</option>
                {leads
                  .filter(l => {
                    const normalized = normalizeStatus(l.status);
                    return normalized === 'created' && l.bounce_status !== 'bounced';
                  })
                  .map(l => (
                  <option key={l.id} value={l.id}>
                    {l.business_name}{l.channel ? ` · ${l.channel}` : ''}{l.status ? ` [${l.status}]` : ''}{l.bounce_status === 'bounced' ? ' ❌' : ''}
                  </option>
                ))}
              </select>
              {/* Contact picker — shown when lead has multiple contacts */}
              {selectedLeadId && (() => {
                const lead = leads.find(l => l.id === selectedLeadId);
                const contacts = lead ? parseContacts(lead) : [];
                if (contacts.length <= 1) return null;
                return (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Contact</p>
                    <div className="space-y-1">
                      {contacts.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => handleContactSelect(i)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedContactIdx === i ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                        >
                          <span className="font-medium">{c.name || c.email || 'Unknown'}</span>
                          {c.email && <span className="block text-xs opacity-70">{c.email}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Selected lead info */}
              {selectedLeadId && (() => {
                const lead = leads.find(l => l.id === selectedLeadId);
                if (!lead) return null;
                const callStatusLabel = lead.call_status === 'no_answer' ? '🎯 No Answer' : lead.call_status === 'human' ? '✅ Has Coverage' : null;
                return (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {lead.niche && <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full capitalize">🏷️ {lead.niche}</span>}
                      {callStatusLabel && <span className={lead.call_status === 'no_answer' ? 'text-orange-400' : 'text-green-400'}>{callStatusLabel}</span>}
                      {lead.city && <span className="text-slate-400">{lead.city}</span>}
                    </div>
                  </div>
                );
              })()}
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
                  <p className="text-xs text-slate-500 mt-0.5">Auto-on when call_status = no_answer. Manual override available.</p>
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
                    const newType = e.target.value;
                    setDemoType(newType);
                    const lead = leads.find(l => l.id === selectedLeadId);
                    if (lead) {
                      setFields(f => ({
                        ...f,
                        demoLink: toBrandedDemoUrl(lead, newType, f.demoLink),
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Preview</CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode('html')}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${previewMode === 'html' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >HTML Email</button>
                  <button
                    onClick={() => setPreviewMode('dm')}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${previewMode === 'dm' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >DM / Text</button>
                  {previewMode === 'dm' && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(dmMessage); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="px-3 py-1 rounded text-xs font-medium bg-green-600 hover:bg-green-500 text-white transition"
                    >{copied ? '✓ Copied!' : '📋 Copy'}</button>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs break-all">
                <span className="text-slate-400">To:</span> {fields.toName ? `${fields.toName} ` : ''}{fields.toEmail}<br/>
                <span className="text-slate-400">Subject:</span> {email.subject}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewMode === 'html' ? (
                <div className="bg-white rounded-lg p-4" style={{ minHeight: '500px' }}>
                  <div dangerouslySetInnerHTML={{ __html: email.html }} />
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg p-4 font-sans text-sm text-slate-200 whitespace-pre-wrap" style={{ minHeight: '200px' }}>
                  {dmMessage}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
