import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({
  entryPoints: ['src/features/store/FulfilmentMiniAgreementReview.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { FulfilmentMiniAgreementReview } = module.exports;

const route = {
  routeId:'r1', offerId:'o1', providerKsNumber:'KS2', providerDisplayName:'Mavuno', supplyRoles:['DISTRIBUTOR'],
  routeLabel:'Local distributor', headlinePriceMinor:250000, currency:'KES', landedCostKnown:false, leadTimeHours:24,
  minimumOrderQuantity:10, deliveryAvailable:true, warrantyDeclared:true, returnTermsDeclared:false, tradeOffs:[],
};
const review = {
  fulfilmentNeedId:'n1', offerId:'o1', providerKsNumber:'KS2', providerDisplayName:'Mavuno',
  what:'Supply and deliver 40 boxes of tiles', proposedAmountMinor:250000, currency:'KES',
  requiredBy:'2026-10-12', completionEvidence:['Delivery note'], interactionLevel:'MICRO_REVIEW',
  missingMaterialDecisions:['Confirm exact delivery point'], agreementCreated:false, moneyMoved:false,
};

test('micro-review says what carries forward and preserves no-commit truth', () => {
  const html = renderToStaticMarkup(React.createElement(FulfilmentMiniAgreementReview, {
    review, route, onBack(){}, onOpenOffer(){}, onContinue(){},
  }));
  assert.match(html, /Review what this route would bring forward/);
  assert.match(html, /Supply and deliver 40 boxes of tiles/);
  assert.match(html, /KES 2,500/);
  assert.match(html, /Delivery note/);
  assert.match(html, /Confirm exact delivery point/);
  assert.match(html, /Agreement created: no/);
  assert.match(html, /Money moved: no/);
  assert.match(html, /Continue with KS001/);
  assert.doesNotMatch(html, /Agreement created: yes|Order confirmed|Payment sent/);
});
