// Vercel Cron Job — runs every 6 hours (defined in vercel.json)
// Calls the Supabase fetch-regulatory-feeds edge function

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow Vercel's cron caller
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      'https://gakmevnkyjldhzmfyyzq.supabase.co/functions/v1/fetch-regulatory-feeds',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      }
    )

    const data = await response.json()
    return res.status(200).json({ ok: true, ...data })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
