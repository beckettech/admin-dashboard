import { NextResponse } from 'next/server';
import { getAuthStatus } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(request: Request) {
  const authenticated = await getAuthStatus();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { leads } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
    }

    let imported = 0;
    let updated = 0;

    for (const lead of leads) {
      try {
        const businessName = lead.business_name?.trim() || 'Unknown Business';
        const id = lead.lead_id || businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || Date.now().toString();

        // Clean contact info — skip phone numbers masquerading as names
        const rawName = (lead.owner_name || '').trim();
        const ownerName = (rawName && !rawName.startsWith('+') && !/^\d/.test(rawName)) ? rawName : null;
        const email = (lead.email && lead.email.includes('@')) ? lead.email.trim() : null;
        const demoUrl = lead.demo_url || null;
        const channel = lead.channel || null;
        const phone = lead.phone || null;

        // Build contact object
        const newContact = (ownerName || email)
          ? { name: ownerName, email, phone, primary: true }
          : null;

        // Check existing lead (by id OR business name OR phone)
        const existing = await sql`
          SELECT * FROM leads
          WHERE id = ${id}
             OR business_name ILIKE ${businessName}
             OR (phone IS NOT NULL AND phone = ${phone})
          LIMIT 1
        `;

        if (existing.rows.length > 0) {
          const existingLead = existing.rows[0];

          // Merge contacts
          let contacts: Array<Record<string, string | boolean | null>> = [];
          try { contacts = JSON.parse(existingLead.contacts || '[]'); } catch { contacts = []; }

          if (newContact) {
            const alreadyHas = contacts.some(c =>
              (c.email && c.email === newContact.email) ||
              (c.name && c.name === newContact.name)
            );
            if (!alreadyHas) contacts.push(newContact);
          }

          // Update with any new info
          await sql`
            UPDATE leads SET
              contacts   = ${JSON.stringify(contacts)},
              demo_url   = COALESCE(${demoUrl}, demo_url),
              channel    = COALESCE(${channel}, channel),
              email      = COALESCE(${email}, leads.email),
              owner_name = COALESCE(${ownerName}, leads.owner_name),
              updated_at = NOW()
            WHERE id = ${existingLead.id}
          `;
          updated++;
          continue;
        }

        // Check if this business exists as a prospect → merge info
        const prospect = await sql`
          SELECT * FROM prospects
          WHERE company_name ILIKE ${businessName}
             OR (phone IS NOT NULL AND phone = ${phone})
          LIMIT 1
        `;

        let mergedPhone = phone;
        let mergedWebsite = null;
        let mergedCity = null;
        const contacts: Array<Record<string, string | boolean | null>> = [];

        if (prospect.rows.length > 0) {
          const p = prospect.rows[0];
          mergedPhone = mergedPhone || p.phone;
          mergedWebsite = p.website;
          mergedCity = p.location;

          // Add prospect contact
          if (p.contact || p.email) {
            contacts.push({ name: p.contact || null, email: p.email || null, phone: p.phone || null, primary: true });
          }
        }

        // Add CSV contact if different
        if (newContact) {
          const alreadyHas = contacts.some(c =>
            (c.email && c.email === newContact.email) ||
            (c.name && c.name === newContact.name)
          );
          if (!alreadyHas) contacts.push({ ...newContact, primary: contacts.length === 0 });
        }

        await sql`
          INSERT INTO leads (id, business_name, owner_name, email, phone, website, city, status, notes, demo_url, channel, contacts)
          VALUES (
            ${id}, ${businessName},
            ${ownerName || (contacts[0]?.name as string) || null},
            ${email || (contacts[0]?.email as string) || null},
            ${mergedPhone},
            ${mergedWebsite},
            ${mergedCity},
            'created',
            'Imported from CSV',
            ${demoUrl},
            ${channel},
            ${JSON.stringify(contacts)}
          )
        `;
        imported++;
      } catch (error) {
        console.error('Import error for lead:', lead.business_name, error);
      }
    }

    return NextResponse.json({ imported, updated, merged: imported + updated });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
