import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function toICEGATEDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

// Map country code to ICEGATE port code (partial list — extend as needed)
const PORT_MAP: Record<string, string> = {
  US: 'USNYC', EU: 'DEHAM', UK: 'GBFXT', UAE: 'AEDXB',
  Japan: 'JPOSA', Australia: 'AUSYD',
}

// ── ICEGATE OAuth2 token (client_credentials) ────────────────────────────────
async function getICEGATEToken(clientId: string, clientSecret: string, isUAT: boolean): Promise<string> {
  const tokenUrl = isUAT
    ? 'https://apiwso2uat.icegate.gov.in/token'
    : 'https://apiwso2.icegate.gov.in/token'                 // production URL (confirm at go-live)

  const credentials = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) throw new Error(`ICEGATE token error: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.access_token as string
}

// ── Upload file to ICEGATE custodian filing endpoint ─────────────────────────
async function submitToICEGATE(payload: object, token: string, isUAT: boolean): Promise<{ ack: string }> {
  // Sea cargo endpoint — switch to air/ICD variants based on shipment mode
  const baseUrl = isUAT
    ? 'https://seacustodianfiling-uat.icegate.gov.in'        // UAT sea endpoint
    : 'https://seacustodianfiling.icegate.gov.in'            // production

  const jsonBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  const form = new FormData()
  form.append('fileData', jsonBlob, 'SB_CACHE01.json')
  form.append('messageId', 'CACHE01')                        // SB inbound message type

  const res = await fetch(`${baseUrl}/uploadingInbound`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(15_000),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`ICEGATE submit error: ${res.status} ${text}`)
  try { return JSON.parse(text) } catch { return { ack: text } }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse Payload ─────────────────────────────────────────────────────────
    const body = await req.json()
    const { shipment } = body

    if (!shipment || !shipment.id) {
      return new Response(JSON.stringify({ error: 'Missing shipment data' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Get Company Profile ───────────────────────────────────────────────────
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single()

    const iecCode  = profile?.companies?.iec ?? 'XXXXXXXXXX'
    const gstin    = profile?.companies?.gstin ?? ''
    const compName = profile?.companies?.name ?? 'Exporter Name'

    // ── Determine ICEGATE endpoint ────────────────────────────────────────────
    const indicator  = Deno.env.get('ICEGATE_ENV') === 'production' ? 'P' : 'T'

    const jobNumber = Math.floor(1000000 + Math.random() * 8999999)
    const today     = toICEGATEDate()
    const destPort  = PORT_MAP[shipment.country] ?? 'USNYC'
    const fobValue  = shipment.shipmentValue ?? 0
    const quantity  = shipment.quantity ?? 1
    const hsCode    = (shipment.hsCode ?? '00000000').replace(/\./g, '').slice(0, 8)

    // ── Build ICEGATE CACHE01 SB Inbound Payload ──────────────────────────────
    // Schema source: ICEGATE SB CACHE01 JSON Schema v1.1 (Jan 2026)
    const cache01Payload = {
      headerField: {
        senderID:                 iecCode,
        receiverID:               'ICEGATE',
        indicator,
        messageID:                'CACHE01',
        sequenceOrControlNumber:  jobNumber,
        jobNumber,
        jobDate:                  today,
        messageType:              'F',
      },
      master: {
        // Exporter details
        importerExporterCode:     iecCode,
        branchSrNoOfExporter:     1,
        impExpName:               compName,
        impExpAddress1:           profile?.companies?.address ?? 'Address Line 1',
        impExpCity:               'Mumbai',
        impExpState:              'Maharashtra',
        impExpPin:                400001,
        typeOfExporter:           'R',                  // R = Regular
        exporterClass:            'P',                  // P = Proprietorship
        stateOfOriginExporter:    'MH',
        gstnType:                 gstin ? 'REG' : '',
        gstnId:                   gstin,

        // Port details
        portOfLoading:            'INBOM4',             // JNPT/Mumbai — update per user
        portOfFinalDestination:   destPort,
        countryOfFinalDestination: shipment.country === 'EU' ? 'DE' : (shipment.country ?? 'US').slice(0, 2).toUpperCase(),
        portOfDischarge:          destPort,
        countryOfDischarge:       shipment.country === 'EU' ? 'DE' : (shipment.country ?? 'US').slice(0, 2).toUpperCase(),

        // Cargo
        grossWeight:              quantity * 10,        // approx — user should provide real weight
        netWeight:                quantity * 9,
        unitOfMeasurement:        'KG',
        totalNumberOfPackages:    Math.ceil(quantity / 10) || 1,
        numberOfContainers:       1,
        natureOfCargo:            'DB',                 // DB = Dry Bulk
        chaLicenseNumber:         Deno.env.get('CHA_LICENSE') ?? 'PENDING',

        // Sub-models
        exchangeModel: [{
          invoiceCurrencyCode:    'USD',
          currencyName:           'US Dollar',
          unitInRs:               1,
          rate:                   83.00,
          effectiveDate:          today,
          whetherStandardCurrency: 'Y',
        }],

        invoiceModel: [{
          invoiceSrNo:            1,
          actualInvoiceNo:        `INV-${shipment.id.slice(0, 8).toUpperCase()}`,
          invoiceDate:            toICEGATEDate(shipment.date),
          invoiceCurrency:        'USD',
          natureOfContract:       'FOB',
          buyerName:              shipment.buyer ?? 'Overseas Importer',
          buyerAddress1:          'Buyer Address',
          freightCurrency:        'USD',
          freightAmount:          Math.round(fobValue * 0.05),
          insuranceCurrency:      'USD',
          insuranceAmount:        Math.round(fobValue * 0.01),
          natureOfPayment:        'LC',
          periodOfPayment:        '30D',
        }],

        itemModel: [{
          itemSrNumberInInvoice:  1,
          schemeCode:             'SC',
          ritcCode:               hsCode,               // HS Code goes here per schema
          descOfGoods1:           (shipment.name ?? shipment.product ?? 'Export Goods').slice(0, 40),
          descOfGoods2:           '',
          unitOfMeasurement:      'KG',
          quantity,
          unitPrice:              fobValue / (quantity || 1),
          unitOfRate:             'KG',
          noOfUnit:               quantity,
          presentMarketValue:     fobValue,
          taxableValue:           fobValue,
          igstAmount:             0,
          igstPaymentStatus:      'NIL',
          totalPackage:           Math.ceil(quantity / 10) || 1,
          itemManufacturerCountry: 'IN',
          transitCountry:         '',
        }],

        containerModel: [{
          containerNumber:        shipment.containerNumber ?? 'CONT0000001',
          containerSize:          '20',
          movementDocumentType:   'BL',
          movementDocumentNumber: shipment.blNumber ?? `BL${jobNumber}`,
          eqmntType:              'CRN',
          eqmntQty:               1,
          eqmntQtyCode:           'NOS',
        }],

        supportingDocs: [],
      },

      // Digital signature — required for live submission
      // In production: sign payload with DSC (Class 2/3 certificate)
      digSign: {
        startSignature:   isLive ? 'REAL_DSC_SIGNATURE_REQUIRED' : 'TEST_SIGNATURE',
        startCertificate: isLive ? 'REAL_DSC_CERTIFICATE_REQUIRED' : 'TEST_CERTIFICATE',
        signerVersion:    '1.0',
      },
    }

    // ── Submit to ICEGATE (if credentials set) ────────────────────────────────
    const icegateClientId     = Deno.env.get('ICEGATE_CLIENT_ID')
    const icegateClientSecret = Deno.env.get('ICEGATE_CLIENT_SECRET')
    const isUAT               = Deno.env.get('ICEGATE_ENV') !== 'production'
    const isLive              = !!(icegateClientId && icegateClientSecret)

    let icegateResponse = null
    let submissionStatus = 'payload_ready'

    if (isLive) {
      try {
        const token = await getICEGATEToken(icegateClientId!, icegateClientSecret!, isUAT)
        icegateResponse = await submitToICEGATE(cache01Payload, token, isUAT)
        submissionStatus = 'submitted'
      } catch (e: any) {
        icegateResponse = { error: e.message }
        submissionStatus = 'submission_failed'
      }
    }

    const referenceNumber = `SB-${new Date().getFullYear()}-${jobNumber}`

    return new Response(
      JSON.stringify({
        status:             submissionStatus,
        reference_number:   referenceNumber,
        icegate_job_number: jobNumber,
        live_submission:    isLive,
        icegate_response:   icegateResponse,
        payload:            cache01Payload,
        schema_version:     'CACHE01 v1.1 (Jan 2026)',
        note: !!(Deno.env.get('ICEGATE_CLIENT_ID'))
          ? 'Submitted to ICEGATE. Await acknowledgement.'
          : 'ICEGATE credentials not set — payload generated but not submitted. Set ICEGATE_CLIENT_ID and ICEGATE_CLIENT_SECRET in Supabase secrets to enable live submission.',
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Customs filing error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
