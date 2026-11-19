/**
 * Industrial Waste AI Chatbot Knowledge Engine
 * Fulfills System Architecture requirement: AI Chatbot (Chat Interface)
 */

const KNOWLEDGE_BASE = [
  {
    keywords: ['plastic', 'hdpe', 'pp', 'pet', 'polypropylene', 'polymer'],
    answer: 'Industrial plastic waste (HDPE, PP, PET, LDPE) can be shredded, washed, and pelletized into secondary circular polymers. Common industrial applications include injection molding crates, packaging pallets, and structural composite lumber. Ensure scrap is segregated by polymer type code (1-7) to maximize market value.',
    sdg: 'SDG 12: Responsible Consumption and Production'
  },
  {
    keywords: ['metal', 'aluminium', 'copper', 'steel', 'scrap', 'slag', 'turnings'],
    answer: 'Ferrous and non-ferrous metal turnings and scrap retain nearly 100% recyclability. Re-smelting recycled aluminium uses up to 95% less energy than virgin bauxite smelting, drastically lowering industrial carbon footprints. Ensure scrap is free of cutting oils or hydraulic fluids prior to dispatch.',
    sdg: 'SDG 9: Industry, Innovation, and Infrastructure'
  },
  {
    keywords: ['fly ash', 'ash', 'boiler', 'cement', 'concrete'],
    answer: 'Fly ash from thermal power generation is a premier pozzolanic raw material for Portland Pozzolana Cement (PPC), ready-mix concrete, and autoclaved aerated concrete (AAC) blocks. It improves long-term compressive strength and reduces heat of hydration.',
    sdg: 'SDG 9 & SDG 12'
  },
  {
    keywords: ['organic', 'compost', 'biomass', 'food waste', 'agricultural'],
    answer: 'Industrial organic residues and agricultural offcuts can be diverted into biogas biomethanation units, vermicomposting facilities, or biochar production. This avoids methane emissions from landfilling and restores soil organic carbon.',
    sdg: 'SDG 12 & SDG 13: Climate Action'
  },
  {
    keywords: ['match', 'how does matching work', 'algorithm', 'score'],
    answer: 'Our rule-based matching engine evaluates 5 dimensions: (1) Material category compatibility (35%), (2) Material title keyword similarity (25%), (3) Quantity band alignment (20%), (4) Location proximity and transport corridors (15%), and (5) Quality grade specification (5%). Pairs scoring 35%+ are surfaced to industries for exchange.',
    sdg: 'SDG 9: Platform Innovation'
  },
  {
    keywords: ['transport', 'cost', 'logistics', 'vehicle'],
    answer: 'Transport costs are computed based on freight distance, gross payload weight, and vehicle classification (LCV under 2T, MCV 2-5T, HCV over 5T). Consolidating regional pickup schedules significantly minimizes transport expenses and diesel emissions.',
    sdg: 'SDG 12'
  },
  {
    keywords: ['compliance', 'manifest', 'hazard', 'hazardous', 'legal', 'cpcb'],
    answer: 'Under industrial waste regulations (such as CPCB guidelines in India), non-hazardous circular wastes require standard commercial consignment notes, GST e-way bills, and material delivery manifests. Hazardous wastes must follow specialized manifest and authorization frameworks.',
    sdg: 'Regulatory Compliance'
  }
];

function answerIndustrialQuery(query = '') {
  const normalized = query.toLowerCase();

  for (const item of KNOWLEDGE_BASE) {
    if (item.keywords.some(kw => normalized.includes(kw))) {
      return {
        reply: item.answer,
        sdgImpact: item.sdg,
        source: 'Industrial Waste Exchange Advisory Engine'
      };
    }
  }

  return {
    reply: `I specialize in circular industrial waste repurposing, matching logistics, and regulatory compliance. You can ask me about:
• Plastic, Metal, Ash, or Organic waste recovery processes
• How the Rule-Based Matching Algorithm computes affinity scores
• Transportation guidelines and cost estimation
• Industrial symbiosis and SDG 9/12 metrics`,
    sdgImpact: 'SDG 9 & 12',
    source: 'Circular Economy Assistant'
  };
}

module.exports = {
  answerIndustrialQuery,
};

