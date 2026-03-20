import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { sql } from '@vercel/postgres';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+12399461776';

const client = twilio(accountSid, authToken);

// Batch call - calls multiple leads with AMD
export async function POST(request: Request) {
  try {
    const { testPhone } = await request.json();
    
    // If testPhone provided, just call that number for testing
    if (testPhone) {
      const webhookUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const call = await client.calls.create({
        to: testPhone,
        from: fromNumber,
        url: `${webhookUrl}/api/calls/webhook?leadId=test&businessName=Test`,
        machineDetection: 'DetectMessageEnd',
        machineDetectionTimeout: 5,
        timeout: 15,
      });

      return NextResponse.json({
        success: true,
        testMode: true,
        callSid: call.sid,
        status: call.status,
        message: `Test call initiated to ${testPhone}`
      });
    }

    // Get leads that need calling
    const leadsResult = await sql`
      SELECT id, business_name, phone 
      FROM leads 
      WHERE phone IS NOT NULL 
        AND phone != ''
        AND (call_status IS NULL OR call_status = 'uncalled')
        AND status IN ('created', 'sent', 'opened')
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const leads = leadsResult.rows;
    
    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leads to call',
        called: 0
      });
    }

    const webhookUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const results = [];
    
    // Call leads one at a time with delay (avoid rate limits)
    for (const lead of leads) {
      try {
        const call = await client.calls.create({
          to: lead.phone,
          from: fromNumber,
          url: `${webhookUrl}/api/calls/webhook?leadId=${lead.id}&businessName=${encodeURIComponent(lead.business_name)}`,
          machineDetection: 'DetectMessageEnd',
          machineDetectionTimeout: 5,
          timeout: 15,
        });

        results.push({
          leadId: lead.id,
          businessName: lead.business_name,
          callSid: call.sid,
          status: 'initiated'
        });

        // Mark as called immediately (webhook will update with actual result)
        await sql`
          UPDATE leads 
          SET call_status = 'calling', called_at = NOW()
          WHERE id = ${lead.id}
        `;

        // Wait 3 seconds between calls to avoid rate limits
        await new Promise(r => setTimeout(r, 3000));
      } catch (error) {
        results.push({
          leadId: lead.id,
          businessName: lead.business_name,
          error: String(error)
        });
      }
    }

    return NextResponse.json({
      success: true,
      called: results.length,
      results
    });
  } catch (error) {
    console.error('Error in batch call:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
