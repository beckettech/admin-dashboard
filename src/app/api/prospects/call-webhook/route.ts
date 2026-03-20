import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const prospectId = searchParams.get('prospectId');

  // Twilio sends application/x-www-form-urlencoded
  let answeredBy = 'unknown';
  let callSid = '';

  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    answeredBy = params.get('AnsweredBy') || 'unknown';
    callSid = params.get('CallSid') || '';
  } catch {
    // fallback
  }

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.hangup();

  let callResult: string;
  if (answeredBy === 'human') {
    callResult = 'human';
  } else if (answeredBy.startsWith('machine') || answeredBy === 'fax') {
    callResult = 'voicemail';
  } else {
    callResult = 'no_answer';
  }

  if (prospectId && prospectId !== 'test') {
    try {
      // Get prospect info for logging
      const prospect = await sql`
        SELECT company_name, phone FROM prospects WHERE id = ${prospectId}
      `;

      // Update prospect status
      await sql`
        UPDATE prospects SET
          call_status = ${callResult},
          call_result = ${answeredBy},
          call_transcript = ${`AMD: ${answeredBy} | SID: ${callSid}`},
          called_at = NOW()
        WHERE id = ${prospectId}
      `;

      // Log to call_logs table
      if (prospect.rows.length > 0) {
        const { company_name, phone } = prospect.rows[0];
        await sql`
          INSERT INTO call_logs (prospect_id, company_name, phone, call_status, call_result, call_transcript)
          VALUES (${prospectId}, ${company_name}, ${phone}, ${callResult}, ${answeredBy}, ${`AMD: ${answeredBy} | SID: ${callSid}`})
        `;
      }
    } catch (err) {
      console.error('DB update error:', err);
    }
  }

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

export async function GET(request: Request) {
  return POST(request);
}
