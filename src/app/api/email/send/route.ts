import { NextRequest, NextResponse } from 'next/server';

const FROM_EMAIL = 'fastflow@bek-tech.com';
const ZOHO_ACCOUNT_ID = '2823738000000008002';

async function getZohoAccessToken() {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing Zoho OAuth credentials:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRefreshToken: !!refreshToken,
    });
    throw new Error('Missing Zoho OAuth credentials');
  }

  const body = `grant_type=refresh_token&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}`;

  const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Zoho token HTTP error:', tokenResponse.status, errorText);
    throw new Error(`Zoho OAuth HTTP ${tokenResponse.status}: ${errorText}`);
  }

  if (tokenData.error) {
    console.error('Zoho OAuth error:', tokenData.error);
    throw new Error(`Zoho OAuth error: ${JSON.stringify(tokenData.error)}`);
  }

  if (!tokenData.access_token) {
    console.error('Zoho token response:', JSON.stringify(tokenData));
    throw new Error('Zoho token refresh failed: no access_token in response');
  }

  return tokenData.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { to, toName, subject, html, text } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to, subject, or html' }, { status: 400 });
    }

    const token = await getZohoAccessToken();

    const toAddress = toName ? `${toName} <${to}>` : to;

    const res = await fetch(`https://mail.zoho.com/api/accounts/${ZOHO_ACCOUNT_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: FROM_EMAIL,
        toAddress,
        subject,
        content: html,
        mailFormat: 'html',
      }),
    });

    const data = await res.json();
    if (data.status && data.status.code !== 200) {
      throw new Error('Zoho Mail API error: ' + JSON.stringify(data));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
