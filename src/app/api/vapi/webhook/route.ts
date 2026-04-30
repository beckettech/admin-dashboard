import { NextRequest, NextResponse } from 'next/server';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_CALL_LOGS || '';
const FASTFLOW_SITE = 'https://fastflow.bek-tech.com';
const SUPPORT_EMAIL = 'becketthoefling@gmail.com';

interface VapiCallEnded {
  type: 'end-of-call-report';
  call: {
    id: string;
    phone?: string;
    customer?: { number?: string };
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    status?: string;
  };
  transcript?: string;
  summary?: string;
  structuredData?: {
    firstName?: string;
    lastName?: string;
    business?: string;
    website?: string;
    email?: string;
    phone?: string;
    socialLink?: string;
    channels?: string;
  };
  analysis?: {
    summary?: string;
    successEvaluation?: string;
  };
}

async function postToDiscord(data: {
  callerPhone: string;
  duration: number;
  summary: string;
  transcript: string;
  structuredData?: VapiCallEnded['structuredData'];
}) {
  const durationMin = Math.floor(data.duration / 60);
  const durationSec = data.duration % 60;
  
  // Build fields for structured data
  const fields = [];
  if (data.structuredData?.firstName || data.structuredData?.lastName) {
    fields.push({ name: 'Name', value: `${data.structuredData.firstName || ''} ${data.structuredData.lastName || ''}`.trim(), inline: true });
  }
  if (data.structuredData?.business) {
    fields.push({ name: 'Business', value: data.structuredData.business, inline: true });
  }
  if (data.structuredData?.email) {
    fields.push({ name: 'Email', value: data.structuredData.email, inline: true });
  }
  if (data.structuredData?.phone) {
    fields.push({ name: 'Phone', value: data.structuredData.phone, inline: true });
  }
  if (data.structuredData?.website) {
    fields.push({ name: 'Website', value: data.structuredData.website, inline: false });
  }
  if (data.structuredData?.channels) {
    fields.push({ name: 'Channels', value: data.structuredData.channels, inline: false });
  }
  if (data.structuredData?.socialLink) {
    fields.push({ name: 'Social', value: data.structuredData.socialLink, inline: false });
  }

  const embed: Record<string, unknown> = {
    title: '📞 Vapi Call Ended',
    color: 0x3b82f6,
    fields: [
      { name: 'Caller', value: data.callerPhone || 'Unknown', inline: true },
      { name: 'Duration', value: `${durationMin}m ${durationSec}s`, inline: true },
      { name: 'Summary', value: data.summary || 'No summary', inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  const fieldsArray = embed.fields as Array<{ name: string; value: string; inline?: boolean }>;

  if (fields.length > 0) {
    fieldsArray.push({ name: '─────────', value: '**Lead Info**', inline: false });
    fieldsArray.push(...fields);
  }

  // Add transcript as a separate field (truncated if too long)
  const transcriptPreview = data.transcript 
    ? data.transcript.length > 1000 
      ? data.transcript.slice(0, 1000) + '...' 
      : data.transcript
    : 'No transcript';
  
  fieldsArray.push({ 
    name: 'Transcript', 
    value: '```\n' + transcriptPreview + '\n```', 
    inline: false 
  });

  await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

async function sendDemoNotification(data: VapiCallEnded['structuredData'] & { callerPhone?: string }) {
  if (!data?.email) {
    console.log('[vapi/webhook] No email provided, skipping demo notification');
    return;
  }

  // Parse channels into array
  const chatTypes = data.channels 
    ? data.channels.split(',').map(c => c.trim().toLowerCase())
    : ['phone'];

  const payload = {
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    organization: data.business || '',
    website: data.website || '',
    socialLink: data.socialLink || '',
    email: data.email,
    phone: data.phone || data.callerPhone || '',
    chatTypes,
    source: 'vapi-voice-call'
  };

  // Call the email send endpoint
  const res = await fetch(`${FASTFLOW_SITE}/api/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: data.email,
      subject: `FastFlow Demo Request - ${data.business || 'New Lead'}`,
      template: 'demo',
      payload
    })
  });

  const result = await res.json();
  if (!res.ok) {
    console.error('[vapi/webhook] Email send failed:', result);
    throw new Error('Failed to send demo notification');
  }
  
  console.log('[vapi/webhook] Demo notification sent to:', data.email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[vapi/webhook] Received event:', body.type);

    // Handle end-of-call-report
    if (body.type === 'end-of-call-report') {
      const data = body as VapiCallEnded;
      
      const callerPhone = data.call?.phone || data.call?.customer?.number || 'Unknown';
      const duration = data.call?.duration || 0;
      const summary = data.summary || data.analysis?.summary || '';
      const transcript = data.transcript || '';
      const structuredData = data.structuredData;

      // Post to Discord
      await postToDiscord({
        callerPhone,
        duration,
        summary,
        transcript,
        structuredData
      });

      // Send demo notification if we have lead info
      if (structuredData?.email) {
        await sendDemoNotification({
          ...structuredData,
          callerPhone
        });
      }

      return NextResponse.json({ success: true, posted: true, demoSent: !!structuredData?.email });
    }

    return NextResponse.json({ success: true, type: body.type });
  } catch (error) {
    console.error('[vapi/webhook] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
