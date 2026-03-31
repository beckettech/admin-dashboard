#!/bin/bash

echo "🔧 FastFlow Admin - Fix Leads Script"
echo "===================================="
echo ""

# Step 1: Add niche column and auto-assign
echo "1️⃣  Adding niche column to leads table..."
curl -s -X POST https://fastflowadmin.vercel.app/api/migrate/add-niche | jq .

# Step 2: Bulk update niches for all leads
echo ""
echo "2️⃣  Auto-assigning niches to all leads..."
curl -s -X POST https://fastflowadmin.vercel.app/api/leads/bulk-update | jq .

# Step 3: Merge duplicates
echo ""
echo "3️⃣  Merging prospects with leads..."
curl -s -X POST https://fastflowadmin.vercel.app/api/merge-duplicates | jq .

echo ""
echo "✅ Done! Check the admin dashboard to see the changes."
