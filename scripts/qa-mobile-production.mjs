// Read-only: verify production references the freshly hashed shared CSS.
import assert from 'node:assert/strict';
const origin='https://chile3x.cl';
const home=await fetch(origin+'/',{signal:AbortSignal.timeout(30000)});
assert.equal(home.status,200);
const html=await home.text();
const hrefs=[...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)].map(match=>match[1]);
const shared=hrefs.find(href=>/^\/assets\/index-[\w-]+\.css$/.test(href));
assert.ok(shared,'Shared hashed CSS is referenced by the public home');
const response=await fetch(new URL(shared,origin),{signal:AbortSignal.timeout(30000)});
assert.equal(response.status,200);
const css=await response.text();
assert.match(css,/\.public-header-actions:not\(\.is-signed-in\)/);
assert.match(css,/font-size:\s*\.875rem/);
assert.match(css,/clip-path:\s*inset\(50%\)/);
assert.match(css,/max-width:\s*860px/);
assert.match(css,/\.home-layout--classic \.hero-actions\s*>\s*\.button\s*\{[^}]*width:\s*100%/);
// The already-published desktop composition must still be present as well.
for(const value of ['--public-wide-max:3200px','--public-card-min:208px','--public-card-max:252px'])assert.ok(css.includes(value),value);
assert.doesNotMatch(css,/[A-Z]:[\\/]+Users[\\/]+|sourceMappingURL/i);
assert.doesNotMatch(html,/qa_stories_[a-f0-9]+/);
assert.equal(html.includes('data-theme-stylesheet="liquid-glass"'),home.headers.get('x-chile3x-visual-theme')==='liquid-glass');
console.log('PASS live hashed mobile CSS, preserved desktop tokens, conditional theme and no local paths/fixtures: '+shared);
