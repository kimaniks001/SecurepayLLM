import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({
  entryPoints: ['src/features/experience/ExperiencePathway.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { ExperiencePathway } = module.exports;

test('journey names the four practical jobs without implying authority', () => {
  const html = renderToStaticMarkup(React.createElement(ExperiencePathway, { active: 'vision', onNavigate() {} }));
  assert.match(html, /Think it through/);
  assert.match(html, /Find what you need/);
  assert.match(html, /Make it clear/);
  assert.match(html, /Fund and move safely/);
  assert.doesNotMatch(html, /Buy now|Fund now|Release now|Agree now/);
});

test('active area is marked as the current step', () => {
  const html = renderToStaticMarkup(React.createElement(ExperiencePathway, { active: 'agreement', onNavigate() {} }));
  assert.match(html, /aria-current="step"/);
  assert.match(html, />Agreement</);
});
