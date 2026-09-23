// ============================================================================
// DGFT Certificate of Origin — Pre-Flight Payload Validator
// Trade Notice 25/2026-27, Phase 1
//
// Rejection by the DGFT API costs days (resubmission queue) and fees, so
// every rule that can be checked locally must be checked locally first.
// This validator never talks to DGFT — it only checks the shipment/company
// data ComplianceOS already has, plus the existing sanctions-check edge
// function reused for the Denied Entity List (DEL) screen.
// ============================================================================

import { supabase } from '@/lib/supabase'
import type { CoOShipmentInput, CompanyProfile, SanctionsCheckResult } from '@/types'
import {
  lookupState,
  lookupDistrict,
  lookupPort,
  lookupCountry,
  lookupUom,
  lookupTradeAgreement,
  lookupOriginCriterion,
} from '@/lib/dgft-reference-maps'

export interface CoOApplicationData {
  tradeAgreementId: string
  preferenceCriterion: string
  destinationCountryIso?: string
  rollUpAbsorption?: boolean
  /** Pass a pre-fetched sanctions result to avoid a duplicate network call
   *  when the caller already screened this company elsewhere in the flow. */
  sanctionsCheck?: SanctionsCheckResult
}

export interface CoOValidationError {
  field: string
  message: string
}

export interface CoOValidationResult {
  valid: boolean
  errors: CoOValidationError[]
}

async function checkDeniedEntityList(company: CompanyProfile, prefetched?: SanctionsCheckResult): Promise<CoOValidationError[]> {
  const errors: CoOValidationError[] = []
  if (!company.iec || company.iec.trim().length === 0) {
    errors.push({ field: 'company.iec', message: 'IEC is required for DGFT DEL screening' })
    return errors
  }
  if (!company.name || company.name.trim().length < 3) {
    errors.push({ field: 'company.name', message: 'Company name is required for DEL screening' })
    return errors
  }

  let result = prefetched
  if (!result) {
    const { data, error } = await supabase.functions.invoke('sanctions-check', { body: { name: company.name } })
    if (error) {
      errors.push({ field: 'company.iec', message: 'DEL screening unavailable — could not reach sanctions screening service' })
      return errors
    }
    result = data as SanctionsCheckResult
  }

  if ((result?.risk_level as string) === 'error') {
    errors.push({ field: 'company.iec', message: 'DEL screening unavailable — sanctions database not seeded' })
  } else if (result?.risk_level === 'block') {
    errors.push({ field: 'company.iec', message: `Company matches Denied Entity List (${result.matches[0]?.program ?? 'sanctions list'}) — cannot file CoO` })
  } else if (result?.risk_level === 'flag') {
    errors.push({ field: 'company.iec', message: `Company name is similar to a listed entity ("${result.matches[0]?.name}") — manual verification required before filing` })
  }
  return errors
}

function checkReferenceTables(shipment: CoOShipmentInput, applicationData: CoOApplicationData): CoOValidationError[] {
  const errors: CoOValidationError[] = []

  if (!shipment.portOfLoading || !lookupPort(shipment.portOfLoading)) {
    errors.push({ field: 'shipment.portOfLoading', message: `Port of loading "${shipment.portOfLoading ?? ''}" is not a recognised DGFT port code` })
  }
  if (shipment.portOfDischarge && !lookupPort(shipment.portOfDischarge)) {
    errors.push({ field: 'shipment.portOfDischarge', message: `Port of discharge "${shipment.portOfDischarge}" is not a recognised DGFT port code` })
  }
  if (applicationData.destinationCountryIso && !lookupCountry(applicationData.destinationCountryIso)) {
    errors.push({ field: 'destinationCountryIso', message: `Destination country ISO code "${applicationData.destinationCountryIso}" is not a recognised DGFT country code` })
  }
  if (!shipment.uom || !lookupUom(shipment.uom)) {
    errors.push({ field: 'shipment.uom', message: `Unit of measure "${shipment.uom ?? ''}" is not a recognised DGFT UOM code` })
  }
  const agreement = lookupTradeAgreement(applicationData.tradeAgreementId)
  if (!agreement) {
    errors.push({ field: 'tradeAgreementId', message: `Trade agreement "${applicationData.tradeAgreementId}" is not a recognised DGFT agreement` })
  }
  if (!lookupOriginCriterion(applicationData.preferenceCriterion)) {
    errors.push({ field: 'preferenceCriterion', message: `Preference criterion "${applicationData.preferenceCriterion}" is not a recognised origin criterion code` })
  }

  return errors
}

function checkStateAndDistrict(company: CompanyProfile, shipment: CoOShipmentInput): CoOValidationError[] {
  const errors: CoOValidationError[] = []
  if (!company.state || !lookupState(company.state)) {
    errors.push({ field: 'company.state', message: `State "${company.state ?? ''}" is not a recognised DGFT state code` })
    return errors
  }
  if (shipment.district) {
    const stateEntry = lookupState(company.state)!
    if (!lookupDistrict(stateEntry.code, shipment.district)) {
      errors.push({ field: 'shipment.district', message: `District "${shipment.district}" is not recognised for state "${company.state}"` })
    }
  }
  return errors
}

function checkAgreementConditionalRules(shipment: CoOShipmentInput, applicationData: CoOApplicationData): CoOValidationError[] {
  const errors: CoOValidationError[] = []
  const agreement = lookupTradeAgreement(applicationData.tradeAgreementId)
  if (!agreement) return errors // already reported by checkReferenceTables

  if (agreement.requiresExhibitionFlag && shipment.isExhibition === undefined) {
    errors.push({ field: 'shipment.isExhibition', message: `Trade agreement "${agreement.name}" requires isExhibition to be set` })
  }
  if (agreement.requiresRollUpAbsorption && applicationData.rollUpAbsorption === undefined) {
    errors.push({ field: 'rollUpAbsorption', message: `Trade agreement "${agreement.name}" requires rollUpAbsorption to be set` })
  }

  if (shipment.isRetrospective) {
    if (!shipment.reasonRetrospective || shipment.reasonRetrospective.trim().length === 0) {
      errors.push({ field: 'shipment.reasonRetrospective', message: 'reasonRetrospective is required when filing retrospectively' })
    }
  } else if (shipment.date) {
    const shipmentDate = new Date(shipment.date)
    const today = new Date(new Date().toISOString().slice(0, 10))
    if (!Number.isNaN(shipmentDate.getTime()) && shipmentDate > today && (!shipment.reasonRetrospective || shipment.reasonRetrospective.trim().length === 0)) {
      errors.push({ field: 'shipment.reasonRetrospective', message: 'reasonRetrospective is required when the shipment date is in the future' })
    }
  }

  return errors
}

function checkHsCodeAndInvoiceConsistency(shipment: CoOShipmentInput): CoOValidationError[] {
  const errors: CoOValidationError[] = []
  const hs = (shipment.hsCode ?? '').replace(/\D/g, '')
  if (hs.length !== 8) {
    errors.push({ field: 'shipment.hsCode', message: `HS code must be exactly 8 numeric digits, got "${shipment.hsCode ?? ''}"` })
  }

  if (!shipment.invoiceNumber || shipment.invoiceNumber.trim().length === 0) {
    errors.push({ field: 'shipment.invoiceNumber', message: 'Invoice number is required' })
  }
  if (!shipment.invoiceDate || shipment.invoiceDate.trim().length === 0) {
    errors.push({ field: 'shipment.invoiceDate', message: 'Invoice date is required' })
  }

  const productDescription = (shipment.name ?? shipment.product ?? '').trim().toLowerCase()
  if (productDescription.length === 0) {
    errors.push({ field: 'shipment.name', message: 'Description of goods is required and must match the invoice' })
  }

  return errors
}

export async function validateCoOPreflight(
  shipment: CoOShipmentInput,
  company: CompanyProfile,
  applicationData: CoOApplicationData
): Promise<CoOValidationResult> {
  const errors: CoOValidationError[] = []

  errors.push(...(await checkDeniedEntityList(company, applicationData.sanctionsCheck)))
  errors.push(...checkReferenceTables(shipment, applicationData))
  errors.push(...checkStateAndDistrict(company, shipment))
  errors.push(...checkAgreementConditionalRules(shipment, applicationData))
  errors.push(...checkHsCodeAndInvoiceConsistency(shipment))

  return { valid: errors.length === 0, errors }
}
