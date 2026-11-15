// UI language switch (English default, Turkish optional). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translate, TR } from '../src/i18n.ts'

test('English is returned as written, with placeholders filled', () => {
  assert.equal(translate('en', 'Science stops'), 'Science stops')
  assert.equal(translate('en', 'At Stop #{n}: {name}', { n: 2, name: 'East Wall' }), 'At Stop #2: East Wall')
})

test('Turkish uses the translation and fills the same placeholders', () => {
  assert.equal(translate('tr', 'Science stops'), TR['Science stops'])
  assert.notEqual(translate('tr', 'Science stops'), 'Science stops')
  assert.match(translate('tr', 'At Stop #{n}: {name}', { n: 2, name: 'East Wall' }), /2.*East Wall/)
})

test('a text with no translation falls back to English instead of disappearing', () => {
  assert.equal(translate('tr', 'Some brand new label'), 'Some brand new label')
})

test('every translation keeps exactly the placeholders of its English text', () => {
  const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  for (const [en, tr] of Object.entries(TR)) assert.equal(holes(tr), holes(en), en)
})
