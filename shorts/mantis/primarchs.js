// Primarch rigs, from reference art: Ferrus Manus (black Iron Hands armour, silver living-metal hands, short dark hair),
// Fulgrim (purple armour trimmed in gold, long white hair, pale, cream cloak), Konrad Curze (midnight-blue armour trimmed in gold,
// long black hair, deathly pale, red cloak, lightning claws), Night Lords (midnight blue, bat-winged helms, red lightning, red lenses),
// Iron Hands (black, silver bionic arm), a Callidus assassin (black bodysuit, red ponytail, green phase sword).
import { COL, smooth, circle, brush } from './glass.js';
import { SON2 } from './figures2.js';
import { GUARD } from './cadia.js';

const HAIR_LONG = smooth([[-14, -40], [-4, -56], [12, -54], [16, -46], [6, -48], [-6, -42], [-12, -10], [-18, 18], [-26, 34, 1], [-30, 6], [-22, -26]]);
const HAIR_SHORT = smooth([[-16, -26], [-14, -44], [0, -53], [14, -49], [19, -38], [10, -42], [-2, -44], [-12, -36], [-12, -22]]);
const hairPaint = g => { brush(g, [[-12, -34], [-18, 0], [-24, 26]], 1.1, { color: 'rgba(30,24,20,.4)' }); brush(g, [[-6, -44], [-14, -20], [-20, 10]], 1, { color: 'rgba(30,24,20,.35)' }); };
const W = {   // weapons that replace the mace (grip / guard / blade, hanging from the front hand)
  fireblade: { grip: smooth([[-3, -6, 1], [3, -6, 1], [3, 18, 1], [-3, 18, 1]]), guard: smooth([[-16, 14, 1], [16, 14, 1], [14, 24, 1], [-14, 24, 1]]), blade: smooth([[-6, 0, 1], [6, 0, 1], [7, 100], [0, 122, 1], [-7, 100]]), c: 'gold2', at: [0, 24],
    paint: g => { g.fillStyle = 'rgba(255,120,20,.85)'; for (let y = 10; y < 110; y += 16) { g.beginPath(); g.moveTo(-7, y); g.quadraticCurveTo(-14, y + 6, -5, y + 14); g.fill(); g.beginPath(); g.moveTo(7, y + 8); g.quadraticCurveTo(14, y + 14, 5, y + 22); g.fill(); } brush(g, [[0, 6], [0, 106]], 1.4, { color: 'rgba(255,255,220,.7)' }); } },
  hammer: { grip: smooth([[-3.6, -10, 1], [3.6, -10, 1], [3.6, 110, 1], [-3.6, 110, 1]]), guard: circle(0, -12, 5), blade: smooth([[-24, 0, 1], [24, 0, 1], [26, 34, 1], [-26, 34, 1]]), c: 'steel', at: [0, 106],
    paint: g => { brush(g, [[-20, 8], [20, 8]], 1.6); brush(g, [[-20, 26], [20, 26]], 1.6); g.fillStyle = 'rgba(240,200,60,.85)'; g.beginPath(); g.moveTo(-4, 6); g.lineTo(4, 14); g.lineTo(-2, 18); g.lineTo(6, 28); g.lineTo(-6, 18); g.lineTo(0, 14); g.fill(); } },   // lightning on the head
  daemon: { grip: smooth([[-3, -6, 1], [3, -6, 1], [3, 18, 1], [-3, 18, 1]]), guard: smooth([[-10, 14, 1], [10, 14, 1], [8, 22, 1], [-8, 22, 1]]), blade: smooth([[-5, 0, 1], [6, 0, 1], [12, 60], [10, 110], [0, 130, 1], [-3, 100], [-5, 50]]), c: '#d8dce8', at: [0, 22],
    paint: g => { for (let y = 16; y < 120; y += 18) brush(g, [[-2, y], [6, y + 10], [0, y + 16]], 1.4, { color: 'rgba(160,40,200,.85)' }); brush(g, [[8, 20], [8, 100]], 1.2, { color: 'rgba(255,255,255,.6)' }); } },
  phase: { grip: smooth([[-2.6, -6, 1], [2.6, -6, 1], [2.6, 14, 1], [-2.6, 14, 1]]), guard: smooth([[-8, 12, 1], [8, 12, 1], [6, 18, 1], [-6, 18, 1]]), blade: smooth([[-3, 0, 1], [3, 0, 1], [4, 70], [0, 86, 1], [-4, 70]]), c: '#6af05a', at: [0, 18], paint: g => brush(g, [[0, 4], [0, 76]], 1.2, { color: 'rgba(240,255,220,.8)' }) },
};
const CLAWS = smooth([[-8, 14, 1], [-12, 60], [-10, 96, 1], [-6, 60], [-3, 16, 1], [-2, 64], [0, 104, 1], [2, 64], [3, 16, 1], [6, 60], [10, 96, 1], [12, 60], [8, 14, 1]]);
const clawPaint = g => { for (const x of [-9, 0, 9]) brush(g, [[x, 20], [x, 90]], 1, { color: 'rgba(255,255,255,.75)' }); };
const BOLT = (g, x, y, s, col) => { g.fillStyle = col; g.beginPath(); for (const [a, b] of [[0, -10], [6, -10], [2, -2], [7, -2], [-3, 12], [0, 2], [-5, 2]]) g.lineTo(x + a * s, y + b * s); g.closePath(); g.fill(); };
const MANTIS = (g, x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = 'rgba(30,26,14,.9)'; g.beginPath();   // the Chapter's sign: a stylised mantis head
  for (const [a, b] of [[0, 14], [-10, 2], [-14, -10], [-8, -6], [-4, -14], [0, -6], [4, -14], [8, -6], [14, -10], [10, 2]]) g.lineTo(a, b); g.closePath(); g.fill();
  g.fillStyle = 'rgba(240,220,160,.9)'; g.beginPath(); g.ellipse(-4, 0, 2, 3, .4, 0, 7); g.ellipse(4, 0, 2, 3, -.4, 0, 7); g.fill(); g.restore(); };
const BATWING_L = smooth([[-12, -40, 1], [-26, -52], [-40, -54, 1], [-34, -46], [-40, -40, 1], [-30, -38], [-34, -32, 1], [-18, -32]]);

export function primarch({ hair = 'long', weapon = 'none', cloak = true, metalHands = false, claws = false } = {}) {
  const keep = q => !['pelt', 'hair'].includes(q.n) && (cloak || q.n !== 'cloak') && !(weapon === 'none' && ['grip', 'guard', 'blade'].includes(q.n));
  const w = W[weapon];
  const parts = SON2.filter(keep).map(q => {
    if (w && (q.n === 'grip' || q.n === 'guard' || q.n === 'blade')) return { ...q, sh: w[q.n], at: q.n === 'blade' ? w.at : q.at, c: q.n === 'blade' ? w.c : q.n === 'guard' ? 'trim' : 'dark', paint: q.n === 'blade' ? w.paint : undefined };
    if (metalHands && ['handF', 'handB', 'foreF', 'foreB'].includes(q.n)) return { ...q, c: 'metal', paint: g => { brush(g, [[-6, 4], [-4, 30]], 1.4, { color: 'rgba(255,255,255,.7)' }); for (const y of [8, 16, 24]) brush(g, [[-8, y], [8, y]], .9); } };
    if (q.n === 'torso') return { ...q, paint: (g, o) => { brush(g, [[-30, -70], [0, -58], [30, -70]], 2); brush(g, [[-28, -26], [0, -22], [28, -26]], 1.6);
      if (o.mark === 'curze') { for (const x of [-18, 18]) BOLT(g, x, -44, 1.3, 'rgba(200,30,30,.85)'); g.fillStyle = '#ece2c8'; g.beginPath(); g.ellipse(0, -78, 7, 8, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(30,18,10,.9)'; g.fillRect(-4.5, -80, 3.4, 3.4); g.fillRect(1.2, -80, 3.4, 3.4); }   // skull and lightning
      else if (o.mark === 'ferrus') { g.fillStyle = 'rgba(220,226,230,.85)'; g.beginPath(); g.moveTo(-14, -86); g.lineTo(14, -86); g.lineTo(0, -66); g.fill(); }   // the iron gauntlet's silver
      else if (o.mark !== 'plain') { g.fillStyle = 'rgba(240,190,60,.9)'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(0, -80); g.lineTo(sd * 26, -90); g.lineTo(sd * 18, -76); g.lineTo(sd * 22, -70); g.lineTo(0, -66); g.fill(); } } } };   // Fulgrim's golden eagle
    if (q.n === 'pauldF' || q.n === 'pauldB') return { ...q, paint: (g, o) => { brush(g, [[-30, 12], [0, 15], [28, 12]], 1.6); if (o.mark === 'curze') BOLT(g, 0, -8, 1.4, 'rgba(200,30,30,.85)'); if (o.mark === 'fulgrim') { g.fillStyle = 'rgba(240,190,60,.85)'; g.beginPath(); g.ellipse(0, -8, 10, 6, 0, 0, 7); g.fill(); } } };
    if (q.n === 'head') return { ...q, paint: (g, o) => { q.paint(g, o); if (o.mark === 'curze') { g.fillStyle = 'rgba(10,10,14,.95)'; g.beginPath(); g.ellipse(9, -27, 4.6, 2.6, 0, 0, 7); g.fill(); } } };   // black, lightless eyes
    return q; });
  if (hair) parts.push({ n: 'hair', p: 'head', at: [0, 0], sh: hair === 'long' ? HAIR_LONG : HAIR_SHORT, c: 'hair', z: 10.6, mw: 3, lead: 2.6, paint: hairPaint });
  if (claws) for (const [h, z] of [['handF', 8.7], ['handB', 2.1]]) parts.push({ n: 'claw' + h, p: h, at: [2, 6], sh: CLAWS, c: '#cfe2ff', z, lead: 2.2, paint: clawPaint });
  return parts;
}
export const FERRUS = primarch({ hair: 'short', weapon: 'fireblade', cloak: false, metalHands: true });
export const FERRUS_HAMMER = primarch({ hair: 'short', weapon: 'hammer', cloak: false, metalHands: true });
export const FERRUS_BARE = primarch({ hair: 'short', weapon: 'none', cloak: false, metalHands: true });
export const FERRUS_PAL = { arm: '#2c2e33', arm2: '#1e1f23', trim: '#9aa4a8', cloth: '#3a3c42', dark: '#1a1b1f', flesh: '#b08066', hair: '#2a2420', steel: '#b8c0c4', metal: '#d4dadc', gold2: COL.gold2 };
export const fulgrim = weapon => primarch({ hair: 'long', weapon, cloak: true });
export const FULGRIM_PAL = { arm: '#6a2a8a', arm2: '#52206c', trim: COL.gold2, cloak: '#d8c8a0', cloth: '#7a2a9a', dark: '#3a1a4a', flesh: '#c09482', hair: '#f4f2ee', steel: '#c8ccd4', gold2: COL.gold2 };
export const CURZE = primarch({ hair: 'long', weapon: 'none', cloak: true, claws: true });
export const CURZE_PAL = { arm: '#1f2a5a', arm2: '#162048', trim: COL.gold2, cloak: '#8a1018', cloth: '#8a1018', dark: '#14182c', flesh: '#d8d0cc', hair: '#14141a', steel: '#9aa8c0' };

// marines: a closed helm, plus Night Lords bat wings or an Iron Hands silver arm
const HELM = smooth([[-16, 2, 1], [-19, -24], [-13, -46], [2, -55], [16, -49], [23, -35], [25, -22], [30, -14, 1], [28, -4, 1], [20, 0], [10, 5], [-2, 5]]);
export function marine({ wings = false, bionic = false } = {}) {
  const parts = SON2.filter(q => !['hair', 'pelt', 'cloak'].includes(q.n)).map(q => {
    if (q.n === 'torso') return { ...q, paint: (g, o) => { brush(g, [[-28, -26], [0, -22], [28, -26]], 1.6); if (o.mark === 'nightlord') { for (const x of [-16, 16]) BOLT(g, x, -50, 1.3, 'rgba(200,30,30,.85)'); g.fillStyle = '#ece2c8'; g.beginPath(); g.ellipse(0, -78, 6, 7, 0, 0, 7); g.fill(); } } };
    if (q.n === 'pauldF') return { ...q, c: 'pauld', paint: (g, o) => { if (o.mark === 'mantis') MANTIS(g, 0, -6, 1); brush(g, [[-30, 12], [0, 15], [28, 12]], 1.6); if (o.mark === 'nightlord') { g.fillStyle = 'rgba(200,30,30,.85)'; g.fillRect(-30, 4, 60, 6); BOLT(g, 0, -10, 1.3, 'rgba(240,230,210,.9)'); } if (o.mark === 'ironhand') { g.fillStyle = 'rgba(220,226,230,.9)'; g.fillRect(-30, 2, 60, 8); } } };
    if (bionic && ['handF', 'foreF', 'upperF'].includes(q.n)) return { ...q, c: 'metal' };
    if (q.n === 'pauldB') return { ...q, c: 'pauld' };
    if (q.n === 'loin') return { ...q, c: 'tabard', sh: smooth([[-13, -4, 1], [13, -4, 1], [14, 50], [0, 60, 1], [-14, 50]]), paint: (g, o) => { if (o.mark === 'mantis') { brush(g, [[0, 12], [0, 40]], 1.6); brush(g, [[-8, 16], [0, 24], [8, 16]], 1.4); brush(g, [[-6, 34], [6, 34]], 1.4); } } };
    return q; });
  parts.push({ n: 'helm', p: 'head', at: [0, 0], sh: HELM, c: 'helm', z: 10.7, lead: 3, paint: g => { brush(g, [[-14, -20], [6, -18], [25, -22]], 1.8); for (let k = 0; k < 4; k++) brush(g, [[18 + k * 2.6, -12], [17 + k * 2.6, -2]], 1.2); } },
    { n: 'lens', p: 'head', at: [0, 0], sh: smooth([[8, -33, 1], [19, -33], [20, -27, 1], [9, -26]]), c: 'lens', z: 10.8, lead: 2.4 });
  if (wings) parts.push({ n: 'batL', p: 'head', at: [0, 0], sh: BATWING_L, c: 'trim', z: 10.75, lead: 2.2 }, { n: 'batR', p: 'head', at: [0, 0], sh: smooth([[16, -40, 1], [24, -54], [36, -60, 1], [32, -50], [40, -46, 1], [30, -42], [34, -36, 1], [22, -34]]), c: 'trim', z: 10.75, lead: 2.2 });
  return parts;
}
export const NIGHTLORD = marine({ wings: true });
export const NIGHTLORD_PAL = { pauld: '#1f2a5a', tabard: '#8a1018', arm: '#1f2a5a', arm2: '#162048', helm: '#1f2a5a', trim: '#e8dcbc', cloth: '#8a1018', dark: '#14182c', flesh: '#b07a5e', steel: COL.steel, lens: '#ff2a20' };
export const IRONHAND = marine({ bionic: true });
export const IRONHAND_PAL = { pauld: '#2c2e33', tabard: '#3a3c42', arm: '#2c2e33', arm2: '#1e1f23', helm: '#2c2e33', trim: '#b8c0c4', cloth: '#3a3c42', dark: '#1a1b1f', flesh: '#b07a5e', steel: COL.steel, lens: '#5fd84a', metal: '#d4dadc' };

// the Callidus assassin: slim, black bodysuit, red ponytail, green phase sword
const PONY = smooth([[-10, -44, 1], [-22, -40], [-30, -20], [-34, 4, 1], [-26, -14], [-18, -30], [-8, -36, 1]]);
export const ASSASSIN = [...GUARD.filter(q => !['helmet', 'rifle', 'vest', 'coat'].includes(q.n)),
  { n: 'pony', p: 'head', at: [0, 0], sh: PONY, c: '#c8281e', z: 3.9, lead: 2.2 },
  { n: 'sword', p: 'handF', at: [2, 8], sh: smooth([[-2.6, 0, 1], [2.6, 0, 1], [3, 70], [0, 86, 1], [-3, 70]]), c: '#6af05a', z: 9, lead: 2.2, paint: g => brush(g, [[0, 4], [0, 76]], 1.2, { color: 'rgba(240,255,220,.8)' }) }];
export const ASSASSIN_PAL = { kit: '#1a1a20', coat: '#1a1a20', fatigue: '#24242c', flak: '#24242c', flesh: '#c89a82', helm: '#1a1a20', boot: '#101014', gun: '#1a1a20' };
export const MANTIS_M = marine();
export const MANTIS_PAL = { cloak: '#e8dcbc', hair: '#2a2420', arm: '#7aa23a', arm2: '#5a7e2a', helm: '#7aa23a', pauld: '#e8b828', tabard: '#e8dcbc', trim: '#3a4a1e', cloth: '#e8dcbc', dark: '#2a3418', flesh: '#b07a5e', steel: COL.steel, lens: '#e0302a' };
export const FIREHAWK_PAL = { arm: '#8e3a1c', arm2: '#6a2a14', helm: '#e8b02c', pauld: '#e8b02c', tabard: '#34363c', trim: '#c08a1c', cloth: '#34363c', dark: '#3c3f46', flesh: '#b07a5e', steel: COL.steel, lens: '#2a2c30' };
export const PRISONER = primarch({ hair: 'short', weapon: 'none', cloak: true });
export const PRISONER_PAL = { arm: '#6e6a62', arm2: '#5a564e', trim: '#4a463e', cloak: '#5a564e', cloth: '#5a564e', dark: '#3a3630', flesh: '#b08066', hair: '#3a3028', steel: '#8a8a8a' };
export const MASTER = primarch({ hair: 'short', weapon: 'none', cloak: true });
