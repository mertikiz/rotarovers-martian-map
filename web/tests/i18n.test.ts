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

test('science stop names and reasons from the route data have Turkish versions', () => {
  assert.equal(translate('tr', 'Possible Inverted Channel'), 'Olası Ters Dönmüş Kanal')
  const why = 'The walk ends on terrace ground at the northern end of the route.'
  assert.equal(translate('tr', why), why, 'a sentence that is not a whole stop text is not translated')
})

test('a text with no translation falls back to English instead of disappearing', () => {
  assert.equal(translate('tr', 'Some brand new label'), 'Some brand new label')
})

test('every translation keeps exactly the placeholders of its English text', () => {
  const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  for (const [en, tr] of Object.entries(TR)) assert.equal(holes(tr), holes(en), en)
})

test('every UI text passed to t() has a Turkish version', async () => {
  const { readdirSync, readFileSync } = await import('node:fs')
  const dir = new URL('../src/', import.meta.url)
  const missing = new Set<string>()
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.tsx'))) {
    const src = readFileSync(new URL(name, dir), 'utf8')
    for (const m of src.matchAll(/\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) {
      const en = m[2].replace(/\\(['"])/g, '$1')
      if (!(en in TR)) missing.add(en)
    }
  }
  assert.deepEqual([...missing], [], 'texts with no Turkish version')
})

test('texts shown from the conditions data have Turkish versions', async () => {
  const { readFileSync } = await import('node:fs')
  const c = JSON.parse(readFileSync(new URL('../public/data/conditions.json', import.meta.url), 'utf8'))
  for (const en of [c.disclaimer, c.rems.note, c.rems.uv_index, c.rad.period, c.rad.what]) {
    assert.ok(en in TR, en)
  }
})

test('durations, compass letters and coordinates follow the UI language', async () => {
  const { formatDuration, formatLonLat, localizeCompass } = await import('../src/walkUtils.ts')
  assert.equal(formatDuration(4 * 3600 + 27 * 60), '4h 27m')
  assert.equal(formatDuration(4 * 3600 + 27 * 60, 'tr'), '4 sa 27 dk')
  assert.equal(formatDuration(95, 'tr'), '1 dk 35 sn')
  assert.equal(localizeCompass('NNE', 'tr'), 'KKD')
  assert.equal(localizeCompass('SW', 'en'), 'SW')
  assert.equal(formatLonLat([137.2, -5.1], 'tr'), '137.20000°D, 5.10000°G')
})
