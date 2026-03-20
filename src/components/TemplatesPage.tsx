'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Template generator functions (matching send.js)
function esc(v: string) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOutreachEmail(payload: { firstName: string; business: string; demoLink: string }) {
  const { firstName = 'there', business = 'your business', demoLink = '' } = payload;
  
  return {
    subject: `I built something for ${business}`,
    text: `Hi ${firstName},

I came across ${business} and wanted to show you something I built specifically for HVAC companies like yours.

Check it out here: ${demoLink}

It's a live AI chat demo — customized for your business. It shows what it would look like if an AI employee handled your website chat, text messages, and Instagram DMs 24/7. Instant responses, no missed leads.

Most HVAC companies lose 30%+ of leads to slow replies or missed calls after hours. This fixes that automatically.

No commitment — just wanted you to see it. If you have questions, reply here or call (239) 946-1776.

Best,
Beck Hoefling`,
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.6;max-width:600px;">
<p>Hi ${esc(firstName)},</p>
<p>I came across <strong>${esc(business)}</strong> and wanted to show you something I built specifically for HVAC companies like yours.</p>
<p>Check it out here: <a href="${esc(demoLink)}" style="color:#2563eb;">${esc(demoLink)}</a></p>
<p>It's a live AI chat demo — customized for your business. It shows what it would look like if an AI employee handled your website chat, text messages, and Instagram DMs 24/7. Instant responses, no missed leads.</p>
<p>Most HVAC companies lose <strong>30%+ of leads</strong> to slow replies or missed calls after hours. This fixes that automatically.</p>
<p>No commitment — just wanted you to see it. If you have questions, reply here or call <strong>(239) 946-1776</strong>.</p>
<p>Best,<br/>Beck Hoefling</p>
</div>
<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
<div style="text-align:center;">
  <img src="https://fastflow.bek-tech.com/logo_large.png" alt="FastFlow" width="58" height="58" style="margin-bottom:8px;">
  <div style="font-weight:600;font-size:16px;">FastFlow | fastflow.bek-tech.com | (239) 946-1776</div>
</div>`
  };
}

function buildDemoConfirmEmail(payload: { firstName: string; lastName: string; organization: string; website: string; email: string; phone: string }) {
  const { firstName = '', lastName = '', organization = 'N/A', website = 'N/A', email = 'N/A', phone = 'N/A' } = payload;
  
  const rows = [
    ['Name', `${firstName} ${lastName}`],
    ['Business', organization],
    ['Website', website],
    ['Email', email],
    ['Phone', phone],
  ].map(([k, v]) => `<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">${k}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${esc(v)}</td></tr>`).join('');

  return {
    subject: 'FastFlow: Demo request received ✅',
    text: `Hi ${firstName},

Thanks — we received your demo request and we'll send your custom demo soon.

Submitted details:
- Name: ${firstName} ${lastName}
- Business: ${organization}
- Website: ${website}
- Email: ${email}
- Phone: ${phone}

You can reply to this email to make any changes to your demo request.

— Beck at FastFlow
(239) 946-1776`,
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#111827;line-height:1.6;max-width:600px;">
<p>Hi ${esc(firstName)},</p>
<p><strong>Thanks — we received your demo request</strong> and we'll send your custom demo soon.</p>
<p style="margin:16px 0 8px;"><strong>Submitted details:</strong></p>
<table style="border-collapse:collapse;width:100%;">${rows}</table>
<p style="margin-top:16px;">You can <strong>reply to this email</strong> to make any changes to your demo request.</p>
<p>Best,<br/>Beck Hoefling</p>
</div>`
  };
}

function buildTextVersion(business: string, demoLink: string) {
  return `Hi, Beck from FastFlow here. ${business} was selected for a free webchat demo — check it out: ${demoLink}

It's a live prototype — click the chat bubble to see how it handles customer questions 24/7. Happy to customize it for your business if you see potential. I also do AI voice agents, missed call text-back, and social DM automation. Let me know!`;
}

export function TemplatesPage() {
  const [outreachPayload, setOutreachPayload] = useState({
    firstName: 'David',
    business: 'Accurate Comfort Services',
    demoLink: 'https://fastflow.bek-tech.com/api/demo?lead=46e363db-c0cf-4035-a2de-5e7294eb18a8',
  });

  const [demoPayload, setDemoPayload] = useState({
    firstName: 'John',
    lastName: 'Smith',
    organization: 'Smith HVAC',
    website: 'smithhvac.com',
    email: 'john@smithhvac.com',
    phone: '(555) 123-4567',
  });

  const outreachEmail = buildOutreachEmail(outreachPayload);
  const demoEmail = buildDemoConfirmEmail(demoPayload);
  const textVersion = buildTextVersion(outreachPayload.business, outreachPayload.demoLink);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-slate-400 mt-1">Preview and customize email templates</p>
      </div>

      <Tabs defaultValue="outreach" className="space-y-6">
        <TabsList>
          <TabsTrigger value="outreach">Outreach Email</TabsTrigger>
          <TabsTrigger value="text">Text Version</TabsTrigger>
          <TabsTrigger value="demo-confirm">Demo Confirmation</TabsTrigger>
        </TabsList>

        {/* Outreach Email */}
        <TabsContent value="outreach" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Input form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Variables</CardTitle>
                <CardDescription>Fill in to preview the email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={outreachPayload.firstName}
                    onChange={(e) => setOutreachPayload({ ...outreachPayload, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business">Business Name</Label>
                  <Input
                    id="business"
                    value={outreachPayload.business}
                    onChange={(e) => setOutreachPayload({ ...outreachPayload, business: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoLink">Demo Link</Label>
                  <Input
                    id="demoLink"
                    value={outreachPayload.demoLink}
                    onChange={(e) => setOutreachPayload({ ...outreachPayload, demoLink: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Subject: {outreachEmail.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border p-6 text-black">
                  <div dangerouslySetInnerHTML={{ __html: outreachEmail.html }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Text Version */}
        <TabsContent value="text" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Text Version</CardTitle>
              <CardDescription>For SMS or quick copy-paste</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={textVersion}
                className="font-mono text-sm min-h-[200px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demo Confirmation */}
        <TabsContent value="demo-confirm" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Input form */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Variables</CardTitle>
                <CardDescription>Fill in to preview the email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="demoFirstName">First Name</Label>
                    <Input
                      id="demoFirstName"
                      value={demoPayload.firstName}
                      onChange={(e) => setDemoPayload({ ...demoPayload, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demoLastName">Last Name</Label>
                    <Input
                      id="demoLastName"
                      value={demoPayload.lastName}
                      onChange={(e) => setDemoPayload({ ...demoPayload, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoOrg">Business</Label>
                  <Input
                    id="demoOrg"
                    value={demoPayload.organization}
                    onChange={(e) => setDemoPayload({ ...demoPayload, organization: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoWebsite">Website</Label>
                  <Input
                    id="demoWebsite"
                    value={demoPayload.website}
                    onChange={(e) => setDemoPayload({ ...demoPayload, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoEmail">Email</Label>
                  <Input
                    id="demoEmail"
                    value={demoPayload.email}
                    onChange={(e) => setDemoPayload({ ...demoPayload, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demoPhone">Phone</Label>
                  <Input
                    id="demoPhone"
                    value={demoPayload.phone}
                    onChange={(e) => setDemoPayload({ ...demoPayload, phone: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Subject: {demoEmail.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border p-6 text-black">
                  <div dangerouslySetInnerHTML={{ __html: demoEmail.html }} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
