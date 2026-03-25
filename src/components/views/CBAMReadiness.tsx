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
                success('WhatsApp request sent successfully!')
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
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: colors.text }}>
                        🌍 Supply Chain Data Collection (CBAM Scope 3)
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
                            {isSending ? 'Sending...' : '📱 Send Request'}
                        </Button>
                    </div>
                </div>

                <div style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: '#dcfce7', borderRadius: borderRadius.md, border: '1px solid #86efac' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#166534' }}>
                        <strong>WhatsApp Preview:</strong> "ComplianceOS request from ComplianceOS Exporter: Please reply with your monthly energy usage for {product || 'your supplied materials'} to ensure EU export compliance."
                    </p>
                </div>
            </div>
        </div>
    )
}
