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

          // Merge contacts safely
          let contacts: Array<Record<string, string | boolean | null>> = [];
          try { contacts = JSON.parse(existingLead.contacts || '[]'); } catch { contacts = []; }

          if (newContact) {
            const alreadyHas = contacts.some(c =>
              (c.email && c.email === newContact.email) ||
              (c.name && c.name === newContact.name)
            );
            if (!alreadyHas) contacts.push(newContact);
          }

          // Check if this business also exists in prospects → merge ALL prospect fields
          const prospect = await sql`
            SELECT * FROM prospects
            WHERE company_name ILIKE ${businessName}
               OR (phone IS NOT NULL AND phone = ${phone})
            LIMIT 1
          `;

          // Build full update data
          const updateData: Record<string, any> = {
            demo_url: demoUrl,
            channel: channel,
            email: email,
            owner_name: ownerName,
            updated_at: new Date(),
          };

          // Add prospects merged fields if found
          if (prospect.rows.length > 0) {
            const p = prospect.rows[0];
            updateData.call_status = p.call_status;
            updateData.call_result = p.call_result;
            updateData.called_at = p.called_at;
            updateData.scheduled_call_time = p.scheduled_call_time;
            updateData.call_transcript = p.call_transcript;
            updateData.website = p.website;
            updateData.city = p.location;

            // Add prospect contact if different
            if (p.contact || p.email) {
              const prospectContact = { name: p.contact || null, email: p.email || null, phone: p.phone || null, primary: true };
              const alreadyHas = contacts.some(c =>
                (c.email && c.email === prospectContact.email) ||
                (c.name && c.name === prospectContact.name)
              );
              if (!alreadyHas) contacts.push(prospectContact);
            }
          }

          // Update with new info — use individual fallback updates so missing columns don't break everything
          try {
            const setClause = Object.entries(updateData)
              .map(([k, v], i) => `${k} = COALESCE($${i + 2}, ${k})`)
              .join(', ');

            const values = [existingLead.id, ...Object.values(updateData)];
            await sql`UPDATE leads SET ${setClause} WHERE id = $1`, values;
          } catch (e) {
            console.error('Update error (non-contacts fields):', e);
          }
          // Try contacts separately (column may not exist yet)
          try {
            await sql`UPDATE leads SET contacts = ${JSON.stringify(contacts)} WHERE id = ${existingLead.id}`;
          } catch { /* contacts column may not exist yet — run /api/migrate/leads-contacts */ }

          updated++;
          continue;
        }

        // Check if this business exists as a prospect → merge ALL prospect fields
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

          // Merge ALL prospect data into the lead
          const prospectsFields = {
            call_status: p.call_status,
            call_result: p.call_result,
            called_at: p.called_at,
            scheduled_call_time: p.scheduled_call_time,
            call_transcript: p.call_transcript,
          };

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

        // Build prospects merged fields (all nullable)
        const prospectsMerged = {
          call_status: prospect.rows[0]?.call_status || null,
          call_result: prospect.rows[0]?.call_result || null,
          called_at: prospect.rows[0]?.called_at || null,
          scheduled_call_time: prospect.rows[0]?.scheduled_call_time || null,
          call_transcript: prospect.rows[0]?.call_transcript || null,
        };

        const insertOwner = ownerName || (contacts[0]?.name as string) || null;
        const insertEmail = email || (contacts[0]?.email as string) || null;
        // Insert without contacts first (safe), then try to add contacts
        await sql`
          INSERT INTO leads (id, business_name, owner_name, email, phone, website, city, status, notes, demo_url, channel,
            call_status, call_result, called_at, scheduled_call_time, call_transcript)
          VALUES (
            ${id}, ${businessName},
            ${insertOwner},
            ${insertEmail},
            ${mergedPhone},
            ${mergedWebsite},
            ${mergedCity},
            'created',
            'Imported from CSV',
            ${demoUrl},
            ${channel},
            ${prospectsMerged.call_status},
            ${prospectsMerged.call_result},
            ${prospectsMerged.called_at},
            ${prospectsMerged.scheduled_call_time},
            ${prospectsMerged.call_transcript}
          )
          ON CONFLICT (id) DO UPDATE SET
            demo_url   = COALESCE(EXCLUDED.demo_url, leads.demo_url),
            channel    = COALESCE(EXCLUDED.channel, leads.channel),
            email      = COALESCE(EXCLUDED.email, leads.email),
            owner_name = COALESCE(EXCLUDED.owner_name, leads.owner_name),
            call_status = COALESCE(EXCLUDED.call_status, leads.call_status),
            call_result = COALESCE(EXCLUDED.call_result, leads.call_result),
            called_at = COALESCE(EXCLUDED.called_at, leads.called_at),
            scheduled_call_time = COALESCE(EXCLUDED.scheduled_call_time, leads.scheduled_call_time),
            call_transcript = COALESCE(EXCLUDED.call_transcript, leads.call_transcript),
            updated_at = NOW()
        `;
        // Try contacts separately
        try {
          await sql`UPDATE leads SET contacts = ${JSON.stringify(contacts)} WHERE id = ${id}`;
        } catch { /* contacts column may not exist yet */ }
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
