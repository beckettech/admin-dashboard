import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import twilio from 'twilio';

// Handle Twilio webhook - called when call connects
// Twilio sends AnsweredBy parameter: "human", "machine", or "unknown"
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId');
  const answeredBy = searchParams.get('AnsweredBy') || 'unknown';
  const dialStatus = searchParams.get('DialCallStatus');

  const twiml = new twilio.twiml.VoiceResponse();

  // Log the call result - NEVER speak, just detect
  if (leadId) {
    try {
      let callStatus = 'unknown';
      
      if (answeredBy === 'machine' || answeredBy === 'machine_start' || answeredBy === 'machine_end_beep') {
        // Voicemail detected - mark as "no_answer" (potential target)
        callStatus = 'no_answer';
      } else if (answeredBy === 'human') {
        // Human answered - they have after-hours coverage
        callStatus = 'human';
      } else if (dialStatus === 'no-answer' || dialStatus === 'busy') {
        // No pickup - mark as "no_answer"
        callStatus = 'no_answer';
      } else {
        callStatus = 'unknown';
      }

      // Update lead in database
      await sql`
        UPDATE leads 
        SET call_status = ${callStatus}, called_at = NOW()
        WHERE id = ${leadId}
      `;
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  }

  // Always just hang up silently - no speech
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

// Handle POST as well (Twilio sometimes uses POST)
export async function POST(request: Request) {
  return GET(request);
}
