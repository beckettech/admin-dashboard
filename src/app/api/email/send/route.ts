import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Add bounce_status column to leads table if not exists
async function ensureBounceStatus() {
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bounce_status VARCHAR(20)`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bounce_reason TEXT`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0`;
}

// Parse bounce from Zoho webhook
function parseBounceFromZoho(data: any): { bounced: boolean; reason: string } | null {
  // Zoho bounce detection patterns
  if (data.statusCode === 550 || data.statusCode === 554) {
    return { bounced: true, reason: 'Access denied / Invalid recipient' };
  }
  if (data.statusCode === 421) {
    return { bounced: true, reason: 'Rate limited / Temporarily unavailable' };
  }
  if (data.message?.toLowerCase().includes('does not exist')) {
    return { bounced: true, reason: 'Email address does not exist' };
  }
  if (data.message?.toLowerCase().includes('full mailbox') || data.message?.toLowerCase().includes('quota exceeded')) {
    return { bounced: true, reason: 'Mailbox full' };
  }
  if (data.message?.toLowerCase().includes('spam') || data.message?.toLowerCase().includes('blocked')) {
    return { bounced: true, reason: 'Blocked as spam' };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, toName, subject, html, text } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure bounce tracking columns exist
    await ensureBounceStatus();

    // Check if email already bounced
    const bounceCheck = await sql`
      SELECT bounce_status, bounce_count, bounce_reason
      FROM leads
      WHERE email = ${to}
      LIMIT 1
    `;

    const leadBounceStatus = bounceCheck.rows[0];

    // Auto-reject if permanently bounced
    if (leadBounceStatus?.bounce_status === 'bounced') {
      return NextResponse.json({
        error: 'Email previously bounced',
        skip: true,
        reason: leadBounceStatus.bounce_reason,
      }, { status: 409 });
    }

    // Increment bounce count for soft bounces
    if (leadBounceStatus && leadBounceStatus.bounce_count >= 3) {
      // Mark as permanently bounced after 3 failures
      await sql`
        UPDATE leads
        SET bounce_status = 'bounced',
            bounced_at = NOW(),
            bounce_reason = 'Multiple bounces'
        WHERE email = ${to}
      `;
      return NextResponse.json({
        error: 'Email bounced too many times',
        skip: true,
        reason: 'Multiple bounces',
      }, { status: 409 });
    }

    // Send email via Zoho
    const zohoClientId = process.env.ZOHO_CLIENT_ID;
    const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
    const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!zohoClientId || !zohoClientSecret || !zohoRefreshToken) {
      return NextResponse.json({ error: 'Zoho not configured' }, { status: 500 });
    }

    // Get fresh access token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        refresh_token: zohoRefreshToken,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get Zoho access token' }, { status: 500 });
    }

    // Send email via Zoho Mail API
    const emailResponse = await fetch('https://mail.zoho.com/api/accounts/123456789/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: process.env.ZOHO_FROM_EMAIL || 'fastflow@bek-tech.com',
        toAddress: to,
        toName: toName || '',
        subject,
        htmlBody: html,
        textBody: text,
      }),
    });

    const emailData = await emailResponse.json();

    if (emailData.status === 'success' || emailData.status === 'queued') {
      // Reset bounce count on successful send
      if (leadBounceStatus && leadBounceStatus.bounce_count > 0) {
        await sql`
          UPDATE leads
          SET bounce_count = 0,
              bounce_status = NULL
          WHERE email = ${to}
        `;
      }

      return NextResponse.json({
        success: true,
        messageId: emailData.data?.messageId,
      });
    } else if (emailData.status === 'bounced' || emailData.status === 'error') {
      // Mark as bounced
      const bounceReason = parseBounceFromZoho(emailData)?.reason || 'Unknown error';

      await sql`
        UPDATE leads
        SET bounce_status = 'bounced',
            bounced_at = NOW(),
            bounce_reason = ${bounceReason},
            bounce_count = COALESCE(bounce_count, 0) + 1
        WHERE email = ${to}
      `;

      return NextResponse.json({
        success: false,
        bounced: true,
        reason: bounceReason,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: emailData.message || 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Zoho webhook endpoint for bounce notifications
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { to, status, statusCode, message } = body;

    if (!to) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Ensure bounce tracking columns exist
    await ensureBounceStatus();

    const bounceResult = parseBounceFromZoho({ statusCode, message });

    if (bounceResult?.bounced) {
      await sql`
        UPDATE leads
        SET bounce_status = 'bounced',
            bounced_at = NOW(),
            bounce_reason = ${bounceResult.reason},
            bounce_count = COALESCE(bounce_count, 0) + 1
        WHERE email = ${to}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
