import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { drawChile3xWatermark } from '../lib/media-watermark.ts';
import { MAX_PREPARED_VIDEO_BYTES, MAX_VIDEO_SECONDS, videoEncodingBitrate } from '../lib/video-policy.ts';
import { MAX_IMAGE_UPLOAD_BYTES } from '../lib/image-upload-policy.ts';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const processorSource = (await source('lib/video-watermark.ts')).replace('"./media-watermark"', JSON.stringify(new URL('../lib/media-watermark.ts', import.meta.url).href));
const { createVideoWatermarkProcessor } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(processorSource)).toString('base64')}`);

function fakeContext(events) {
  return { save() { events.push('save'); }, restore() { events.push('restore'); }, measureText() { return { width: 500 }; }, clearRect() { events.push('clear'); }, strokeText(...args) { events.push(['stroke', ...args]); }, fillText(...args) { events.push(['fill', ...args]); } };
}

test('photos and videos share the same centered, translucent, monochrome watermark', () => {
  const events = [], ctx = fakeContext(events);
  drawChile3xWatermark(ctx, 320, 480);
  assert.equal(ctx.fillStyle, 'rgba(255, 255, 255, 0.28)');
  assert.equal(ctx.strokeStyle, 'rgba(0, 0, 0, 0.2)');
  assert.deepEqual(events, ['save', ['stroke', 'CHILE3X', 160, 240], ['fill', 'CHILE3X', 160, 240], 'restore']);
  assert.ok(parseFloat(ctx.font.slice(4)) < 320 * 0.18, 'the wordmark fits narrow frames');
});

test('every frame, including frame zero, starts fresh; one canvas is reused and released', () => {
  const prior = globalThis.document, events = [], ctx = fakeContext(events), canvas = { width: 300, height: 150, getContext: () => ctx };
  let creations = 0;
  globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); creations++; return canvas; } };
  try {
    const processor = createVideoWatermarkProcessor();
    for (let frame = 0; frame < 3; frame++) {
      const result = processor.process({ displayWidth: frame === 2 ? 480 : 320, displayHeight: frame === 2 ? 320 : 480, draw(context, x, y) { assert.equal(context, ctx); assert.equal(x, 0); assert.equal(y, 0); events.push('source'); } });
      assert.equal(result, canvas);
    }
    assert.equal(creations, 1); assert.equal(canvas.width, 480); assert.equal(canvas.height, 320);
    assert.equal(events.filter(e => e === 'clear').length, 3);
    assert.equal(events.filter(e => Array.isArray(e) && e[0] === 'fill').length, 3);
    assert.deepEqual(events.slice(0, 3), ['clear', 'source', 'save']);
    processor.dispose(); assert.equal(canvas.width, 0); assert.equal(canvas.height, 0);
  } finally { globalThis.document = prior; }
});

test('failure to create the compositor never silently uploads an unwatermarked file', () => {
  const prior = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  try {
    const processor = createVideoWatermarkProcessor();
    assert.throws(() => processor.process({ displayWidth: 320, displayHeight: 240 }), /marca de agua.*No se subió ningún archivo/);
    processor.dispose();
  } finally { globalThis.document = prior; }
});

test('encoding favors quality without targeting the 12 MB ceiling; photos stay at 10 MB', () => {
  assert.equal(MAX_PREPARED_VIDEO_BYTES, 12_000_000); assert.equal(MAX_VIDEO_SECONDS, 15); assert.equal(MAX_IMAGE_UPLOAD_BYTES, 10_000_000);
  assert.equal(videoEncodingBitrate(1280, 720, 15), 4_000_000);
  assert.ok(videoEncodingBitrate(320, 240, 15) < videoEncodingBitrate(720, 1280, 15));
  for (const [w, h, duration] of [[320,240,15], [1280,720,15], [720,1280,3]]) {
    assert.ok((videoEncodingBitrate(w, h, duration) + 128_000) * duration / 8 < MAX_PREPARED_VIDEO_BYTES * .9);
  }
});

test('watermark forces decoding/encoding, preserves sound, and invalidates previews from the original', async () => {
  const prepare = await source('app/mi-cuenta/prepare-video.ts'), manager = await source('app/mi-cuenta/ProfileMediaManager.tsx');
  assert.match(prepare, /if \(!watermark && compatible/); assert.match(prepare, /const remuxOnly = !watermark/);
  assert.match(prepare, /forceTranscode: true, process: watermark.process/); assert.match(prepare, /allowTransformationMetadata: false/);
  assert.match(prepare, /audio: \{ codec: audioOutputCodec/); assert.match(prepare, /watermark\?\.dispose\(\)/);
  assert.match(manager, /prepareVideo\(candidate.originalFile, \{ watermark: candidate.watermark/);
  assert.match(manager, /file: candidate.image \? candidate.file : candidate.originalFile, prepared: undefined, status: "ready"/);
  assert.match(manager, /SelectedVideoPreview file=\{candidate.prepared \?\? candidate.originalFile\}/);
  assert.doesNotMatch(manager, /Los videos no llevan.*marca de agua|Los videos se preparan sin estos efectos/);
});

test('only one final upload/object is stored, with rollback on failed database registration', async () => {
  const manager = await source('app/mi-cuenta/ProfileMediaManager.tsx'), upload = await source('lib/profile-media-upload.ts');
  assert.match(manager, /data.set\("file", prepared\)/);
  assert.equal((upload.match(/env.MEDIA.put\(/g) ?? []).length, 1);
  assert.match(upload, /await env.MEDIA.delete\(r2Key\)/);
  assert.doesNotMatch(upload, /originalFile|watermark|poster/);
});
