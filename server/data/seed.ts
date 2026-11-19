import type { Lead } from '../types.js';

// Seed data: realistic (fictional) home-decor / singing-bowl buyers in the US.
// Tuple: [name, company, email, phone, website, source, product, city, state, classification, emailStatus, emailed]

const RAW: string[][] = [
  ['Michael Carter', 'Lumen Lighting Plus', 'info@lumenlightingplus.com', '+1 713-555-0142', 'lumenlightingplus.com', 'Google Maps', 'Singing Bowls', 'Houston', 'TX', 'business', 'valid', 'true'],
  ['Sarah Williams', 'Visual Home Decor', 'support@visualhomedecor.com', '+1 713-555-0187', 'visualhomedecor.com', 'Google Maps', 'Home Decor', 'Houston', 'TX', 'business', 'valid', 'true'],
  ['David Thompson', 'Houston Wellness Store', 'hello@houstonwellnessstore.com', '+1 832-555-0110', 'houstonwellnessstore.com', 'Google Search', 'Singing Bowls', 'Houston', 'TX', 'business', 'valid', 'false'],
  ['Priya Sharma', 'Texas Aromas & Decor', 'priya@texasaromasdecor.com', '+1 832-555-0199', 'texasaromasdecor.com', 'LinkedIn', 'Singing Bowls', 'Houston', 'TX', 'business', 'unchecked', 'false'],
  ['James Miller', 'Lone Star Imports', 'james@lonestarimports.com', '+1 214-555-0103', 'lonestarimports.com', 'ImportYeti', 'Home Decor', 'Dallas', 'TX', 'business', 'valid', 'false'],
  ['Emily Davis', 'Dallas Home Collective', 'emily@dallashomecollective.com', '+1 214-555-0164', 'dallashomecollective.com', 'Google Maps', 'Home Decor', 'Dallas', 'TX', 'business', 'valid', 'true'],
  ['Robert Brown', 'Big D Wholesale', 'sales@bigdwholesale.com', '+1 972-555-0121', 'bigdwholesale.com', 'ThomasNet', 'Home Decor', 'Dallas', 'TX', 'business', 'unchecked', 'false'],
  ['Ava Martinez', 'Austin Sound Healing', 'ava@austinsoundhealing.com', '+1 512-555-0178', 'austinsoundhealing.com', 'Google Search', 'Singing Bowls', 'Austin', 'TX', 'individual', 'valid', 'false'],
  ['Linda Nguyen', 'Capital Decor Studio', 'linda@capitaldecorstudio.com', '+1 512-555-0135', 'capitaldecorstudio.com', 'LinkedIn', 'Home Decor', 'Austin', 'TX', 'business', 'valid', 'false'],
  ['Chris Anderson', 'Hill Country Retail', 'chris@hillcountryretail.com', '+1 830-555-0156', 'hillcountryretail.com', 'Google Maps', 'Singing Bowls', 'Austin', 'TX', 'business', 'suspect', 'false'],
  ['Sophia Clark', 'Pacific Home Imports', 'sophia@pacifichomeimports.com', '+1 415-555-0181', 'pacifichomeimports.com', 'ImportYeti', 'Home Decor', 'San Francisco', 'CA', 'business', 'valid', 'true'],
  ['Daniel Lee', 'Bay Area Wellness', 'daniel@bayareawellness.com', '+1 415-555-0129', 'bayareawellness.com', 'Google Maps', 'Singing Bowls', 'San Francisco', 'CA', 'business', 'valid', 'false'],
  ['Olivia Rodriguez', 'Golden Gate Decor', 'olivia@goldengatedecor.com', '+1 510-555-0107', 'goldengatedecor.com', 'LinkedIn', 'Home Decor', 'San Francisco', 'CA', 'business', 'unchecked', 'false'],
  ['Ethan Walker', 'SF Sound & Spirit', 'ethan@gmail.com', '+1 415-555-0193', '', 'Google Search', 'Singing Bowls', 'San Francisco', 'CA', 'individual', 'valid', 'false'],
  ['Isabella Young', 'SoCal Home Furnishings', 'isabella@socalhomefurnishings.com', '+1 213-555-0148', 'socalhomefurnishings.com', 'ThomasNet', 'Home Decor', 'Los Angeles', 'CA', 'business', 'valid', 'false'],
  ['Noah Harris', 'LA Wellness Collective', 'noah@lawellnesscollective.com', '+1 310-555-0166', 'lawellnesscollective.com', 'Google Maps', 'Singing Bowls', 'Los Angeles', 'CA', 'business', 'valid', 'true'],
  ['Mia Thompson', 'Westside Decor Mart', 'mia@westsidedecormart.com', '+1 310-555-0118', 'westsidedecormart.com', 'Google Search', 'Home Decor', 'Los Angeles', 'CA', 'business', 'suspect', 'false'],
  ['Lucas Martin', 'Angel City Imports', 'lucas@angelcityimports.com', '+1 323-555-0154', 'angelcityimports.com', 'ImportYeti', 'Home Decor', 'Los Angeles', 'CA', 'business', 'unchecked', 'false'],
  ['Grace Kim', 'Windy City Decor', 'grace@windycitydecor.com', '+1 312-555-0172', 'windycitydecor.com', 'Google Maps', 'Home Decor', 'Chicago', 'IL', 'business', 'valid', 'false'],
  ['Henry Moore', 'Chicago Sound Therapy', 'henry@chicagosoundtherapy.com', '+1 312-555-0101', 'chicagosoundtherapy.com', 'LinkedIn', 'Singing Bowls', 'Chicago', 'IL', 'business', 'valid', 'false'],
  ['Chloe Taylor', 'Midwest Home Supply', 'chloe@midwesthomesupply.com', '+1 773-555-0188', 'midwesthomesupply.com', 'ThomasNet', 'Home Decor', 'Chicago', 'IL', 'business', 'unchecked', 'false'],
  ['Alexander Reed', 'Lakeview Retail Group', 'alex@lakeviewretailgroup.com', '+1 773-555-0130', 'lakeviewretailgroup.com', 'Google Search', 'Singing Bowls', 'Chicago', 'IL', 'business', 'valid', 'true'],
  ['Zoe Morgan', 'Empire State Decor', 'zoe@empirstatedecor.com', '+1 212-555-0126', 'empirstatedecor.com', 'Google Maps', 'Home Decor', 'New York', 'NY', 'business', 'invalid', 'false'],
  ['Benjamin Hall', 'NYC Wellness Boutique', 'ben@nycwellnessboutique.com', '+1 212-555-0197', 'nycwellnessboutique.com', 'LinkedIn', 'Singing Bowls', 'New York', 'NY', 'business', 'valid', 'false'],
  ['Avery Scott', 'Manhattan Home Goods', 'avery@manhattanhomegoods.com', '+1 646-555-0159', 'manhattanhomegoods.com', 'Google Search', 'Home Decor', 'New York', 'NY', 'business', 'valid', 'false'],
  ['Jacob Allen', 'Brooklyn Sound Studio', 'jacob@yahoo.com', '+1 718-555-0133', '', 'Google Maps', 'Singing Bowls', 'New York', 'NY', 'individual', 'valid', 'false'],
  ['Ella Wright', 'Sunshine State Decor', 'ella@sunshinestatedecor.com', '+1 305-555-0112', 'sunshinestatedecor.com', 'ThomasNet', 'Home Decor', 'Miami', 'FL', 'business', 'unchecked', 'false'],
  ['William Green', 'Miami Wellness Hub', 'william@miamiwellnesshub.com', '+1 305-555-0174', 'miamiwellnesshub.com', 'Google Maps', 'Singing Bowls', 'Miami', 'FL', 'business', 'valid', 'false'],
  ['Scarlett Baker', 'South Beach Imports', 'scarlett@southbeachimports.com', '+1 786-555-0161', 'southbeachimports.com', 'ImportYeti', 'Home Decor', 'Miami', 'FL', 'business', 'valid', 'false'],
  ['Andrew Adams', 'Evergreen Home Decor', 'andrew@evergreenhomedecor.com', '+1 206-555-0196', 'evergreenhomedecor.com', 'LinkedIn', 'Home Decor', 'Seattle', 'WA', 'business', 'valid', 'false'],
  ['Harper Nelson', 'Seattle Sound Healing', 'harper@seattlesoundhealing.com', '+1 206-555-0120', 'seattlesoundhealing.com', 'Google Search', 'Singing Bowls', 'Seattle', 'WA', 'business', 'unchecked', 'false'],
  ['Elijah Campbell', 'Emerald City Retail', 'elijah@emeraldcityretail.com', '+1 425-555-0183', 'emeraldcityretail.com', 'Google Maps', 'Home Decor', 'Seattle', 'WA', 'business', 'valid', 'false'],
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const seedLeads: Lead[] = RAW.map((r, i): Lead => ({
  id: `lead_${String(i + 1).padStart(3, '0')}`,
  name: r[0],
  company: r[1],
  email: r[2],
  phone: r[3],
  website: r[4],
  source: r[5],
  product: r[6],
  city: r[7],
  state: r[8],
  country: 'United States',
  classification: r[9] as Lead['classification'],
  classificationConfidence: r[9] === 'business' ? 0.94 : 0.88,
  classificationReason:
    r[9] === 'business'
      ? 'Company / retailer domain with B2B signals (imports, wholesale, showroom).'
      : 'Personal email provider or individual practitioner profile.',
  emailStatus: r[10] as Lead['emailStatus'],
  emailCheckedAt: r[10] === 'unchecked' ? null : isoDaysAgo(i % 9),
  emailed: r[11] === 'true',
  dateAdded: isoDaysAgo(30 - (i % 30)),
}));
