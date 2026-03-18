import { sql } from '@vercel/postgres';

// Demo Views
export async function logDemoView(data: {
  lead_id: string;
  business_name: string;
  website: string;
  demo_type: string;
  ip_hash?: string;
  user_agent?: string;
}) {
  const result = await sql`
    INSERT INTO demo_views (lead_id, business_name, website, demo_type, ip_hash, user_agent)
    VALUES (${data.lead_id}, ${data.business_name}, ${data.website}, ${data.demo_type}, ${data.ip_hash || null}, ${data.user_agent || null})
    RETURNING id
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
}) {
  const result = await sql`
    INSERT INTO leads (id, business_name, owner_name, email, phone, website, city, google_review_link, yelp_review_link, notes)
    VALUES (${data.id}, ${data.business_name}, ${data.owner_name || null}, ${data.email || null}, ${data.phone || null}, ${data.website || null}, ${data.city || null}, ${data.google_review_link || null}, ${data.yelp_review_link || null}, ${data.notes || null})
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
