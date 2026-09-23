// ============================================================================
// DGFT Certificate of Origin — Draft Payload Mapper
// Trade Notice 25/2026-27, Phase 1
//
// Builds the raw, unencrypted JSON payload shape expected by POST /coo/file.
// This module only maps ComplianceOS records to that shape — it does not
// encrypt, sign, or dispatch anything. Callers must run
// validateCoOPreflight() first and pass a stable requestId for idempotency.
// ============================================================================

import type { CoOShipmentInput, CompanyProfile } from '@/types'
import { lookupState, lookupPort, lookupTradeAgreement, lookupUom } from '@/lib/dgft-reference-maps'

export interface DgftCoOPayload {
  requestId: string
  exporter: {
    name: string
    iec: string
    gstin?: string
    address?: string
    city?: string
    /** State name as the annexure spells it; the API takes the name. */
    state?: string
    district?: string
    pin?: string
  }
  producer?: {
    details: string
  }
  consignee: {
    name?: string
    address?: string
    email?: string
  }
  shipmentDetails: {
    invoiceNumber?: string
    invoiceDate?: string
    portOfLoadingCode?: string
    portOfDischargeCode?: string
    transportMode?: string
    packageMarksNumbers?: string
  }
  goods: {
    description?: string
    hsCode?: string
    quantity?: number
    uomCode?: string
    fobValueUsd?: number
    originCriterion?: string
  }
  agreement: {
    id: string
    code?: string
    issuingOffice?: string
    isExhibition?: boolean
    rollUpAbsorption?: boolean
  }
  retrospective: {
    isRetrospective: boolean
    reason?: string
  }
}

export function buildDgftCoODataPayload(
  shipment: CoOShipmentInput,
  company: CompanyProfile,
  opts: { requestId: string; tradeAgreementId: string; preferenceCriterion: string; rollUpAbsorption?: boolean }
): DgftCoOPayload {
  const state = company.state ? lookupState(company.state) : undefined
  const agreement = lookupTradeAgreement(opts.tradeAgreementId)
  const uomEntry = shipment.uom ? lookupUom(shipment.uom) : undefined

  return {
    requestId: opts.requestId,
    exporter: {
      name: company.name,
      iec: company.iec ?? '',
      gstin: company.gstin,
      address: company.address,
      city: company.city,
      state,
      district: shipment.district,
      pin: company.pin,
    },
    producer: shipment.producerDetails ? { details: shipment.producerDetails } : undefined,
    consignee: {
      name: shipment.buyer,
      address: shipment.importerAddress,
      email: shipment.importerEmail,
    },
    shipmentDetails: {
      invoiceNumber: shipment.invoiceNumber,
      invoiceDate: shipment.invoiceDate,
      portOfLoadingCode: shipment.portOfLoading ? lookupPort(shipment.portOfLoading)?.code : undefined,
      portOfDischargeCode: shipment.portOfDischarge ? lookupPort(shipment.portOfDischarge)?.code : undefined,
      transportMode: shipment.transportMode,
      packageMarksNumbers: shipment.packageMarksNumbers,
    },
    goods: {
      description: shipment.name ?? shipment.product,
      hsCode: shipment.hsCode,
      quantity: shipment.quantity,
      uomCode: uomEntry?.code,
      fobValueUsd: shipment.shipmentValue,
      originCriterion: opts.preferenceCriterion,
    },
    agreement: {
      id: opts.tradeAgreementId,
      code: agreement?.code,
      issuingOffice: agreement?.issuingOffice,
      isExhibition: shipment.isExhibition,
      rollUpAbsorption: opts.rollUpAbsorption,
    },
    retrospective: {
      isRetrospective: shipment.isRetrospective ?? false,
      reason: shipment.reasonRetrospective,
    },
  }
}
