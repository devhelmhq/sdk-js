import {describe, it, expect} from 'vitest'
import {unwrapSingle} from '../src/http.js'

describe('unwrapSingle', () => {
  it('unwraps SingleValueResponse envelope', () => {
    const resp = {data: {id: 1, name: 'Test'}}
    const result = unwrapSingle(resp)
    expect(result).toEqual({id: 1, name: 'Test'})
  })

  it('returns bare object when no data wrapper', () => {
    const resp = {id: 1, name: 'Test'}
    const result = unwrapSingle(resp)
    expect(result).toEqual({id: 1, name: 'Test'})
  })

  it('handles null data field', () => {
    const resp = {data: null}
    const result = unwrapSingle(resp)
    expect(result).toBeNull()
  })

  it('handles nested objects with data property', () => {
    const resp = {data: {data: 'nested'}}
    const result = unwrapSingle(resp)
    expect(result).toEqual({data: 'nested'})
  })
})

describe('buildClient configuration', () => {
  it('is importable and returns a client', async () => {
    const {buildClient} = await import('../src/http.js')
    const client = buildClient({token: 'test-token', baseUrl: 'http://localhost:8080'})
    expect(client).toBeDefined()
    expect(typeof client.GET).toBe('function')
    expect(typeof client.POST).toBe('function')
  })
})
