// Theme switch (light / dark / system, remembered). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isThemePref, readThemePref, resolveTheme } from '../src/theme.ts'

test('system follows the OS; light and dark override it', () => {
  assert.equal(resolveTheme('system', true), 'dark')
  assert.equal(resolveTheme('system', false), 'light')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme('dark', false), 'dark')
})

test('only the three known choices are accepted from storage', () => {
  assert.ok(isThemePref('dark'))
  assert.ok(!isThemePref('blue'))
  assert.ok(!isThemePref(null))
})

test('with no storage at all (blocked or missing) the choice falls back to system', () => {
  assert.equal(readThemePref(), 'system') // node has no localStorage here: the read throws and is caught
})
