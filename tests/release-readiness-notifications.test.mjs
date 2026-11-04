import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const gateway=fs.readFileSync(new URL('../src/api/securepay/notifications/index.ts', import.meta.url),'utf8');
const experience=fs.readFileSync(new URL('../src/features/notifications/NotificationsExperience.tsx', import.meta.url),'utf8');

test('notification UI carries human purpose and importance semantics',()=>{
  assert.match(gateway,/NotificationPurpose/);
  assert.match(gateway,/NotificationImportance/);
  assert.match(experience,/NEEDS YOU/);
  assert.match(experience,/UPDATES/);
  assert.match(experience,/COMMUNITY/);
});

test('Store enquiries have an independent category and preference, separate from muted Community',()=>{
  assert.match(gateway, /'STORES'/);
  assert.match(gateway, /storesCategoryEnabled/);
  assert.match(experience, /STORES: 'Stores'/);
  assert.match(experience, /label="Stores"/);
});

test('WhatsApp consent is explicit and self-scoped, separate from general channel preference',()=> {
  assert.match(gateway, /getWhatsAppConsent/);
  assert.match(gateway, /optInWhatsApp/);
  assert.match(gateway, /optOutWhatsApp/);
  assert.match(gateway, /\/api\/v1\/notifications\/me\/whatsapp-consent/);
  assert.match(experience, /I agree to transactional WhatsApp updates/);
  assert.match(experience, /Withdraw WhatsApp consent/);
  assert.match(experience, /Real WhatsApp delivery is not yet enabled/);
});

test('security cannot be shown as an ordinary mute toggle',()=>{
  assert.match(experience,/Security/);
  assert.match(experience,/Always on/);
  assert.doesNotMatch(experience,/label="Security".*onChange/s);
});

test('superseded notification loses its action affordance',()=>{
  assert.match(experience,/if \(notification\.resolvedAt\) return null/);
  assert.match(experience,/No longer needs you/);
});

test('quiet hours explain that canonical in-app truth remains immediate',()=>{
  assert.match(gateway,/getQuietHours/);
  assert.match(experience,/In-app updates still exist immediately/);
});
