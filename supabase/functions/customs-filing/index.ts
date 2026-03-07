import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // ── Auth ──────────────────────────────────────────────────────
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

        // ── Parse Payload ────────────────────────────────────────────
        const body = await req.json()
        const { shipment } = body

        if (!shipment || !shipment.id) {
            return new Response(JSON.stringify({ error: 'Missing shipment data' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // ── Get Company Profile for IEC (Importer Exporter Code) ──
        const { data: profile } = await supabaseClient
            .from('company_profiles')
            .select('iec_code, company_name')
            .eq('id', user.id)
            .single()

        const iecCode = profile?.iec_code || 'DEMO12345678'
        const companyName = profile?.company_name || 'Demo Export Corp'

        // ── Generate ICEGATE / DGFT Mock Payload ──────────────────
        // In production, this would map internal shipment data to the exact XML/JSON 
        // schema required by the Indian Customs Electronic Gateway (ICEGATE) or DGFT.

        // Simulating delay for payload generation and signing
        await new Promise(r => setTimeout(r, 1500))

        const referenceNumber = `SB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

        const icegatePayload = {
            Header: {
                MessageType: 'F_IND_RES',
                SenderID: iecCode,
                ReceiverID: 'ICEGATE',
                Version: '1.0',
                Indicator: 'T', // Test
                MessageID: crypto.randomUUID(),
                SequenceNumber: 1,
                Date: new Date().toISOString()
            },
            ShippingBill: {
                ExporterDetails: {
                    IECode: iecCode,
                    ExporterName: companyName,
                    StateOfOrigin: 'MH', // Default Maharashtra for demo
                },
                ConsigneeDetails: {
                    CountryCode: shipment.country,
                    ConsigneeName: 'Overseas Importer Ltd'
                },
                InvoiceDetails: {
                    InvoiceNumber: `INV-${shipment.id.substring(0, 6)}`,
                    InvoiceDate: shipment.date,
                    InvoiceValue: shipment.shipmentValue || 0,
                    Currency: 'INR'
                },
                ItemDetails: [
                    {
                        ItemSource: shipment.product,
                        CTH: shipment.hsCode || '0000.00.00',
                        Description: shipment.description || shipment.name,
                        FOBValue: shipment.shipmentValue || 0
                    }
                ],
                Compliance: {
                    CBAMReporting: shipment.country === 'EU' ? 'Y' : 'N',
                    UFLPA_Attestation: shipment.country === 'US' ? 'Y' : 'N'
                }
            }
        }

        return new Response(
            JSON.stringify({
                status: 'success',
                reference_number: referenceNumber,
                payload_generated: icegatePayload,
                timestamp: new Date().toISOString()
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
