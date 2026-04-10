// Update Curve-141 unit prices
// Skip units with active offers or contracts
// Unit IDs are prefixed with "141"
const fs = require('fs');
const path = require('path');

const DB = 'C:\\Users\\C0QA\\Downloads\\DATABASE';

const buildings = JSON.parse(fs.readFileSync(path.join(DB, 'buildings.json'), 'utf8'));
const offers = JSON.parse(fs.readFileSync(path.join(DB, 'offers.json'), 'utf8'));
const contracts = JSON.parse(fs.readFileSync(path.join(DB, 'contracts.json'), 'utf8'));

// Find active offers/contracts
const activeOfferUnits = new Set();
offers.forEach(o => { if (o.status !== 'cancelled') activeOfferUnits.add(o.unitId); });
const activeContractUnits = new Set();
contracts.forEach(c => { if (c.status !== 'terminated' && c.status !== 'cancelled') activeContractUnits.add(c.unitId); });

console.log(`Active offer units: ${activeOfferUnits.size}, Active contract units: ${activeContractUnits.size}`);

const priceData = `004	5302000	6161680
006	5302000	6161680
007	5302000	6161680
008	5302000	6161680
009	5302000	6161680
010	5302000	6161680
011	5302000	6161680
012	5302000	6161680
013	5302000	6161680
014	5302000	6161680
017	5302000	6161680
116	4856000	5715680
117	4856000	5715680
118	4856000	5715680
119	4856000	5715680
120	4856000	5715680
121	4856000	5715680
122	4856000	5715680
125	4856000	5715680
127	4856000	5715680
128	4856000	5715680
129	4856000	5715680
130	4856000	5715680
131	4856000	5715680
132	4856000	5715680
134	4856000	5715680
203	4888000	5747680
204	4888000	5747680
205	4888000	5747680
206	4888000	5747680
207	4888000	5747680
208	4888000	5747680
209	4888000	5747680
210	4888000	5747680
211	4888000	5747680
212	4888000	5747680
213	4888000	5747680
215	4888000	5747680
216	4888000	5747680
217	4888000	5747680
218	4888000	5747680
219	4888000	5747680
220	4888000	5747680
322	4923000	5782680
324	4923000	5782680
325	4923000	5782680
326	4923000	5782680
327	4923000	5782680
328	4923000	5782680
329	4923000	5782680
330	4923000	5782680
331	4923000	5782680
332	4923000	5782680
333	4923000	5782680
334	4923000	5782680
335	4923000	5782680
404	4958000	5817680
406	4958000	5817680
407	4958000	5817680
408	4958000	5817680
409	4958000	5817680
410	4958000	5817680
411	4958000	5817680
412	4958000	5817680
413	4958000	5817680
414	4958000	5817680
415	4958000	5817680
416	4958000	5817680
417	4958000	5817680
418	4958000	5817680
419	4958000	5817680
522	4993000	5852680
523	4993000	5852680
524	4993000	5852680
526	4993000	5852680
527	4993000	5852680
528	4993000	5852680
529	4993000	5852680
531	4993000	5852680
532	4993000	5852680
533	4993000	5852680
534	4993000	5852680
537	4993000	5852680
601	5026000	5885680
602	5026000	5885680
603	5026000	5885680
606	5026000	5885680
607	5026000	5885680
608	5026000	5885680
609	5026000	5885680
610	5026000	5885680
611	5026000	5885680
612	5026000	5885680
613	5026000	5885680
614	5026000	5885680
615	5026000	5885680
616	5026000	5885680
617	5026000	5885680
618	5026000	5885680
724	5060000	5919680
725	5060000	5919680
726	5060000	5919680
727	5060000	5919680
728	5060000	5919680
729	5060000	5919680
731	5060000	5919680
732	5060000	5919680
733	5060000	5919680
734	5060000	5919680
735	5060000	5919680
803	5093000	5952680
804	5093000	5952680
806	5093000	5952680
807	5093000	5952680
808	5093000	5952680
809	5093000	5952680
810	5093000	5952680
811	5093000	5952680
812	5093000	5952680
813	5093000	5952680
814	5093000	5952680
815	5093000	5952680
816	5093000	5952680
817	5093000	5952680
818	5093000	5952680
923	5128000	5987680
924	5128000	5987680
925	5128000	5987680
926	5128000	5987680
927	5128000	5987680
928	5128000	5987680
929	5128000	5987680
930	5128000	5987680
932	5128000	5987680
933	5128000	5987680
934	5128000	5987680
935	5128000	5987680
936	5128000	5987680
938	5128000	5987680`;

const prices = {};
priceData.split('\n').forEach(line => {
  const [suffix, base, finished] = line.trim().split('\t');
  const unitId = '141' + suffix;
  const baseNum = parseInt(base);
  const finishedNum = parseInt(finished);
  if (unitId && !isNaN(baseNum)) {
    prices[unitId] = { base: baseNum, finished: finishedNum };
  }
});

console.log(`Loaded ${Object.keys(prices).length} price entries`);

// Find Curve - 141 building
const buildingIndex = buildings.findIndex(b => b.name === 'Curve - 141');
if (buildingIndex === -1) {
  console.error('Building "Curve - 141" not found!');
  console.log('Available:', buildings.map(b => b.name).join(', '));
  process.exit(1);
}

const building = buildings[buildingIndex];
console.log(`Found: ${building.name} with ${building.units.length} units`);

let updated = 0, skippedActive = 0;
const skippedList = [], updatedList = [];

building.units.forEach(unit => {
  const newPrice = prices[unit.unitId];
  if (!newPrice) return;

  if (activeOfferUnits.has(unit.unitId)) {
    skippedActive++;
    skippedList.push(`${unit.unitId} (active offer)`);
    return;
  }
  if (activeContractUnits.has(unit.unitId)) {
    skippedActive++;
    skippedList.push(`${unit.unitId} (active contract)`);
    return;
  }

  const oldBase = unit.price;
  const oldFinished = unit.finishedPrice;
  unit.price = newPrice.base;
  unit.finishedPrice = newPrice.finished;
  updated++;
  updatedList.push(`${unit.unitId}: base ${oldBase} -> ${newPrice.base}, finished ${oldFinished} -> ${newPrice.finished}`);
  delete prices[unit.unitId];
});

const remaining = Object.keys(prices);

console.log(`\n=== RESULTS ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped (active offer/contract): ${skippedActive}`);
if (skippedList.length > 0) skippedList.forEach(s => console.log(`  ⛔ ${s}`));
if (remaining.length > 0) {
  console.log(`Not found in building: ${remaining.length}`);
  remaining.forEach(id => console.log(`  ⚠️ ${id}`));
}

// Backup
const backupPath = path.join(DB, 'buildings_backup_before_curve141_update.json');
fs.writeFileSync(backupPath, JSON.stringify(buildings, null, 2), 'utf8');
console.log(`\nBackup saved: ${backupPath}`);

// Save
buildings[buildingIndex] = building;
fs.writeFileSync(path.join(DB, 'buildings.json'), JSON.stringify(buildings, null, 2), 'utf8');
console.log('✅ buildings.json updated!');

console.log(`\nSample updates:`);
updatedList.slice(0, 10).forEach(u => console.log(`  ${u}`));
if (updatedList.length > 10) console.log(`  ... and ${updatedList.length - 10} more`);
