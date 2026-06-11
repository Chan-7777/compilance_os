import { useState } from 'react'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { useToast } from '@/hooks/useToast'
import { colors, spacing, borderRadius } from '@theme/index'
import { sendWhatsAppOutreach } from '@/lib/api'

export function CBAMReadiness({ product }: { product: string }) {
    const [vendorName, setVendorName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [isSending, setIsSending] = useState(false)
    const { success, error } = useToast()

    const handleSendRequest = async () => {
        if (!vendorName || !phoneNumber) return
        setIsSending(true)
        try {
            const result = await sendWhatsAppOutreach({
                vendorName,
                phoneNumber,
                product,
                companyName: 'ComplianceOS Exporter'
            })
            if (result.success) {
                success('Request preview generated — WhatsApp Business API integration required to send live messages.')
                setVendorName('')
                setPhoneNumber('')
            }
        } catch (err: any) {
            error(`Failed to send WhatsApp request: ${err.message}`)
        } finally {
            setIsSending(false)
        }
    }

    const sectionStyle: React.CSSProperties = {
        marginTop: spacing.xl,
        padding: spacing.xl,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
    }

    const inputStyle: React.CSSProperties = {
        padding: spacing.sm,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        fontSize: '0.875rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    }

    return (
        <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: colors.text, display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: colors.accent, flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
                        <span>Supply Chain Data Collection (CBAM Scope 3)</span>
                    </h3>
                    <p style={{ margin: `${spacing.xs} 0 0 0`, color: colors.textMuted, fontSize: '0.875rem' }}>
                        EU regulations require primary emissions data from your tier-2 suppliers. Collect this data frictionlessly via WhatsApp.
                    </p>
                </div>
                <Badge variant="warning">BETA</Badge>
            </div>

            <div style={{ padding: spacing.lg, backgroundColor: colors.background, borderRadius: borderRadius.md }}>
                <h4 style={{ margin: `0 0 ${spacing.md} 0`, color: colors.text }}>Request Vendor Data via WhatsApp</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs }}>
                            Vendor Name
                        </label>
                        <input
                            style={inputStyle}
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            placeholder="e.g. Apex Steel Rollers Ltd."
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: colors.textMuted, marginBottom: spacing.xs }}>
                            WhatsApp Number
                        </label>
                        <input
                            style={inputStyle}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+91 98765 43210"
                        />
                    </div>

                    <div style={{ alignSelf: 'flex-end' }}>
                        <Button
                            variant="primary"
                            onClick={handleSendRequest}
                            disabled={isSending || !vendorName || !phoneNumber}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                                <span>{isSending ? 'Generating...' : 'Preview Request'}</span>
                            </span>
                        </Button>
                    </div>
                </div>

                <div style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.surfaces.warningBg, borderRadius: borderRadius.md, border: `1px solid ${colors.status.pending}44` }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: colors.surfaces.warningText }}>
                        <strong>Template Preview</strong> (requires WhatsApp Business API to send live): "ComplianceOS request from ComplianceOS Exporter: Please reply with your monthly energy usage for {product || 'your supplied materials'} to ensure EU export compliance."
                    </p>
                </div>
            </div>
        </div>
    )
}
