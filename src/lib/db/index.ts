import { sql } from '@vercel/postgres';

// Fuzzy string similarity (0-1) using Dice coefficient
function stringSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) bigrams.add(str.slice(i, i + 2));
    return bigrams;
  };
  const bigramsA = getBigrams(na);
  const bigramsB = getBigrams(nb);
  let intersection = 0;
  bigramsA.forEach(b => { if (bigramsB.has(b)) intersection++; });
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// Match demo business name against prospects and consume the match
export async function matchAndConsumeProspect(businessName: string): Promise<{
  matched: boolean;
  prospect?: {
    id: string;
    company_name: string;
    phone: string | null;
    email: string | null;
    contact: string | null;
    location: string | null;
    niche: string | null;
  };
}> {
  try {
    const result = await sql`SELECT id, company_name, phone, email, contact, location, niche FROM prospects`;
    const prospects = result.rows;
    if (!prospects.length) return { matched: false };

    let bestMatch = null;
    let bestScore = 0;
    for (const p of prospects) {
      const score = stringSimilarity(businessName, p.company_name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    // Threshold: 0.6 is fairly permissive but avoids false positives
    if (bestScore >= 0.6 && bestMatch) {
      // Delete the prospect — it's now a demo lead
      await sql`DELETE FROM prospects WHERE id = ${bestMatch.id}`;
      return { matched: true, prospect: bestMatch };
    }

    return { matched: false };
  } catch (err) {
    console.error('matchAndConsumeProspect error:', err);
    return { matched: false };
  }
}

// Demo Views
export async function logDemoView(data: {
  lead_id: string;
  business_name: string;
  website: string;
  demo_type: string;
  ip_hash?: string;
  user_agent?: string;
  prospect_id?: string;
  prospect_phone?: string;
  prospect_email?: string;
  prospect_contact?: string;
  prospect_location?: string;
  prospect_niche?: string;
}) {
  // Ensure demo_views table exists with prospect columns
  await sql`
    CREATE TABLE IF NOT EXISTS demo_views (
      id SERIAL PRIMARY KEY,
      lead_id TEXT NOT NULL,
      business_name TEXT,
      website TEXT,
      demo_type TEXT,
      ip_hash TEXT,
      user_agent TEXT,
      viewed_at TIMESTAMPTZ DEFAULT NOW(),
      prospect_id TEXT,
      prospect_phone TEXT,
      prospect_email TEXT,
      prospect_contact TEXT,
      prospect_location TEXT,
      prospect_niche TEXT
    )
  `;

  // Ensure prospect columns exist on older tables
  await sql`ALTER TABLE demo_views ADD COLUMN IF NOT EXISTS prospect_id TEXT`;
  await sql`ALTER TABLE demo_views ADD COLUMN IF NOT EXISTS prospect_phone TEXT`;
  await sql`ALTER TABLE demo_views ADD COLUMN IF NOT EXISTS prospect_email TEXT`;
  await sql`ALTER TABLE demo_views ADD COLUMN IF NOT EXISTS prospect_contact TEXT`;
  await sql`ALTER TABLE demo_views ADD COLUMN IF NOT EXISTS prospect_location TEXT`;
  await sql`ALTER TABLE demo_views ADD COLUMN IF NOT EXISTS prospect_niche TEXT`;

  const result = await sql`
    INSERT INTO demo_views (lead_id, business_name, website, demo_type, ip_hash, user_agent,
      prospect_id, prospect_phone, prospect_email, prospect_contact, prospect_location, prospect_niche)
    VALUES (
      ${data.lead_id}, ${data.business_name}, ${data.website}, ${data.demo_type},
      ${data.ip_hash || null}, ${data.user_agent || null},
      ${data.prospect_id || null}, ${data.prospect_phone || null}, ${data.prospect_email || null},
      ${data.prospect_contact || null}, ${data.prospect_location || null}, ${data.prospect_niche || null}
    )
    RETURNING id
  `;

  // Update lead status to 'opened' — match by id (UUID or slug) OR by demo_url containing the lead_id
  await sql`
    UPDATE leads
    SET status = 'opened', demo_viewed_at = NOW()
    WHERE (id = ${data.lead_id} OR demo_url LIKE ${'%' + data.lead_id + '%'})
      AND status NOT IN ('opened', 'used', 'followed_up', 'not_interested', 'sold')
  `;

  return result.rows[0];
}

export async function getDemoViews(limit = 100, offset = 0) {
  const result = await sql`
    SELECT * FROM demo_views
    ORDER BY viewed_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return result.rows;
}

export async function getDemoViewStats() {
  const totalResult = await sql`SELECT COUNT(*) as count FROM demo_views`;
  const byTypeResult = await sql`
    SELECT demo_type, COUNT(*) as count
    FROM demo_views
    GROUP BY demo_type
    ORDER BY count DESC
  `;
  const recentResult = await sql`
    SELECT DATE(viewed_at) as date, COUNT(*) as count
    FROM demo_views
    WHERE viewed_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(viewed_at)
    ORDER BY date DESC
  `;
  
  return {
    total: parseInt(totalResult.rows[0]?.count || '0'),
    byType: byTypeResult.rows,
    recent: recentResult.rows,
  };
}

// Leads
export async function getLeads(status?: string) {
  let query = 'SELECT * FROM leads ORDER BY created_at DESC';
  const params: string[] = [];
  
  if (status) {
    query = 'SELECT * FROM leads WHERE status = $1 ORDER BY created_at DESC';
    params.push(status);
  }
  
  const result = await sql.query(query, params);
  return result.rows;
}

export async function getLead(id: string) {
  const result = await sql`SELECT * FROM leads WHERE id = ${id}`;
  return result.rows[0];
}

export async function createLead(data: {
  id: string;
  business_name: string;
  owner_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  google_review_link?: string;
  yelp_review_link?: string;
  notes?: string;
  niche?: string;
}) {
  const result = await sql`
    INSERT INTO leads (id, business_name, owner_name, email, phone, website, city, google_review_link, yelp_review_link, notes, niche)
    VALUES (${data.id}, ${data.business_name}, ${data.owner_name || null}, ${data.email || null}, ${data.phone || null}, ${data.website || null}, ${data.city || null}, ${data.google_review_link || null}, ${data.yelp_review_link || null}, ${data.notes || null}, ${data.niche || null})
    RETURNING *
  `;
  return result.rows[0];
}

export async function updateLead(id: string, data: Partial<{
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  google_review_link: string;
  yelp_review_link: string;
  status: string;
  notes: string;
  demo_url: string;
  email_sent: boolean;
  text_sent: boolean;
  niche: string;
}>) {
  const fields = Object.entries(data)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v], i) => `${k} = $${i + 2}`)
    .join(', ');

  if (!fields) return getLead(id);

  const values = [id, ...Object.values(data).filter(v => v !== undefined)];
  const result = await sql.query(
    `UPDATE leads SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function deleteLead(id: string) {
  await sql`DELETE FROM leads WHERE id = ${id}`;
}

export async function getLeadStats() {
  const statusResult = await sql`
    SELECT status, COUNT(*) as count
    FROM leads
    GROUP BY status
    ORDER BY count DESC
  `;
  
  return {
    byStatus: statusResult.rows,
  };
}

// Outreach Log
export async function logOutreach(data: {
  lead_id: string;
  method: 'sms' | 'email';
  template?: string;
}) {
  const result = await sql`
    INSERT INTO outreach_log (lead_id, method, template)
    VALUES (${data.lead_id}, ${data.method}, ${data.template || null})
    RETURNING id
  `;
  return result.rows[0];
}

export async function getOutreachForLead(leadId: string) {
  const result = await sql`
    SELECT * FROM outreach_log
    WHERE lead_id = ${leadId}
    ORDER BY sent_at DESC
  `;
  return result.rows;
}

// Customers
export async function upsertCustomer(data: {
  id: string;
  stripe_customer_id: string;
  lead_id?: string;
  email: string;
  name: string;
  subscription_status?: string;
  subscription_plan?: string;
}) {
  const result = await sql`
    INSERT INTO customers (id, stripe_customer_id, lead_id, email, name, subscription_status, subscription_plan)
    VALUES (${data.id}, ${data.stripe_customer_id}, ${data.lead_id || null}, ${data.email}, ${data.name}, ${data.subscription_status || null}, ${data.subscription_plan || null})
    ON CONFLICT (stripe_customer_id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      subscription_status = EXCLUDED.subscription_status,
      subscription_plan = EXCLUDED.subscription_plan
    RETURNING *
  `;
  return result.rows[0];
}

export async function getCustomers() {
  const result = await sql`
    SELECT c.*, l.business_name as lead_business_name
    FROM customers c
    LEFT JOIN leads l ON c.lead_id = l.id
    ORDER BY c.created_at DESC
  `;
  return result.rows;
}
