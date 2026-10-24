import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('home city preferences and the region jump share one card rather than sibling panels', async () => {
  const [home, summary] = await Promise.all(['app/HomeContent.tsx', 'app/HomeLocationSummary.tsx'].map(source));
  assert.match(home, /<HomeLocationSummary[^>]*>\s*<RegionJumpSelect regions=\{regions\} \/>\s*<\/HomeLocationSummary>/);
  assert.match(summary, /children: ReactNode/);
  assert.ok(summary.indexOf('{children}') > summary.indexOf('<aside className="home-location-summary"'));
  assert.equal((summary.match(/<aside\b/g) ?? []).length, 1);
  assert.match(home, /import "\.\/home-discovery\.css"/);
});

test('merged home navigation retains manual city selection, reset and progressive region navigation', async () => {
  const [summary, jump] = await Promise.all(['app/HomeLocationSummary.tsx', 'app/RegionJumpSelect.tsx'].map(source));
  assert.match(summary, /savePreferredCity\(city\.citySlug\)/);
  assert.match(summary, /clearPreferredCity\(\)/);
  assert.match(summary, /router\.refresh\(\)/);
  assert.match(summary, /aria-expanded=\{selectorOpen\}/);
  assert.match(summary, /href=\{`\/escorts\/\$\{city\.citySlug\}`\}/);
  assert.match(jump, /htmlFor="region-jump-select"/);
  assert.match(jump, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(jump, /window\.history\.replaceState/);
  assert.doesNotMatch(summary + jump, /\bfetch\(/);
});

test('one framed home card uses columns on desktop and a divided stack with a full-width city picker on mobile', async () => {
  const css = await source('app/home-discovery.css');
  assert.match(css, /\.home-discovery-controls > \.home-location-summary\s*\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(260px,\.65fr\)/);
  assert.match(css, /\.home-discovery-controls \.region-jump\s*\{[^}]*border:0;[^}]*border-left:1px/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?flex-direction:column/);
  assert.match(css, /\.region-jump select\s*\{ font-size:16px;/);
  assert.match(css, /\.home-discovery-controls \.home-city-selector\s*\{ grid-column:1\/-1;/);
});

test('desktop location controls have a bounded compact layout and icon spacing overrides the legacy 2px rule at every breakpoint', async () => {
  const css = await source('app/home-discovery.css');
  const heading = /\.home-discovery-controls \.home-location-summary > \.home-location-heading\s*\{[^}]*\}/g;
  const rules = [...css.matchAll(heading)].map(match => match[0]);
  assert.equal(rules.length, 4);
  assert.match(rules[0], /gap:16px/);
  assert.match(rules[1], /grid-template-columns:38px minmax\(0,max-content\) auto; justify-content:start/);
  assert.match(rules[2], /gap:10px/);
  assert.match(rules[3], /gap:8px/);
  assert.match(css, /@media\(min-width:1024px\)[\s\S]*?max-width:960px/);
  assert.match(css, /grid-template-columns:minmax\(0,max-content\) minmax\(280px,1fr\)/);
  assert.match(css, /\.home-location-actions\s*\{[^}]*flex-direction:row;[^}]*flex-wrap:nowrap; gap:10px/);
  assert.match(css, /\.home-location-symbol\s*\{[^}]*box-sizing:border-box/);
});
