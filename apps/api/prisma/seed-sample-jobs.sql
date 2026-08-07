-- Sample PUBLISHED jobs across different industry sectors (explicit job IDs).
-- Prerequisites:
--   1. Catalog seeded (`pnpm --filter @numee/api seed:catalog`)
--   2. At least one company + RECRUITER/OWNER membership exists
--
-- Run (local docker):
--   psql "postgresql://numee:numee@localhost:5432/numee" -f apps/api/prisma/seed-sample-jobs.sql
-- Or via Prisma:
--   pnpm --filter @numee/api exec prisma db execute --file prisma/seed-sample-jobs.sql

BEGIN;

-- Resolve company + recruiter once (first membership found)
WITH ctx AS (
  SELECT
    cm.company_id,
    cm.user_id AS created_by_id
  FROM company_members cm
  ORDER BY cm.created_at ASC
  LIMIT 1
),
ind AS (
  SELECT slug, id FROM industries WHERE is_active = true
),
roles AS (
  SELECT slug, id FROM job_roles WHERE is_active = true
)
INSERT INTO jobs (
  id,
  company_id,
  created_by_id,
  industry_id,
  job_role_id,
  title,
  department,
  employment_type,
  work_mode,
  location,
  experience_min,
  experience_max,
  notice_period,
  salary_min,
  salary_max,
  salary_currency,
  salary_negotiable,
  description,
  responsibilities,
  requirements,
  benefits,
  status,
  created_at,
  updated_at
)
SELECT
  v.id,
  ctx.company_id,
  ctx.created_by_id,
  ind.id,
  roles.id,
  v.title,
  v.department,
  v.employment_type,
  v.work_mode,
  v.location,
  v.experience_min,
  v.experience_max,
  v.notice_period,
  v.salary_min,
  v.salary_max,
  v.salary_currency,
  v.salary_negotiable,
  v.description,
  v.responsibilities,
  v.requirements,
  v.benefits,
  v.status::"JobStatus",
  NOW(),
  NOW()
FROM ctx
CROSS JOIN (
  VALUES
    -- Technology
    (
      'job_sample_tech_001',
      'computer-software',
      'software-engineer',
      'Senior Software Engineer',
      'Engineering',
      'FULL_TIME',
      'HYBRID',
      'Bengaluru, India',
      4, 8,
      '30 days',
      2500000, 4000000,
      'INR',
      false,
      'Build and scale product features for a high-growth SaaS platform.',
      'Own end-to-end delivery of backend services; mentor junior engineers.',
      'Strong TypeScript/Node experience; familiarity with Postgres and Redis.',
      'Health insurance, learning budget, flexible WFH.',
      'PUBLISHED'
    ),
    (
      'job_sample_tech_002',
      'computer-network-security',
      'security-engineer',
      'Security Engineer',
      'Security',
      'FULL_TIME',
      'REMOTE',
      'India (Remote)',
      3, 6,
      '60 days',
      2200000, 3500000,
      'INR',
      false,
      'Harden applications and infrastructure against modern threats.',
      'Threat modeling, secure code review, incident response playbooks.',
      'Experience with AppSec, cloud IAM, and vulnerability management.',
      'Remote-first, wellness allowance.',
      'PUBLISHED'
    ),
    (
      'job_sample_pm_001',
      'management-consulting',
      'project-manager',
      'Project Coordinator',
      'Delivery',
      'FULL_TIME',
      'HYBRID',
      'Bengaluru, India',
      2, 5,
      '30 days',
      900000, 1600000,
      'INR',
      false,
      'Coordinate cross-functional project delivery for consulting engagements.',
      'Track timelines, run standups, manage stakeholders, and keep risk logs current.',
      'Strong organization skills; PMP/Agile familiarity a plus; Excel and Notion fluency.',
      'Hybrid schedule, learning stipend.',
      'PUBLISHED'
    ),
    -- Finance
    (
      'job_sample_fin_001',
      'financial-services',
      'financial-analyst',
      'Financial Analyst',
      'Finance',
      'FULL_TIME',
      'ONSITE',
      'Mumbai, India',
      2, 5,
      '30 days',
      1200000, 2000000,
      'INR',
      true,
      'Support FP&A for a growing financial services business.',
      'Build forecasts, variance analysis, and board reporting packs.',
      'Excel/Sheets fluency; prior FP&A or investment analysis preferred.',
      'Performance bonus, meal cards.',
      'PUBLISHED'
    ),
    (
      'job_sample_fin_002',
      'banking',
      'risk-analyst',
      'Credit Risk Analyst',
      'Risk',
      'FULL_TIME',
      'HYBRID',
      'Hyderabad, India',
      3, 7,
      '45 days',
      1500000, 2500000,
      'INR',
      false,
      'Assess credit risk across retail and SME portfolios.',
      'Scorecard monitoring, policy recommendations, portfolio reviews.',
      'Background in banking risk, SAS/Python a plus.',
      'PF, gratuity, medical cover.',
      'PUBLISHED'
    ),
    -- Healthcare
    (
      'job_sample_health_001',
      'hospital-health-care',
      'registered-nurse',
      'Registered Nurse — ICU',
      'Clinical',
      'FULL_TIME',
      'ONSITE',
      'Delhi NCR, India',
      2, 8,
      '30 days',
      600000, 1200000,
      'INR',
      false,
      'Provide critical care nursing in a multi-specialty hospital ICU.',
      'Patient monitoring, care planning, coordination with physicians.',
      'Valid nursing license; ICU experience preferred.',
      'Shift allowance, accommodation support.',
      'PUBLISHED'
    ),
    (
      'job_sample_health_002',
      'pharmaceuticals',
      'clinical-research-associate',
      'Clinical Research Associate',
      'R&D',
      'FULL_TIME',
      'HYBRID',
      'Pune, India',
      3, 6,
      '60 days',
      1000000, 1800000,
      'INR',
      false,
      'Monitor clinical trial sites for pharma study protocols.',
      'Site initiation, monitoring visits, GCP compliance.',
      'Life sciences degree; CRA experience preferred.',
      'Travel allowance, health insurance.',
      'PUBLISHED'
    ),
    -- Marketing / Media
    (
      'job_sample_mkt_001',
      'marketing-advertising',
      'marketing-manager',
      'Digital Marketing Manager',
      'Marketing',
      'FULL_TIME',
      'HYBRID',
      'Bengaluru, India',
      4, 8,
      '30 days',
      1800000, 2800000,
      'INR',
      true,
      'Own performance marketing and brand growth channels.',
      'Plan campaigns, manage agencies, report CAC/ROAS.',
      'Hands-on Meta/Google Ads; analytics fluency.',
      'Flexible hours, creative stipend.',
      'PUBLISHED'
    ),
    -- Education
    (
      'job_sample_edu_001',
      'e-learning',
      'instructional-designer',
      'Instructional Designer',
      'Content',
      'CONTRACT',
      'REMOTE',
      'India (Remote)',
      2, 5,
      '15 days',
      800000, 1400000,
      'INR',
      false,
      'Design engaging online learning experiences for professional learners.',
      'Storyboarding, LMS packaging, assessments.',
      'Experience with Articulate / Captivate; adult learning principles.',
      'Contract conversion path.',
      'PUBLISHED'
    ),
    -- Logistics
    (
      'job_sample_log_001',
      'logistics-supply-chain',
      'supply-chain-manager',
      'Supply Chain Manager',
      'Operations',
      'FULL_TIME',
      'ONSITE',
      'Chennai, India',
      5, 10,
      '60 days',
      2000000, 3200000,
      'INR',
      false,
      'Lead end-to-end supply chain for a multi-warehouse network.',
      'Inventory planning, vendor SLAs, cost optimization.',
      'ERP experience; prior logistics leadership required.',
      'Company car, variable pay.',
      'PUBLISHED'
    ),
    -- Design / Product
    (
      'job_sample_des_001',
      'design',
      'product-designer',
      'Senior Product Designer',
      'Design',
      'FULL_TIME',
      'HYBRID',
      'Bengaluru, India',
      4, 8,
      '30 days',
      2200000, 3600000,
      'INR',
      false,
      'Craft delightful product experiences for B2B workflows.',
      'Discovery, prototyping, design system contributions.',
      'Strong Figma craft; portfolio with shipped products.',
      'Equipment budget, sabbatical after 3 years.',
      'PUBLISHED'
    ),
    -- Draft (not published) — hospitality
    (
      'job_sample_hosp_001',
      'hospitality',
      'hotel-manager',
      'Hotel Operations Manager',
      'Operations',
      'FULL_TIME',
      'ONSITE',
      'Goa, India',
      6, 12,
      '90 days',
      1500000, 2400000,
      'INR',
      true,
      'Oversee day-to-day hotel operations and guest experience.',
      'Team leadership, P&L ownership, vendor management.',
      'Hospitality degree preferred; prior hotel GM/ops experience.',
      'Housing, meals, performance bonus.',
      'DRAFT'
    )
) AS v(
  id,
  industry_slug,
  job_role_slug,
  title,
  department,
  employment_type,
  work_mode,
  location,
  experience_min,
  experience_max,
  notice_period,
  salary_min,
  salary_max,
  salary_currency,
  salary_negotiable,
  description,
  responsibilities,
  requirements,
  benefits,
  status
)
LEFT JOIN ind ON ind.slug = v.industry_slug
LEFT JOIN roles ON roles.slug = v.job_role_slug
WHERE ctx.company_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  title              = EXCLUDED.title,
  department         = EXCLUDED.department,
  employment_type    = EXCLUDED.employment_type,
  work_mode          = EXCLUDED.work_mode,
  location           = EXCLUDED.location,
  experience_min     = EXCLUDED.experience_min,
  experience_max     = EXCLUDED.experience_max,
  notice_period      = EXCLUDED.notice_period,
  salary_min         = EXCLUDED.salary_min,
  salary_max         = EXCLUDED.salary_max,
  salary_currency    = EXCLUDED.salary_currency,
  salary_negotiable  = EXCLUDED.salary_negotiable,
  description        = EXCLUDED.description,
  responsibilities   = EXCLUDED.responsibilities,
  requirements       = EXCLUDED.requirements,
  benefits           = EXCLUDED.benefits,
  industry_id        = EXCLUDED.industry_id,
  job_role_id        = EXCLUDED.job_role_id,
  status             = EXCLUDED.status,
  updated_at         = NOW();

-- Optional sample skills for a couple of jobs
INSERT INTO job_skills (id, job_id, name, required)
VALUES
  ('jobskill_sample_001', 'job_sample_tech_001', 'TypeScript', true),
  ('jobskill_sample_002', 'job_sample_tech_001', 'Node.js', true),
  ('jobskill_sample_003', 'job_sample_tech_001', 'PostgreSQL', true),
  ('jobskill_sample_004', 'job_sample_tech_002', 'AppSec', true),
  ('jobskill_sample_005', 'job_sample_tech_002', 'AWS IAM', false),
  ('jobskill_sample_006', 'job_sample_mkt_001', 'Google Ads', true),
  ('jobskill_sample_007', 'job_sample_mkt_001', 'Meta Ads', true),
  ('jobskill_sample_008', 'job_sample_des_001', 'Figma', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verify
SELECT j.id, j.title, i.slug AS industry, jr.slug AS job_role, j.status
FROM jobs j
LEFT JOIN industries i ON i.id = j.industry_id
LEFT JOIN job_roles jr ON jr.id = j.job_role_id
WHERE j.id LIKE 'job_sample_%'
ORDER BY j.id;
