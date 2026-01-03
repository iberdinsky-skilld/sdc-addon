import { describe, expect, test } from 'vitest'
import { logger } from '../logger'

describe('logger', () => {
  test('exposes common logging methods', () => {
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.debug).toBe('function')
  })

  test('calling a log method does not throw', () => {
    expect(() => logger.info('test message')).not.toThrow()
  })
})
