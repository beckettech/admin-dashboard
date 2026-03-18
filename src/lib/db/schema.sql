-- FastFlow Admin Database Schema
-- Run this in Vercel Postgres

-- Demo views tracking
CREATE TABLE IF NOT EXISTS demo_views (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR(255),
  business_name VARCHAR(255),
  website VARCHAR(500),
  demo_type VARCHAR(50),
  ip_hash VARCHAR(64),
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW()
);

-- Leads pipeline
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(255) PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  city VARCHAR(100),
  google_review_link VARCHAR(500),
  yelp_review_link VARCHAR(500),
  status VARCHAR(50) DEFAULT 'found',
  notes TEXT,
  demo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Outreach log
CREATE TABLE IF NOT EXISTS outreach_log (
  id SERIAL PRIMARY KEY,
  lead_id VARCHAR(255) REFERENCES leads(id),
  method VARCHAR(20),
  template VARCHAR(50),
  sent_at TIMESTAMP DEFAULT NOW(),
  response_at TIMESTAMP,
  response_text TEXT
);

-- Customers (synced from Stripe)
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(255) PRIMARY KEY,
  stripe_customer_id VARCHAR(255) UNIQUE,
  lead_id VARCHAR(255) REFERENCES leads(id),
  email VARCHAR(255),
  name VARCHAR(255),
  subscription_status VARCHAR(50),
  subscription_plan VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_views_lead_id ON demo_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_demo_views_viewed_at ON demo_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_outreach_lead_id ON outreach_log(lead_id);
