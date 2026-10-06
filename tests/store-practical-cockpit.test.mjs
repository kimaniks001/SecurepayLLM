import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const bundle = await build({
  entryPoints: ['src/components/StoreManagementHome.tsx'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'lucide-react'],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { StoreManagementHome } = module.exports;

const store = { id:'KS1', name:'Wanjiku Supplies', operator:'Wanjiku', businessIdentity:'KS1', serviceAreas:[], verified:true };
const offer = {
  id:'offer-1', storeId:'KS1', storeName:'Wanjiku Supplies', title:'Cement delivery', description:'', offerType:'product',
  priceType:'fixed', price:'KES 1,000', currency:'KES', scope:{included:[],excluded:[]}, media:[], serviceArea:'Nairobi',
  availability:'Needs confirmation', conditions:[], documents:[], milestoneSeeds:[], obligationSeeds:[], customizationAllowed:false,
  secureLink:{id:'l1',url:'',label:'',linkType:'offer',qrAvailable:false,whatsappShareAvailable:false,embedAvailable:false},
  lifecycle:'published', version:'6 Oct 2026', isExternalReference:false, isDemoState:false,
};

test('Store arrival turns real availability into a task without inventing trade authority', () => {
  const html = renderToStaticMarkup(React.createElement(StoreManagementHome, {
    store, offers:[offer], activity:[], enquiries:[], onBack(){}, onCreateOffer(){}, onEditOffer(){}, onConfirmAvailability(){},
  }));
  assert.match(html, /What needs you/);
  assert.match(html, /Confirm availability/);
  assert.match(html, /Review offer|Review/);
  assert.doesNotMatch(html, /Accept order|Buy now|Create agreement|Release money/);
});

test('real business demand and Plug missions appear as attention, not automatic action', () => {
  const html = renderToStaticMarkup(React.createElement(StoreManagementHome, {
    store, offers:[], activity:[], enquiries:[], onBack(){}, onCreateOffer(){}, businessMode:true,
    opportunities:[{fulfilmentNeedId:'n1',needType:'TRANSPORT',quantity:2,unit:'trips',requiredBy:null,poolable:true,matchedOffers:[{offerId:'o',title:'Delivery',offerKind:'SERVICE',availabilityState:'TAKING_WORK',supplyRoles:[]}]}],
    plugMissions:[{opportunityOfferId:'m1',title:'Coordinate route',missionType:'POOLING',summary:'Two compatible deliveries',authorityRequirement:'PLUG_REQUIRED',permittedActions:['REVIEW'],rewardBasis:null}],
  }));
  assert.match(html, /1 demand match/);
  assert.match(html, /1 Plug mission/);
  assert.doesNotMatch(html, /Automatically accepted|Automatically pooled/);
});
