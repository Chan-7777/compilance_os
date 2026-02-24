// ============================================================================
// Label Validator - Validate product labels against country-specific rules
// ============================================================================

import type { CountryCode, LabelValidationResult, LabelRuleResult } from '@/types'
import { getLabelRulesForProduct } from '@/data/label-rules'

/**
 * Validate a product label against country-specific rules.
 *
 * @param product - Product category ID (e.g., 'food', 'textiles')
 * @param country - Target country code
 * @param answers - Map of rule ID → boolean (true = compliant, false = not compliant)
 * @returns Full validation result with score, status, and per-rule breakdown
 */
export function validateLabel(
    product: string,
    country: CountryCode,
    answers: Record<string, boolean>
): LabelValidationResult {
    const rules = getLabelRulesForProduct(country, product)

    if (rules.length === 0) {
        return {
            score: 0,
            totalRules: 0,
            passedRules: 0,
            failedRules: 0,
            skippedRules: 0,
            results: [],
            overallStatus: 'compliant',
        }
    }

    const results: LabelRuleResult[] = rules.map(rule => {
        // If the rule doesn't apply to this product, mark as skipped
        if (rule.appliesTo !== 'all' && rule.appliesTo !== product) {
            return { rule, status: 'skipped' as const }
        }

        const answer = answers[rule.id]
        if (answer === undefined) {
            // Not answered yet — treat as fail for scoring
            return { rule, status: 'fail' as const }
        }

        return { rule, status: answer ? 'pass' as const : 'fail' as const }
    })

    const applicableResults = results.filter(r => r.status !== 'skipped')
    const passedRules = applicableResults.filter(r => r.status === 'pass').length
    const failedRules = applicableResults.filter(r => r.status === 'fail').length
    const skippedRules = results.filter(r => r.status === 'skipped').length
    const totalApplicable = applicableResults.length

    const score = totalApplicable > 0
        ? Math.round((passedRules / totalApplicable) * 100)
        : 0

    let overallStatus: LabelValidationResult['overallStatus']
    if (score === 100) {
        overallStatus = 'compliant'
    } else if (score >= 50) {
        overallStatus = 'partially_compliant'
    } else {
        overallStatus = 'non_compliant'
    }

    // If any mandatory rule fails, cannot be fully compliant
    const mandatoryFailed = applicableResults.some(
        r => r.status === 'fail' && r.rule.severity === 'mandatory'
    )
    if (mandatoryFailed && overallStatus === 'compliant') {
        overallStatus = 'partially_compliant'
    }

    return {
        score,
        totalRules: rules.length,
        passedRules,
        failedRules,
        skippedRules,
        results,
        overallStatus,
    }
}

/**
 * Get a summary of failed mandatory rules for quick display
 */
export function getFailedMandatoryRules(result: LabelValidationResult): LabelRuleResult[] {
    return result.results.filter(
        r => r.status === 'fail' && r.rule.severity === 'mandatory'
    )
}

/**
 * Get rules grouped by category for display
 */
export function groupResultsByCategory(
    results: LabelRuleResult[]
): Record<string, LabelRuleResult[]> {
    return results.reduce(
        (acc, result) => {
            const cat = result.rule.category
            if (!acc[cat]) acc[cat] = []
            acc[cat].push(result)
            return acc
        },
        {} as Record<string, LabelRuleResult[]>
    )
}
