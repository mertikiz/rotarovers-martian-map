// Stop source links come from content/stops.csv; only web links may become an href. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeHttpUrl } from '../src/url.ts'

test('keeps http and https links', () => {
  assert.equal(safeHttpUrl('https://www.uahirise.org/PSP_006855_1750'), 'https://www.uahirise.org/PSP_006855_1750')
  assert.equal(safeHttpUrl('http://marsjournal.org/contents/2010/0004/'), 'http://marsjournal.org/contents/2010/0004/')
})

test('rejects script and other schemes, and non-URLs', () => {
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,x', 'vbscript:x', 'not a url', ''])
    assert.equal(safeHttpUrl(bad), null, bad)
})
