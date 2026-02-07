// ============================================================================
// Regulatory Database - Country-specific compliance requirements
// ============================================================================

import type { CountryCode, CountryRegulation, RegulatoryDatabase } from '@/types'

export const COUNTRY_CODES: CountryCode[] = ['EU', 'US', 'UK', 'UAE', 'Japan', 'Australia']

export const REGULATORY_DB: RegulatoryDatabase = {
  EU: {
    name: 'European Union',
    flag: '🇪🇺',
    cbam: {
      active: true,
      phase: 'Transitional (reporting only until 2026, financial adjustment from 2026)',
      coveredSectors: [
        'steel',
        'iron',
        'aluminium',
        'cement',
        'fertilizers',
        'electricity',
        'hydrogen',
        'chemicals',
      ],
      reportingFrequency: 'Quarterly',
      penaltyPerTonne: '€50-100 (linked to EU ETS price)',
      keyDates: [
        { date: '2023-10-01', event: 'CBAM transitional period began' },
        { date: '2025-12-31', event: 'End of simplified reporting' },
        { date: '2026-01-01', event: 'Financial adjustments begin' },
        { date: '2034-01-01', event: 'Full CBAM implementation, free allowances phased out' },
      ],
    },
    esg: {
      csrd: true,
      taxonomy: true,
      dueDiligence: 'CSDDD (Corporate Sustainability Due Diligence Directive)',
      reportingStandards: ['ESRS', 'GRI (accepted)', 'ISSB (partial)'],
      scope3Required: true,
    },
    certifications: {
      general: ['CE Marking', 'EU Declaration of Conformity'],
      food: [
        'FSSAI Export Certificate',
        'EU Organic Certification',
        'HACCP',
        'BRC Global Standard',
        'Phytosanitary Certificate',
      ],
      textiles: [
        'REACH Compliance',
        'OEKO-TEX Standard 100',
        'GOTS (for organic)',
        'EU Ecolabel',
      ],
      chemicals: [
        'REACH Registration',
        'CLP Classification',
        'Safety Data Sheet (SDS)',
        'Biocidal Products Regulation',
      ],
      electronics: ['RoHS Compliance', 'WEEE Directive', 'EU Energy Label', 'EMC Directive'],
      steel: [
        'EN Standards Certification',
        'Mill Test Certificate 3.1',
        'Carbon Content Declaration',
      ],
      pharma: [
        'EU GMP Certificate',
        'Marketing Authorization',
        'GDP Compliance',
        'Qualified Person Release',
      ],
      automotive: ['ECE Type Approval', 'IATF 16949', 'IMDS Compliance'],
      machinery: [
        'Machinery Directive 2006/42/EC',
        'Pressure Equipment Directive',
        'ATEX Directive',
      ],
    },
    packaging: [
      'EU Packaging & Packaging Waste Directive',
      'Extended Producer Responsibility (EPR)',
      'Single-Use Plastics Directive',
    ],
    labeling: [
      'Multilingual labeling (destination country language)',
      'Nutritional information (food)',
      'Allergen declarations',
      'Country of origin marking',
    ],
    customs: [
      'EUR.1 Movement Certificate',
      'Invoice Declaration',
      'Binding Tariff Information (BTI)',
    ],
    sanctions: [],
    recentChanges: [
      {
        date: '2024-07',
        change: 'EU Deforestation Regulation (EUDR) enforcement postponed to Dec 2025',
      },
      { date: '2024-10', change: 'CBAM reporting simplified for small importers' },
      {
        date: '2025-01',
        change: 'Digital Product Passport requirements announced for batteries',
      },
    ],
  },

  US: {
    name: 'United States',
    flag: '🇺🇸',
    cbam: {
      active: false,
      phase: 'Proposed (Clean Competition Act introduced but not enacted)',
      coveredSectors: ['steel', 'aluminium', 'cement', 'chemicals'],
      notes: 'Monitor legislative progress; may be enacted in modified form',
    },
    esg: {
      secClimate: true,
      reportingStandards: ['SEC Climate Disclosure Rule', 'California SB 253/261'],
      scope3Required: false,
      notes: 'SEC rule facing legal challenges; California rules in effect for large companies',
    },
    certifications: {
      general: [
        'FDA Registration (food/drugs/cosmetics)',
        'UL Certification',
        'FCC Certification',
      ],
      food: [
        'FDA FSVP Compliance',
        'USDA Organic (if claimed)',
        'Bioterrorism Act Registration',
        'HACCP',
        'FSMA Compliance',
        'Prior Notice of Import',
      ],
      textiles: [
        'CPSIA Compliance',
        'Flammability Standards (16 CFR 1610)',
        'Textile Fiber Products ID Act',
        'Care Labeling Rule',
      ],
      chemicals: [
        'TSCA Compliance',
        'EPA Registration',
        'California Prop 65',
        'Safety Data Sheet',
      ],
      electronics: [
        'FCC Part 15',
        'UL/ETL Safety Mark',
        'Energy Star (voluntary)',
        'California CEC',
      ],
      steel: [
        'Buy America / Buy American Act (if govt)',
        'ASTM Standards',
        'Mill Certifications',
      ],
      pharma: [
        'FDA NDA/ANDA Approval',
        'DEA Registration',
        'USP Standards Compliance',
        'cGMP Compliance',
      ],
      automotive: ['FMVSS Compliance', 'EPA Emissions Certification', 'DOT Marking'],
    },
    packaging: [
      'State-level EPR laws (CA, ME, OR, CO)',
      'Lacey Act (wood packaging)',
      'ISPM 15 Wood Packaging',
    ],
    labeling: [
      'English language required',
      'FTC Made in USA guidelines',
      'Country of origin marking (19 USC 1304)',
      'Nutritional Facts Panel (food)',
    ],
    customs: [
      'Commercial Invoice',
      'Packing List',
      'Bill of Lading',
      'Certificate of Origin',
      'ISF 10+2 Filing',
    ],
    sanctions: [
      'OFAC compliance required',
      'Entity List screening',
      'EAR compliance for dual-use goods',
    ],
    recentChanges: [
      {
        date: '2024-06',
        change:
          'Section 301 tariffs increased on Chinese goods (affects competitive landscape)',
      },
      {
        date: '2025-01',
        change: 'New forced labor import restrictions under UFLPA expanded',
      },
    ],
  },

  UK: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    cbam: {
      active: true,
      phase: 'UK CBAM announced, effective January 2027',
      coveredSectors: [
        'steel',
        'iron',
        'aluminium',
        'cement',
        'fertilizers',
        'ceramics',
        'glass',
        'hydrogen',
      ],
      keyDates: [{ date: '2027-01-01', event: 'UK CBAM takes effect' }],
    },
    esg: {
      tcfd: true,
      reportingStandards: [
        'TCFD',
        'UK Sustainability Disclosure Standards (UK SDS)',
        'ISSB-aligned',
      ],
      scope3Required: false,
    },
    certifications: {
      general: ['UKCA Marking', 'UK Declaration of Conformity'],
      food: [
        'DEFRA Import Authorization',
        'Health Certificate',
        'Phytosanitary Certificate',
        'HACCP',
      ],
      textiles: ['UK REACH', 'UKCA Marking', 'Flammability Standards'],
      chemicals: ['UK REACH Registration', 'CLP (UK)', 'Safety Data Sheet'],
      electronics: ['UKCA Mark', 'UK RoHS', 'EMC Regulations 2016'],
      steel: ['BS EN Standards', 'Mill Test Certificate'],
    },
    packaging: [
      'UK Plastic Packaging Tax',
      'Extended Producer Responsibility',
      'UK Packaging Waste Regulations',
    ],
    labeling: ['English language', 'UK importer details required', 'UKCA mark placement'],
    customs: ['Certificate of Origin', 'Commercial Invoice', 'Customs Declaration (CDS)'],
    sanctions: ['OFSI compliance', 'UK Sanctions List screening'],
    recentChanges: [
      {
        date: '2024-12',
        change: 'India-UK FTA negotiations ongoing; interim trade provisions',
      },
      { date: '2025-02', change: 'UKCA marking transition deadline extended' },
    ],
  },

  UAE: {
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    cbam: { active: false, phase: 'Not applicable' },
    esg: {
      reportingStandards: ['ADX ESG Disclosure Guide', 'DFSA ESG rules'],
      scope3Required: false,
    },
    certifications: {
      general: ['ECAS Certificate', 'Emirates Conformity Assessment Scheme'],
      food: [
        'Dubai Municipality Import Permit',
        'Halal Certification (mandatory for meat)',
        'Health Certificate',
        'ESMA Registration',
      ],
      textiles: ['UAE.S quality marks', 'ECAS for textiles'],
      chemicals: ['ECAS Registration', 'MSDS in Arabic'],
    },
    packaging: ['Arabic labeling mandatory', 'Shelf life requirements'],
    labeling: [
      'Arabic + English bilingual',
      'Halal marking where applicable',
      'Expiry date in hijri and gregorian',
    ],
    customs: [
      'Certificate of Origin',
      'Commercial Invoice (legalized)',
      'Packing List',
    ],
    sanctions: [],
    recentChanges: [
      {
        date: '2024-09',
        change: 'India-UAE CEPA benefits expanded to more product lines',
      },
    ],
  },

  Japan: {
    name: 'Japan',
    flag: '🇯🇵',
    cbam: {
      active: false,
      phase: 'GX League voluntary carbon pricing; mandatory CBAM under discussion',
    },
    esg: {
      reportingStandards: [
        'ISSB-aligned',
        'TCFD (widely adopted)',
        'Japan Sustainability Standards Board (JSSB)',
      ],
      scope3Required: false,
    },
    certifications: {
      general: ['JIS Mark', 'PSE Mark (electrical)', 'JAS (agricultural)'],
      food: [
        'Plant Quarantine Certificate',
        'JAS Organic',
        'Food Sanitation Act Compliance',
        'Radioactivity Certificate',
      ],
      textiles: ['JIS Standards', 'Azo Dye-Free Certification', 'Fire Safety Law Compliance'],
      chemicals: [
        'CSCL (Chemical Substances Control Law)',
        'PRTR Registration',
        'Safety Data Sheet (Japanese)',
      ],
      electronics: ['PSE Mark', 'VCCI Mark (EMC)', 'S-Mark', 'Energy Saving Act'],
      steel: ['JIS Certification', 'Mill Test Certificate'],
    },
    packaging: ['Containers and Packaging Recycling Law', 'Green Mark system'],
    labeling: [
      'Japanese language mandatory',
      'JAS labeling',
      'Nutritional labeling (food)',
      'Country of origin',
    ],
    customs: [
      'Certificate of Origin (for RCEP preferential tariff)',
      'Invoice',
      'Certificate of Conformity',
    ],
    sanctions: [],
    recentChanges: [{ date: '2024-11', change: 'RCEP tariff reductions Phase 3 effective' }],
  },

  Australia: {
    name: 'Australia',
    flag: '🇦🇺',
    cbam: {
      active: false,
      phase: 'Safeguard Mechanism for domestic emitters; CBAM under consultation',
    },
    esg: {
      reportingStandards: ['AASB Sustainability Standards (ISSB-aligned)', 'ASRS 1 & ASRS 2'],
      scope3Required: true,
    },
    certifications: {
      general: ['RCM (Regulatory Compliance Mark)', 'SAI Global'],
      food: [
        'DAFF Import Permit',
        'Phytosanitary Certificate',
        'HACCP',
        'Biosecurity Import Conditions (BICON)',
      ],
      textiles: ['Product Safety Standards', 'Care Labeling Standard AS/NZS 1957'],
      chemicals: [
        'AICIS (Industrial Chemicals)',
        'APVMA (agricultural chemicals)',
        'Safety Data Sheet',
      ],
      electronics: ['RCM Mark', 'AS/NZS Standards', 'Energy Rating Label'],
    },
    packaging: [
      'Australian Packaging Covenant',
      'REDcycle alternatives',
      'National Packaging Targets',
    ],
    labeling: [
      'English language',
      'Country of origin labeling (mandatory for food)',
      'Standard of Identity',
    ],
    customs: [
      'Certificate of Origin (AIFTA/RCEP)',
      'Commercial Invoice',
      'Packing Declaration',
    ],
    sanctions: ['DFAT Consolidated List screening'],
    recentChanges: [
      { date: '2024-07', change: 'India-Australia ECTA tariff reductions Phase 2' },
      { date: '2025-01', change: 'Mandatory climate reporting begins for large entities' },
    ],
  },
}

// Helper function to get country data
export function getCountryData(countryCode: CountryCode): CountryRegulation | undefined {
  return REGULATORY_DB[countryCode]
}

// Helper function to check if a product is covered by CBAM in a country
export function isProductCoveredByCBAM(countryCode: CountryCode, productId: string): boolean {
  const country = REGULATORY_DB[countryCode]
  if (!country?.cbam?.active) return false
  const sectors = country.cbam.coveredSectors || []
  return sectors.includes(productId)
}

// Helper function to get certifications for a product in a country
export function getCertifications(countryCode: CountryCode, productId: string): string[] {
  const country = REGULATORY_DB[countryCode]
  if (!country) return []
  return country.certifications[productId] || country.certifications.general || []
}
