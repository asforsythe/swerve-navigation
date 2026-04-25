/**
 * Run once to generate VAPID keys for Web Push.
 * Copy the output into your .env file.
 *
 * Usage:  node scripts/generate-vapid-keys.js
 */
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();

console.log('\n──────────────────────────────────────────────');
console.log('  Swerve VAPID Key Generation');
console.log('──────────────────────────────────────────────');
console.log('\nAdd these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your@email.com`);
console.log('\n──────────────────────────────────────────────\n');
