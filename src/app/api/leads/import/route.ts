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
        const facebook = lead.facebook || null;
        const niche = lead.niche || null;

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
          };

          // Add prospects merged fields if found
          if (prospect.rows.length > 0) {
            const p = prospect.rows[0];
            updateData.call_status = p.call_status;
            updateData.called_at = p.called_at;
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

          // Update with new info using safe individual column updates
          try {
            await sql`
              UPDATE leads SET
                demo_url   = COALESCE(${demoUrl}, demo_url),
                channel    = COALESCE(${channel}, channel),
                email      = COALESCE(${email}, email),
                owner_name = COALESCE(${ownerName}, owner_name),
                website    = COALESCE(${updateData.website ?? null}, website),
                city       = COALESCE(${updateData.city ?? null}, city),
                call_status = COALESCE(${updateData.call_status ?? null}, call_status),
                called_at  = COALESCE(${updateData.called_at ?? null}, called_at),
                facebook   = COALESCE(${facebook}, facebook),
                niche      = COALESCE(${niche}, niche)
              WHERE id = ${existingLead.id}
            `;
          } catch (e) {
            console.error('Update error:', e);
          }
          // Try contacts separately (column may not exist yet)
          try {
            await sql`UPDATE leads SET contacts = ${JSON.stringify(contacts)} WHERE id = ${existingLead.id}`;
          } catch { /* contacts column may not exist yet */ }

          // Delete the prospect now that it's merged into a lead
          if (prospect.rows.length > 0) {
            try {
              await sql`DELETE FROM prospects WHERE id = ${prospect.rows[0].id}`;
            } catch (e) { console.error('Prospect delete error:', e); }
          }

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

        // Build prospects merged fields (only columns that exist in leads table)
        const prospectsMerged = {
          call_status: prospect.rows[0]?.call_status || null,
          called_at: prospect.rows[0]?.called_at || null,
        };

        const insertOwner = ownerName || (contacts[0]?.name as string) || null;
        const insertEmail = email || (contacts[0]?.email as string) || null;
        const insertCallStatus = prospectsMerged.call_status;
        const insertCalledAt = prospectsMerged.called_at;

        // Insert using only columns that actually exist in the schema
        await sql`
          INSERT INTO leads (id, business_name, owner_name, email, phone, website, city, status, notes, demo_url, channel, call_status, called_at, facebook, niche)
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
            ${insertCallStatus},
            ${insertCalledAt},
            ${facebook},
            ${niche}
          )
          ON CONFLICT (id) DO UPDATE SET
            demo_url   = COALESCE(EXCLUDED.demo_url, leads.demo_url),
            channel    = COALESCE(EXCLUDED.channel, leads.channel),
            email      = COALESCE(EXCLUDED.email, leads.email),
            owner_name = COALESCE(EXCLUDED.owner_name, leads.owner_name),
            call_status = COALESCE(EXCLUDED.call_status, leads.call_status),
            called_at  = COALESCE(EXCLUDED.called_at, leads.called_at),
            facebook   = COALESCE(EXCLUDED.facebook, leads.facebook),
            niche      = COALESCE(EXCLUDED.niche, leads.niche),
            updated_at = NOW()
        `;
        // Try contacts separately
        try {
          await sql`UPDATE leads SET contacts = ${JSON.stringify(contacts)} WHERE id = ${id}`;
        } catch { /* contacts column may not exist yet */ }

        // Delete prospect now that it's been merged into a lead
        if (prospect.rows.length > 0) {
          try {
            await sql`DELETE FROM prospects WHERE id = ${prospect.rows[0].id}`;
          } catch (e) { console.error('Prospect delete error:', e); }
        }

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
