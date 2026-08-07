/**
 * Industry + JobRole catalog seed (MVP).
 *
 * Sources (public taxonomies, curated/simplified for hiring UX):
 * - Industries: LinkedIn Industry Codes / NAICS high-level sectors
 *   (https://learn.microsoft.com/en-us/linkedin/shared/references/reference-tables/industry-codes-v2
 *    and NAICS sector groupings — https://www.census.gov/naics/)
 * - Job roles: O*NET occupation titles + ESCO-inspired common roles
 *   (https://www.onetonline.org/ , https://esco.ec.europa.eu/)
 *
 * Counts: ~50 industries, ~150 job roles. Roles map to industries via slug where sensible.
 *
 * Usage: pnpm --filter @numee/api seed:catalog
 * Upserts DB rows; enqueues BullMQ catalog embeddings when Redis is reachable.
 * DB seed still succeeds if Redis/Qdrant/OpenAI are down (vectors stay PENDING/FAILED).
 */
import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(__dirname, "../.env"), override: true });

type IndustrySeed = {
  name: string;
  slug: string;
  description?: string;
};

type JobRoleSeed = {
  name: string;
  slug: string;
  industrySlug?: string;
  description?: string;
};

const INDUSTRIES: IndustrySeed[] = [
  { name: "Information Technology & Services", slug: "information-technology-services", description: "Software, IT services, and digital platforms" },
  { name: "Computer Software", slug: "computer-software", description: "Software product companies" },
  { name: "Internet", slug: "internet", description: "Online platforms, marketplaces, and digital media" },
  { name: "Telecommunications", slug: "telecommunications", description: "Telecom carriers and network services" },
  { name: "Computer & Network Security", slug: "computer-network-security", description: "Cybersecurity products and services" },
  { name: "Financial Services", slug: "financial-services", description: "Banking, payments, and financial institutions" },
  { name: "Banking", slug: "banking", description: "Retail and commercial banking" },
  { name: "Insurance", slug: "insurance", description: "Life, health, and property insurance" },
  { name: "Investment Management", slug: "investment-management", description: "Asset management and wealth advisory" },
  { name: "Accounting", slug: "accounting", description: "Accounting, audit, and tax services" },
  { name: "Management Consulting", slug: "management-consulting", description: "Strategy and management advisory" },
  { name: "Legal Services", slug: "legal-services", description: "Law firms and legal counsel" },
  { name: "Human Resources", slug: "human-resources", description: "HR services and talent platforms" },
  { name: "Marketing & Advertising", slug: "marketing-advertising", description: "Agencies, media buying, and brand marketing" },
  { name: "Public Relations & Communications", slug: "public-relations-communications", description: "PR, corporate communications, and content" },
  { name: "Media Production", slug: "media-production", description: "Film, TV, and digital content production" },
  { name: "Entertainment", slug: "entertainment", description: "Entertainment and leisure brands" },
  { name: "Education Management", slug: "education-management", description: "Schools, universities, and education operators" },
  { name: "E-Learning", slug: "e-learning", description: "Online learning and edtech" },
  { name: "Higher Education", slug: "higher-education", description: "Colleges and universities" },
  { name: "Hospital & Health Care", slug: "hospital-health-care", description: "Hospitals and clinical care delivery" },
  { name: "Medical Practice", slug: "medical-practice", description: "Clinics and medical practices" },
  { name: "Pharmaceuticals", slug: "pharmaceuticals", description: "Drug development and manufacturing" },
  { name: "Biotechnology", slug: "biotechnology", description: "Biotech research and products" },
  { name: "Medical Devices", slug: "medical-devices", description: "Medical equipment and devices" },
  { name: "Retail", slug: "retail", description: "Brick-and-mortar and omnichannel retail" },
  { name: "Consumer Goods", slug: "consumer-goods", description: "CPG and consumer product brands" },
  { name: "Apparel & Fashion", slug: "apparel-fashion", description: "Clothing and fashion brands" },
  { name: "Food & Beverages", slug: "food-beverages", description: "Food and beverage manufacturers" },
  { name: "Restaurants", slug: "restaurants", description: "Restaurants and food service" },
  { name: "Hospitality", slug: "hospitality", description: "Hotels and hospitality services" },
  { name: "Travel & Tourism", slug: "travel-tourism", description: "Travel agencies and tourism operators" },
  { name: "Automotive", slug: "automotive", description: "Vehicle manufacturing and mobility" },
  { name: "Airlines/Aviation", slug: "airlines-aviation", description: "Airlines and aviation services" },
  { name: "Logistics & Supply Chain", slug: "logistics-supply-chain", description: "Freight, warehousing, and supply chain" },
  { name: "Transportation/Trucking/Railroad", slug: "transportation-trucking-railroad", description: "Ground and rail transportation" },
  { name: "Construction", slug: "construction", description: "Building and civil construction" },
  { name: "Real Estate", slug: "real-estate", description: "Property development and brokerage" },
  { name: "Architecture & Planning", slug: "architecture-planning", description: "Architecture and urban planning" },
  { name: "Civil Engineering", slug: "civil-engineering", description: "Civil and infrastructure engineering" },
  { name: "Mechanical or Industrial Engineering", slug: "mechanical-industrial-engineering", description: "Mechanical and industrial engineering firms" },
  { name: "Electrical/Electronic Manufacturing", slug: "electrical-electronic-manufacturing", description: "Electronics and electrical manufacturing" },
  { name: "Industrial Automation", slug: "industrial-automation", description: "Automation and industrial controls" },
  { name: "Oil & Energy", slug: "oil-energy", description: "Oil, gas, and traditional energy" },
  { name: "Renewables & Environment", slug: "renewables-environment", description: "Clean energy and environmental services" },
  { name: "Utilities", slug: "utilities", description: "Electric, gas, and water utilities" },
  { name: "Mining & Metals", slug: "mining-metals", description: "Mining and metals production" },
  { name: "Chemicals", slug: "chemicals", description: "Chemical manufacturing" },
  { name: "Agriculture", slug: "agriculture", description: "Farming and agribusiness" },
  { name: "Government Administration", slug: "government-administration", description: "Public sector administration" },
  { name: "Nonprofit Organization Management", slug: "nonprofit-organization-management", description: "Nonprofits and NGOs" },
  { name: "Research", slug: "research", description: "Scientific and market research" },
  { name: "Staffing & Recruiting", slug: "staffing-recruiting", description: "Recruiting agencies and talent platforms" },
  { name: "Design", slug: "design", description: "Product, graphic, and industrial design" },
  { name: "Gaming", slug: "gaming", description: "Video games and interactive entertainment" },
];

const JOB_ROLES: JobRoleSeed[] = [
  // Technology
  { name: "Software Engineer", slug: "software-engineer", industrySlug: "computer-software", description: "Designs and builds software systems" },
  { name: "Frontend Engineer", slug: "frontend-engineer", industrySlug: "computer-software", description: "Builds user-facing web/mobile interfaces" },
  { name: "Backend Engineer", slug: "backend-engineer", industrySlug: "computer-software", description: "Builds server-side services and APIs" },
  { name: "Full Stack Engineer", slug: "full-stack-engineer", industrySlug: "computer-software", description: "Works across frontend and backend" },
  { name: "Mobile Engineer", slug: "mobile-engineer", industrySlug: "computer-software", description: "Builds iOS/Android applications" },
  { name: "DevOps Engineer", slug: "devops-engineer", industrySlug: "information-technology-services", description: "Owns CI/CD, infra, and reliability tooling" },
  { name: "Site Reliability Engineer", slug: "site-reliability-engineer", industrySlug: "information-technology-services", description: "Improves system reliability and operations" },
  { name: "Cloud Engineer", slug: "cloud-engineer", industrySlug: "information-technology-services", description: "Designs and operates cloud infrastructure" },
  { name: "Data Engineer", slug: "data-engineer", industrySlug: "information-technology-services", description: "Builds data pipelines and warehouses" },
  { name: "Data Scientist", slug: "data-scientist", industrySlug: "research", description: "Applies statistics and ML to business problems" },
  { name: "Machine Learning Engineer", slug: "machine-learning-engineer", industrySlug: "computer-software", description: "Builds and deploys ML models" },
  { name: "AI Engineer", slug: "ai-engineer", industrySlug: "computer-software", description: "Builds applied AI / LLM systems" },
  { name: "QA Engineer", slug: "qa-engineer", industrySlug: "computer-software", description: "Tests software quality and automation" },
  { name: "Security Engineer", slug: "security-engineer", industrySlug: "computer-network-security", description: "Secures systems and applications" },
  { name: "Cybersecurity Analyst", slug: "cybersecurity-analyst", industrySlug: "computer-network-security", description: "Monitors and responds to security threats" },
  { name: "Solutions Architect", slug: "solutions-architect", industrySlug: "information-technology-services", description: "Designs technical solutions for customers" },
  { name: "Enterprise Architect", slug: "enterprise-architect", industrySlug: "information-technology-services", description: "Defines enterprise technology strategy" },
  { name: "IT Support Specialist", slug: "it-support-specialist", industrySlug: "information-technology-services", description: "Provides end-user technical support" },
  { name: "Systems Administrator", slug: "systems-administrator", industrySlug: "information-technology-services", description: "Administers servers and systems" },
  { name: "Network Engineer", slug: "network-engineer", industrySlug: "telecommunications", description: "Designs and operates networks" },
  { name: "Database Administrator", slug: "database-administrator", industrySlug: "information-technology-services", description: "Manages databases and performance" },
  { name: "Product Manager", slug: "product-manager", industrySlug: "computer-software", description: "Owns product roadmap and outcomes" },
  { name: "Technical Product Manager", slug: "technical-product-manager", industrySlug: "computer-software", description: "Product management for technical platforms" },
  { name: "Engineering Manager", slug: "engineering-manager", industrySlug: "computer-software", description: "Leads engineering teams" },
  { name: "CTO", slug: "cto", industrySlug: "computer-software", description: "Chief Technology Officer" },
  { name: "Scrum Master", slug: "scrum-master", industrySlug: "information-technology-services", description: "Facilitates agile delivery" },
  { name: "Business Analyst", slug: "business-analyst", industrySlug: "management-consulting", description: "Analyzes business needs and requirements" },
  { name: "UX Designer", slug: "ux-designer", industrySlug: "design", description: "Designs user experiences" },
  { name: "UI Designer", slug: "ui-designer", industrySlug: "design", description: "Designs visual interfaces" },
  { name: "Product Designer", slug: "product-designer", industrySlug: "design", description: "End-to-end product design" },
  { name: "Graphic Designer", slug: "graphic-designer", industrySlug: "design", description: "Creates visual brand assets" },
  { name: "Game Developer", slug: "game-developer", industrySlug: "gaming", description: "Builds video games" },
  { name: "Game Designer", slug: "game-designer", industrySlug: "gaming", description: "Designs gameplay systems" },

  // Finance / consulting / legal
  { name: "Financial Analyst", slug: "financial-analyst", industrySlug: "financial-services", description: "Analyzes financial performance and forecasts" },
  { name: "Investment Analyst", slug: "investment-analyst", industrySlug: "investment-management", description: "Researches investment opportunities" },
  { name: "Accountant", slug: "accountant", industrySlug: "accounting", description: "Prepares financial statements and books" },
  { name: "Auditor", slug: "auditor", industrySlug: "accounting", description: "Conducts financial and compliance audits" },
  { name: "Tax Consultant", slug: "tax-consultant", industrySlug: "accounting", description: "Advises on tax strategy and compliance" },
  { name: "Controller", slug: "controller", industrySlug: "accounting", description: "Owns accounting operations and controls" },
  { name: "CFO", slug: "cfo", industrySlug: "financial-services", description: "Chief Financial Officer" },
  { name: "Risk Analyst", slug: "risk-analyst", industrySlug: "banking", description: "Assesses credit and operational risk" },
  { name: "Compliance Officer", slug: "compliance-officer", industrySlug: "banking", description: "Ensures regulatory compliance" },
  { name: "Actuary", slug: "actuary", industrySlug: "insurance", description: "Models insurance and financial risk" },
  { name: "Underwriter", slug: "underwriter", industrySlug: "insurance", description: "Evaluates insurance risk and pricing" },
  { name: "Claims Adjuster", slug: "claims-adjuster", industrySlug: "insurance", description: "Investigates and settles insurance claims" },
  { name: "Management Consultant", slug: "management-consultant", industrySlug: "management-consulting", description: "Advises organizations on strategy and ops" },
  { name: "Strategy Consultant", slug: "strategy-consultant", industrySlug: "management-consulting", description: "Focuses on corporate strategy" },
  { name: "Lawyer", slug: "lawyer", industrySlug: "legal-services", description: "Provides legal advice and representation" },
  { name: "Corporate Counsel", slug: "corporate-counsel", industrySlug: "legal-services", description: "In-house legal counsel" },
  { name: "Paralegal", slug: "paralegal", industrySlug: "legal-services", description: "Supports attorneys with legal work" },

  // People / marketing / comms
  { name: "HR Manager", slug: "hr-manager", industrySlug: "human-resources", description: "Leads people operations" },
  { name: "Talent Acquisition Specialist", slug: "talent-acquisition-specialist", industrySlug: "staffing-recruiting", description: "Recruits and hires talent" },
  { name: "Recruiter", slug: "recruiter", industrySlug: "staffing-recruiting", description: "Sources and screens candidates" },
  { name: "People Operations Specialist", slug: "people-operations-specialist", industrySlug: "human-resources", description: "Runs day-to-day people ops" },
  { name: "Compensation Analyst", slug: "compensation-analyst", industrySlug: "human-resources", description: "Designs pay and benefits programs" },
  { name: "Learning & Development Specialist", slug: "learning-development-specialist", industrySlug: "human-resources", description: "Builds training programs" },
  { name: "Marketing Manager", slug: "marketing-manager", industrySlug: "marketing-advertising", description: "Owns marketing strategy and campaigns" },
  { name: "Digital Marketing Specialist", slug: "digital-marketing-specialist", industrySlug: "marketing-advertising", description: "Runs digital acquisition channels" },
  { name: "Content Marketing Manager", slug: "content-marketing-manager", industrySlug: "marketing-advertising", description: "Owns content strategy and production" },
  { name: "SEO Specialist", slug: "seo-specialist", industrySlug: "marketing-advertising", description: "Optimizes search visibility" },
  { name: "Performance Marketing Manager", slug: "performance-marketing-manager", industrySlug: "marketing-advertising", description: "Owns paid acquisition performance" },
  { name: "Brand Manager", slug: "brand-manager", industrySlug: "consumer-goods", description: "Owns brand positioning and growth" },
  { name: "Social Media Manager", slug: "social-media-manager", industrySlug: "marketing-advertising", description: "Manages social channels and community" },
  { name: "Public Relations Manager", slug: "public-relations-manager", industrySlug: "public-relations-communications", description: "Manages media relations and reputation" },
  { name: "Communications Manager", slug: "communications-manager", industrySlug: "public-relations-communications", description: "Owns internal/external communications" },
  { name: "Copywriter", slug: "copywriter", industrySlug: "marketing-advertising", description: "Writes marketing and brand copy" },

  // Sales / customer
  { name: "Account Executive", slug: "account-executive", industrySlug: "computer-software", description: "Closes new business deals" },
  { name: "Sales Development Representative", slug: "sales-development-representative", industrySlug: "computer-software", description: "Prospects and qualifies leads" },
  { name: "Account Manager", slug: "account-manager", industrySlug: "computer-software", description: "Grows and retains customer accounts" },
  { name: "Customer Success Manager", slug: "customer-success-manager", industrySlug: "computer-software", description: "Drives customer adoption and retention" },
  { name: "Sales Manager", slug: "sales-manager", industrySlug: "retail", description: "Leads sales teams and targets" },
  { name: "Business Development Manager", slug: "business-development-manager", industrySlug: "management-consulting", description: "Develops partnerships and new markets" },
  { name: "Customer Support Specialist", slug: "customer-support-specialist", industrySlug: "internet", description: "Handles customer inquiries and issues" },
  { name: "Technical Support Engineer", slug: "technical-support-engineer", industrySlug: "information-technology-services", description: "Provides advanced product support" },

  // Healthcare / life sciences
  { name: "Registered Nurse", slug: "registered-nurse", industrySlug: "hospital-health-care", description: "Provides clinical nursing care" },
  { name: "Physician", slug: "physician", industrySlug: "medical-practice", description: "Diagnoses and treats patients" },
  { name: "Medical Assistant", slug: "medical-assistant", industrySlug: "medical-practice", description: "Supports clinical operations" },
  { name: "Clinical Research Associate", slug: "clinical-research-associate", industrySlug: "pharmaceuticals", description: "Monitors clinical trials" },
  { name: "Pharmacist", slug: "pharmacist", industrySlug: "pharmaceuticals", description: "Dispenses medication and advises patients" },
  { name: "Biomedical Engineer", slug: "biomedical-engineer", industrySlug: "medical-devices", description: "Designs medical devices and systems" },
  { name: "Lab Technician", slug: "lab-technician", industrySlug: "biotechnology", description: "Runs laboratory tests and procedures" },
  { name: "Healthcare Administrator", slug: "healthcare-administrator", industrySlug: "hospital-health-care", description: "Manages healthcare operations" },

  // Education
  { name: "Teacher", slug: "teacher", industrySlug: "education-management", description: "Teaches students in classroom settings" },
  { name: "Professor", slug: "professor", industrySlug: "higher-education", description: "Teaches and researches in higher education" },
  { name: "Instructional Designer", slug: "instructional-designer", industrySlug: "e-learning", description: "Designs learning experiences and curricula" },
  { name: "Curriculum Developer", slug: "curriculum-developer", industrySlug: "e-learning", description: "Develops educational curricula" },
  { name: "Academic Advisor", slug: "academic-advisor", industrySlug: "higher-education", description: "Advises students on academic plans" },
  { name: "School Administrator", slug: "school-administrator", industrySlug: "education-management", description: "Manages school operations" },

  // Ops / supply chain / manufacturing
  { name: "Operations Manager", slug: "operations-manager", industrySlug: "logistics-supply-chain", description: "Owns day-to-day operations" },
  { name: "Supply Chain Manager", slug: "supply-chain-manager", industrySlug: "logistics-supply-chain", description: "Manages end-to-end supply chain" },
  { name: "Logistics Coordinator", slug: "logistics-coordinator", industrySlug: "logistics-supply-chain", description: "Coordinates freight and logistics" },
  { name: "Warehouse Manager", slug: "warehouse-manager", industrySlug: "logistics-supply-chain", description: "Runs warehouse operations" },
  { name: "Procurement Specialist", slug: "procurement-specialist", industrySlug: "logistics-supply-chain", description: "Manages purchasing and vendors" },
  { name: "Quality Assurance Manager", slug: "quality-assurance-manager", industrySlug: "electrical-electronic-manufacturing", description: "Owns quality systems" },
  { name: "Manufacturing Engineer", slug: "manufacturing-engineer", industrySlug: "mechanical-industrial-engineering", description: "Improves manufacturing processes" },
  { name: "Industrial Engineer", slug: "industrial-engineer", industrySlug: "mechanical-industrial-engineering", description: "Optimizes industrial systems" },
  { name: "Mechanical Engineer", slug: "mechanical-engineer", industrySlug: "mechanical-industrial-engineering", description: "Designs mechanical systems" },
  { name: "Electrical Engineer", slug: "electrical-engineer", industrySlug: "electrical-electronic-manufacturing", description: "Designs electrical systems" },
  { name: "Civil Engineer", slug: "civil-engineer", industrySlug: "civil-engineering", description: "Designs civil infrastructure" },
  { name: "Project Engineer", slug: "project-engineer", industrySlug: "construction", description: "Supports engineering projects delivery" },
  { name: "Automation Engineer", slug: "automation-engineer", industrySlug: "industrial-automation", description: "Designs industrial automation systems" },

  // Energy / environment
  { name: "Energy Analyst", slug: "energy-analyst", industrySlug: "oil-energy", description: "Analyzes energy markets and usage" },
  { name: "Petroleum Engineer", slug: "petroleum-engineer", industrySlug: "oil-energy", description: "Develops oil and gas extraction methods" },
  { name: "Renewable Energy Engineer", slug: "renewable-energy-engineer", industrySlug: "renewables-environment", description: "Designs renewable energy systems" },
  { name: "Environmental Scientist", slug: "environmental-scientist", industrySlug: "renewables-environment", description: "Studies environmental impact and remediation" },
  { name: "Sustainability Manager", slug: "sustainability-manager", industrySlug: "renewables-environment", description: "Owns ESG and sustainability programs" },
  { name: "Utility Plant Operator", slug: "utility-plant-operator", industrySlug: "utilities", description: "Operates utility generation plants" },

  // Construction / real estate
  { name: "Construction Project Manager", slug: "construction-project-manager", industrySlug: "construction", description: "Manages construction projects" },
  { name: "Architect", slug: "architect", industrySlug: "architecture-planning", description: "Designs buildings and spaces" },
  { name: "Urban Planner", slug: "urban-planner", industrySlug: "architecture-planning", description: "Plans urban development" },
  { name: "Real Estate Agent", slug: "real-estate-agent", industrySlug: "real-estate", description: "Buys/sells property for clients" },
  { name: "Property Manager", slug: "property-manager", industrySlug: "real-estate", description: "Manages real estate portfolios" },
  { name: "Quantity Surveyor", slug: "quantity-surveyor", industrySlug: "construction", description: "Estimates construction costs" },

  // Retail / hospitality / travel
  { name: "Store Manager", slug: "store-manager", industrySlug: "retail", description: "Runs retail store operations" },
  { name: "Merchandiser", slug: "merchandiser", industrySlug: "retail", description: "Plans product assortment and presentation" },
  { name: "E-commerce Manager", slug: "e-commerce-manager", industrySlug: "internet", description: "Owns online store performance" },
  { name: "Buyer", slug: "buyer", industrySlug: "retail", description: "Selects and purchases inventory" },
  { name: "Hotel Manager", slug: "hotel-manager", industrySlug: "hospitality", description: "Manages hotel operations" },
  { name: "Chef", slug: "chef", industrySlug: "restaurants", description: "Leads kitchen and food preparation" },
  { name: "Restaurant Manager", slug: "restaurant-manager", industrySlug: "restaurants", description: "Runs restaurant operations" },
  { name: "Travel Consultant", slug: "travel-consultant", industrySlug: "travel-tourism", description: "Plans and sells travel packages" },
  { name: "Flight Attendant", slug: "flight-attendant", industrySlug: "airlines-aviation", description: "Ensures passenger safety and service" },
  { name: "Pilot", slug: "pilot", industrySlug: "airlines-aviation", description: "Operates aircraft" },

  // Automotive / transport
  { name: "Automotive Engineer", slug: "automotive-engineer", industrySlug: "automotive", description: "Designs vehicle systems" },
  { name: "Fleet Manager", slug: "fleet-manager", industrySlug: "transportation-trucking-railroad", description: "Manages vehicle fleets" },
  { name: "Transportation Planner", slug: "transportation-planner", industrySlug: "transportation-trucking-railroad", description: "Plans transportation networks" },

  // Media / entertainment
  { name: "Video Editor", slug: "video-editor", industrySlug: "media-production", description: "Edits video content" },
  { name: "Producer", slug: "producer", industrySlug: "media-production", description: "Produces media projects" },
  { name: "Journalist", slug: "journalist", industrySlug: "public-relations-communications", description: "Researches and reports news" },
  { name: "Content Creator", slug: "content-creator", industrySlug: "entertainment", description: "Creates digital media content" },

  // Government / nonprofit / research / general
  { name: "Policy Analyst", slug: "policy-analyst", industrySlug: "government-administration", description: "Analyzes and develops public policy" },
  { name: "Program Manager", slug: "program-manager", industrySlug: "nonprofit-organization-management", description: "Owns multi-project programs" },
  { name: "Grant Writer", slug: "grant-writer", industrySlug: "nonprofit-organization-management", description: "Writes funding proposals" },
  { name: "Research Scientist", slug: "research-scientist", industrySlug: "research", description: "Conducts scientific research" },
  { name: "Research Associate", slug: "research-associate", industrySlug: "research", description: "Supports research projects" },
  { name: "Data Analyst", slug: "data-analyst", industrySlug: "research", description: "Analyzes data to inform decisions" },
  { name: "Project Manager", slug: "project-manager", industrySlug: "management-consulting", description: "Plans and delivers projects" },
  { name: "Office Manager", slug: "office-manager", industrySlug: "human-resources", description: "Runs office administration" },
  { name: "Executive Assistant", slug: "executive-assistant", industrySlug: "human-resources", description: "Supports executives with admin and coordination" },
  { name: "Administrative Assistant", slug: "administrative-assistant", industrySlug: "government-administration", description: "Provides administrative support" },
  { name: "General Manager", slug: "general-manager", industrySlug: "retail", description: "Owns P&L and overall operations" },
  { name: "CEO", slug: "ceo", industrySlug: "management-consulting", description: "Chief Executive Officer" },
  { name: "COO", slug: "coo", industrySlug: "management-consulting", description: "Chief Operating Officer" },
  { name: "Agricultural Scientist", slug: "agricultural-scientist", industrySlug: "agriculture", description: "Applies science to agriculture" },
  { name: "Farm Manager", slug: "farm-manager", industrySlug: "agriculture", description: "Manages farm operations" },
  { name: "Chemist", slug: "chemist", industrySlug: "chemicals", description: "Researches and develops chemical products" },
  { name: "Mining Engineer", slug: "mining-engineer", industrySlug: "mining-metals", description: "Plans mining operations" },
  { name: "Fashion Designer", slug: "fashion-designer", industrySlug: "apparel-fashion", description: "Designs apparel and fashion products" },
  { name: "Food Scientist", slug: "food-scientist", industrySlug: "food-beverages", description: "Develops food products and processes" },
];

function bullmqConnectionFromEnv() {
  const defaults = {
    maxRetriesPerRequest: null as number | null,
    connectTimeout: 5_000,
    enableOfflineQueue: false,
  };
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return { host: "127.0.0.1", port: 6379, ...defaults };
  }
  try {
    const u = new URL(url);
    return {
      host: u.hostname || "127.0.0.1",
      port: Number(u.port || 6379),
      username: u.username || undefined,
      password: u.password || undefined,
      ...defaults,
    };
  } catch {
    return { host: "127.0.0.1", port: 6379, ...defaults };
  }
}

async function main() {
  const connectionString =
    process.env.DIRECT_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://localhost:5432/numee";

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log(
    `Seeding catalog: ${INDUSTRIES.length} industries, ${JOB_ROLES.length} job roles…`,
  );

  const industryIdBySlug = new Map<string, string>();
  let industriesUpserted = 0;

  for (const row of INDUSTRIES) {
    const industry = await prisma.industry.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        description: row.description ?? null,
        isActive: true,
        embeddingStatus: "PENDING",
      },
      update: {
        name: row.name,
        description: row.description ?? null,
        isActive: true,
      },
    });
    industryIdBySlug.set(row.slug, industry.id);
    industriesUpserted += 1;
  }

  let rolesUpserted = 0;
  const roleIds: string[] = [];
  for (const row of JOB_ROLES) {
    const industryId = row.industrySlug
      ? industryIdBySlug.get(row.industrySlug) ?? null
      : null;
    const jobRole = await prisma.jobRole.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        description: row.description ?? null,
        industryId,
        isActive: true,
        embeddingStatus: "PENDING",
      },
      update: {
        name: row.name,
        description: row.description ?? null,
        industryId,
        isActive: true,
      },
    });
    roleIds.push(jobRole.id);
    rolesUpserted += 1;
  }

  console.log(
    `Upserted ${industriesUpserted} industries and ${rolesUpserted} job roles.`,
  );

  // Enqueue embeddings (fail-fast; DB seed already succeeded).
  const CATALOG_EMBEDDINGS_QUEUE = "catalog-embeddings";
  let enqueueOk = 0;
  let enqueueFail = 0;
  const queue = new Queue(CATALOG_EMBEDDINGS_QUEUE, {
    connection: bullmqConnectionFromEnv(),
  });

  try {
    const industryIds = [...industryIdBySlug.values()];
    for (const id of industryIds) {
      try {
        await Promise.race([
          queue.add(
            "embed-catalog",
            { kind: "industry", id },
            {
              removeOnComplete: 100,
              removeOnFail: 50,
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
            },
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("enqueue timeout")), 5000),
          ),
        ]);
        enqueueOk += 1;
      } catch {
        enqueueFail += 1;
        await prisma.industry.updateMany({
          where: { id },
          data: { embeddingStatus: "FAILED" },
        });
      }
    }
    for (const id of roleIds) {
      try {
        await Promise.race([
          queue.add(
            "embed-catalog",
            { kind: "job_role", id },
            {
              removeOnComplete: 100,
              removeOnFail: 50,
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
            },
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("enqueue timeout")), 5000),
          ),
        ]);
        enqueueOk += 1;
      } catch {
        enqueueFail += 1;
        await prisma.jobRole.updateMany({
          where: { id },
          data: { embeddingStatus: "FAILED" },
        });
      }
    }
  } finally {
    await queue.close().catch(() => undefined);
  }

  console.log(
    `Embedding enqueue: ${enqueueOk} ok, ${enqueueFail} failed (run API with Redis/Qdrant/OpenAI to process).`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("seed:catalog failed:", err);
  process.exit(1);
});
