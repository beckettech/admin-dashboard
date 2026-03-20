import { NextResponse } from 'next/server';
import twilio from 'twilio';

// Twilio credentials from env
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+12399461776';

const client = twilio(accountSid, authToken);

// Make an outbound call with AMD (Answering Machine Detection)
export async function POST(request: Request) {
  try {
    const { phone, leadId, businessName } = await request.json();
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // The webhook URL Twilio will call when the call connects
    // This tells Twilio what to do based on AMD result
    const webhookUrl = `${process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'}/api/calls/webhook`;
    
    // Make the call with AMD enabled
    const call = await client.calls.create({
      to: phone,
      from: fromNumber,
      url: `${webhookUrl}?leadId=${leadId}&businessName=${encodeURIComponent(businessName || 'Business')}`,
      machineDetection: 'DetectMessageEnd', // Detect voicemail and wait for beep
      machineDetectionTimeout: 5,
      timeout: 15,
      statusCallback: `${webhookUrl}/status?leadId=${leadId}`,
      statusCallbackEvent: ['completed', 'no-answer', 'busy', 'failed'],
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      message: `Calling ${phone}...`
    });
  } catch (error) {
    console.error('Error making call:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
