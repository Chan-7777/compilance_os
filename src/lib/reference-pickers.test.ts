import { describe, it, expect } from 'vitest'
import { resolveStatePick, resolvePortPick, applyStatePick } from './reference-pickers'
import type { CompanyProfile } from '@/types'

const profile: CompanyProfile = {
  name: 'Acme Exports Pvt Ltd',
  size: 'small',
  state: 'Maharashtra',
  stateCode: 'MH',
  portOfLoading: 'INNSA1',
}

describe('resolveStatePick', () => {
  it('is empty when nothing is stored', () => {
    expect(resolveStatePick(undefined)).toEqual({ kind: 'empty' })
    expect(resolveStatePick('   ')).toEqual({ kind: 'empty' })
  })

  it('selects the PDF entry for a stored name that matches ignoring case', () => {
    expect(resolveStatePick('Maharashtra')).toEqual({ kind: 'listed', value: 'MAHARASHTRA', label: 'MAHARASHTRA' })
  })

  it('keeps a stored name the PDF does not list, verbatim', () => {
    expect(resolveStatePick('Dadra and Nagar Haveli and Daman and Diu'))
      .toEqual({ kind: 'unlisted', value: 'Dadra and Nagar Haveli and Daman and Diu' })
  })
})

describe('resolvePortPick', () => {
  it('names a listed code', () => {
    expect(resolvePortPick('INMUN1')).toEqual({ kind: 'listed', value: 'INMUN1', label: 'MUNDRA SEZ PORT, MUNDRA, GUJARAT' })
  })

  it('keeps a stored value that is not a PDF code, verbatim', () => {
    expect(resolvePortPick('JNPT')).toEqual({ kind: 'unlisted', value: 'JNPT' })
  })

  it('is empty when nothing is stored', () => {
    expect(resolvePortPick('')).toEqual({ kind: 'empty' })
  })
})

describe('applyStatePick', () => {
  it('sets the state to the picked PDF name', () => {
    expect(applyStatePick(profile, 'GUJARAT').state).toBe('GUJARAT')
  })

  // The PDF does not say which state a port is in, so a state change must not
  // clear or filter the port: that would silently wipe a valid ICEGATE code.
  it('leaves the port of loading and the 2-letter state code untouched', () => {
    const next = applyStatePick(profile, 'GUJARAT')
    expect(next.portOfLoading).toBe('INNSA1')
    expect(next.stateCode).toBe('MH')
    expect({ ...next, state: profile.state }).toEqual(profile)
  })
})
