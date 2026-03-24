import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { sql } from '@vercel/postgres';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+12399461776';

const client = twilio(accountSid, authToken);

export async function POST(request: Request) {
  try {
    const { prospectId, phone, companyName, testMode } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const baseUrl = 'https://fastflow-admin.vercel.app';

    const webhookUrl = `${baseUrl}/api/prospects/call-webhook?prospectId=${prospectId || 'test'}&companyName=${encodeURIComponent(companyName || 'Business')}`;
    const statusCallbackUrl = `${baseUrl}/api/prospects/call-webhook?prospectId=${prospectId || 'test'}&companyName=${encodeURIComponent(companyName || 'Business')}&type=status`;

    const call = await client.calls.create({
      to: phone,
      from: fromNumber,
      url: webhookUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['completed'],
      statusCallbackMethod: 'POST',
      machineDetection: 'DetectMessageEnd',
      machineDetectionTimeout: 8,
      timeout: 20,
    });

    // Mark as calling
    if (prospectId && prospectId !== 'test') {
      await sql`
        UPDATE prospects SET call_status = 'calling', called_at = NOW()
        WHERE id = ${prospectId}
      `;
    }

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      message: testMode ? 'Test call initiated' : `Calling ${companyName}...`
    });
  } catch (error) {
    console.error('Call error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
