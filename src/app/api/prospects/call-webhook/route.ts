import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const prospectId = searchParams.get('prospectId');
  const type = searchParams.get('type'); // 'status' for statusCallback

  let answeredBy = 'unknown';
  let callSid = '';
  let callStatus = '';

  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    answeredBy = params.get('AnsweredBy') || 'unknown';
    callSid = params.get('CallSid') || '';
    callStatus = params.get('CallStatus') || '';
  } catch {
    // fallback
  }

  // statusCallback fires when call fully completes — use this for AMD result
  if (type === 'status') {
    let callResult: string;
    if (answeredBy === 'human') {
      callResult = 'human';
    } else {
      // machine_*, fax, unknown, or any non-human = no_answer (went to voicemail or didn't pick up)
      callResult = 'no_answer';
    }

    if (prospectId && prospectId !== 'test') {
      try {
        const prospect = await sql`SELECT company_name, phone FROM prospects WHERE id = ${prospectId}`;
        await sql`
          UPDATE prospects SET
            call_status = ${callResult},
            call_result = ${answeredBy},
            call_transcript = ${`AMD: ${answeredBy} | Status: ${callStatus} | SID: ${callSid}`},
            called_at = NOW()
          WHERE id = ${prospectId}
        `;
        if (prospect.rows.length > 0) {
          const { company_name, phone } = prospect.rows[0];
          await sql`
            INSERT INTO call_logs (prospect_id, company_name, phone, call_status, call_result, call_transcript)
            VALUES (${prospectId}, ${company_name}, ${phone}, ${callResult}, ${answeredBy}, ${`AMD: ${answeredBy} | SID: ${callSid}`})
          `.catch(() => {}); // ignore duplicates
        }
      } catch (err) {
        console.error('DB update error:', err);
      }
    }

    return new NextResponse('OK', { status: 200 });
  }

  // Initial TwiML — just hang up silently (AMD result comes via statusCallback)
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

export async function GET(request: Request) {
  return POST(request);
}
