// Settings pickers for state and port of loading, backed by the DGFT annexure.
//
// A stored value is never rewritten to fit the list: a value the annexure
// does not have is shown as unlisted and kept until the user picks another.
// State and port are independent because the annexure does not say which
// state a port is in, so changing the state never clears the port.

import type { CompanyProfile } from '@/types'
import { lookupState, lookupPort } from '@/lib/dgft-reference-maps'

export type PickResolution =
  | { kind: 'empty' }
  | { kind: 'listed'; value: string; label: string }
  | { kind: 'unlisted'; value: string }

export function resolveStatePick(stored: string | null | undefined): PickResolution {
  if (!stored || stored.trim().length === 0) return { kind: 'empty' }
  const name = lookupState(stored)
  return name ? { kind: 'listed', value: name, label: name } : { kind: 'unlisted', value: stored }
}

export function resolvePortPick(stored: string | null | undefined): PickResolution {
  if (!stored || stored.trim().length === 0) return { kind: 'empty' }
  const port = lookupPort(stored)
  return port ? { kind: 'listed', value: port.code, label: port.name } : { kind: 'unlisted', value: stored }
}

export function applyStatePick(profile: CompanyProfile, state: string): CompanyProfile {
  return { ...profile, state }
}
