import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { storyActivityLabel, storyUploadLabel } from '../lib/story-order.ts';

const createdAt = '2026-10-24T18:00:00Z';
test('activity labels keep a fixed hydration value and follow the mounted clock at time boundaries', () => {
  assert.equal(storyActivityLabel(createdAt, null), storyUploadLabel(createdAt));
  const base = Date.parse(createdAt);
  for (const [elapsed, expected] of [[0, 'hace 1 min'], [119999, 'hace 1 min'], [120000, 'hace 2 min'], [3600000, 'hace 1 h'], [86400000, 'hace 1 d']]) {
    assert.equal(storyActivityLabel(createdAt, base + elapsed), expected);
  }
  assert.equal(storyActivityLabel('invalid', base), 'Fecha no disponible');
});

test('activity SSR is unchanged across a minute boundary and retains story content and controls', async () => {
  const path = new URL('../app/historias/StoryRail.tsx', import.meta.url);
  const source = await readFile(path, 'utf8');
  let code = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX}}).outputText;
  const dataUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const button = dataUrl(`import {createElement} from ${JSON.stringify(import.meta.resolve('react'))};export function ActionButton({children,...props}){return createElement('button',props,children);}`);
  code = code.replace(/from "([^"\n]+)"/g, (_all, name) => `from ${JSON.stringify(name === '@/app/ActionButton' ? button : name === '@/lib/story-order' ? new URL('../lib/story-order.ts', import.meta.url).href : import.meta.resolve(name))}`);
  const {DirectoryStoryLayout} = await import(dataUrl(code));
  const stories = [{id: 'story', profileId: 'profile', profileSlug: 'profile', profileHandle: null, profileName: 'Prueba local', profileImageUrl: null, city: 'Concepción', storyType: 'text', body: 'Historia temporal', createdAt, expiresAt: '2026-10-25T18:00:00Z'}];
  const OriginalDate = Date;
  const renderAt = time => {
    globalThis.Date = class extends OriginalDate {constructor(...args) {super(...(args.length ? args : [time]));} static now() {return time;}};
    try {return renderToStaticMarkup(createElement(DirectoryStoryLayout, {stories}, 'Catálogo'));}
    finally {globalThis.Date = OriginalDate;}
  };
  const before = renderAt(OriginalDate.parse(createdAt) + 119999);
  const after = renderAt(OriginalDate.parse(createdAt) + 120001);
  assert.equal(before, after, 'a changing wall clock must not change SSR or the first client render');
  assert.ok(before.includes(storyUploadLabel(createdAt)));
  assert.match(before, /Historia temporal/);
  assert.match(before, /Ver historias de Prueba local desde actividad/);
});
