/**
 * Detailed FTA Tariff & Compliance Data
 * Extracted from Trade Connect (trade.gov.in)
 */

export interface HSComplianceDetail {
    hsCode: string;
    product: string;
    mfnRate: number;
    preferentialRate: number;
    agreement: string;
    ruleOfOrigin: string;
    category: string;
}

export const FTA_COMPLIANCE_DETAILS: HSComplianceDetail[] = [
    {
        hsCode: '7208',
        product: 'Flat-rolled products of iron/steel',
        mfnRate: 5,
        preferentialRate: 3,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTH + Value Addition 40%',
        category: 'steel'
    },
    {
        hsCode: '6109',
        product: 'T-shirts, singlets and vests',
        mfnRate: 5,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTH + Value Addition 40%',
        category: 'textiles'
    },
    {
        hsCode: '6203',
        product: "Men's suits, jackets, blazers",
        mfnRate: 5,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTH + Value Addition 40%',
        category: 'textiles'
    },
    {
        hsCode: '2922',
        product: 'Oxygen-function amino-compounds',
        mfnRate: 5,
        preferentialRate: 1,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTSH + Value Addition 40%',
        category: 'chemicals'
    },
    {
        hsCode: '8471',
        product: 'Automatic data processing machines (Computers)',
        mfnRate: 0,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTH + Value Addition 40%',
        category: 'electronics'
    },
    {
        hsCode: '8517',
        product: 'Telephone sets, smartphones, telecom equipment',
        mfnRate: 0,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTH + Value Addition 40%',
        category: 'electronics'
    },
    {
        hsCode: '7113',
        product: 'Articles of jewelry and parts thereof',
        mfnRate: 5,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTH + Value Addition 40%',
        category: 'jewelry'
    },
    {
        hsCode: '0306',
        product: 'Crustaceans (Shrimp, Prawns)',
        mfnRate: 0,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'Wholly Obtained',
        category: 'food'
    },
    {
        hsCode: '1006',
        product: 'Rice',
        mfnRate: 0,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'Wholly Obtained',
        category: 'food'
    },
    {
        hsCode: '0902',
        product: 'Tea',
        mfnRate: 0,
        preferentialRate: 0,
        agreement: 'India-UAE CEPA',
        ruleOfOrigin: 'CTSH + Value Addition 40%',
        category: 'food'
    }
];
