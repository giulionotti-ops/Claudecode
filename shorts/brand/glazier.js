// The Glazier of Terra: an original hooded artisan of the Imperium. One augmetic eye, a leather apron, a shard of ruby glass held to the light.
import { COL, smooth, circle, ellipse, brush } from './glass.js';

const fold = (g, pts, w = 1.6) => brush(g, pts, w, { w0: .2, w1: .15 });
const trim = (g, pts) => { brush(g, pts, 3.2, { w0: .8, w1: .8, color: 'rgba(230,180,70,.85)' }); brush(g, pts, 1, { w0: .5, w1: .5, color: 'rgba(60,30,10,.7)' }); };
const S = {
  upper: smooth([[-11, -4], [11, -4], [13, 24], [11, 42], [-11, 42], [-12, 24]]),
  fore: smooth([[-11, -2], [11, -2], [14, 20], [10, 36], [-10, 36], [-12, 20]]),
  glove: smooth([[-8, -3], [8, -4], [12, 5], [12, 15], [6, 21], [-5, 20], [-9, 9]]),
};
export const GLAZIER = [
  { n: 'pelvis', p: null, at: [0, 0], sh: smooth([[-24, -8, 1], [24, -8, 1], [24, 8, 1], [-24, 8, 1]]), c: 'robe', z: 4 },
  { n: 'robe', p: 'pelvis', at: [0, 0], sh: smooth([[-34, -100], [32, -100], [44, -20], [52, 70], [56, 124, 1], [-56, 124, 1], [-52, 70], [-44, -20]]), c: 'robe', z: 0,
    paint: g => { fold(g, [[-26, -40], [-34, 40], [-40, 118]]); fold(g, [[-6, -30], [-8, 50], [-10, 120]]); fold(g, [[24, -40], [32, 40], [38, 118]]); trim(g, [[-54, 116], [0, 122], [54, 116]]); } },
  { n: 'torso', p: 'pelvis', at: [0, -4], sh: smooth([[-28, 0], [-34, -40], [-36, -82], [-24, -100], [24, -100], [36, -82], [34, -40], [28, 0]]), c: 'robe', z: 5,
    paint: g => { trim(g, [[-14, -98], [-10, -60], [-14, -4]]); trim(g, [[14, -98], [10, -60], [14, -4]]); } },
  { n: 'apron', p: 'torso', at: [0, 0], sh: smooth([[-20, -70], [20, -70], [24, 40], [26, 112, 1], [-26, 112, 1], [-24, 40]]), c: 'leather', z: 5.5,
    paint: g => { brush(g, [[-18, 10], [18, 10]], 2.4, { color: 'rgba(40,24,12,.7)' }); for (const x of [-12, 0, 12]) brush(g, [[x, 12], [x, 34]], 1.4, { color: 'rgba(40,24,12,.6)' });   // tool pockets
      g.fillStyle = 'rgba(200,210,215,.75)'; g.fillRect(-10, 2, 3, 14); g.fillRect(2, 4, 2.5, 12); g.fillStyle = 'rgba(230,180,70,.8)'; g.fillRect(11, 0, 3, 16); fold(g, [[-10, 50], [-12, 104]]); fold(g, [[10, 50], [12, 104]]); } },
  { n: 'head', p: 'torso', at: [2, -98], sh: smooth([[-13, -4], [-15, -26], [-11, -42], [0, -48], [13, -44], [18, -32], [21, -22, 1], [18, -18], [18, -9], [11, -1], [0, 2]]), c: 'flesh', z: 6,
    paint: g => { const gr = g.createLinearGradient(-14, -48, 10, 0); gr.addColorStop(0, 'rgba(40,20,10,.75)'); gr.addColorStop(1, 'rgba(40,20,10,.15)'); g.fillStyle = gr; g.fillRect(-16, -50, 38, 54);   // hood shadow
      brush(g, [[2, -31], [8, -34], [14, -31.5]], 2.6, { w0: .4, w1: .5 }); brush(g, [[14, -31], [18, -26], [19.5, -18]], 1.8, { w0: .5, w1: .5 });
      brush(g, [[6, -10], [10, -11], [15, -10.5]], 1.6, { w0: .4, w1: .4 }); brush(g, [[3, -6], [9, -2], [15, -4]], 1, { color: 'rgba(40,20,10,.5)' }); } },
  { n: 'lens', p: 'head', at: [9, -26], sh: circle(0, 0, 5.4), c: 'lens', z: 6.3, lead: 3, mat: false,   // the augmetic eye
    paint: g => { g.fillStyle = 'rgba(255,255,230,.7)'; g.beginPath(); g.arc(-1.4, -1.4, 1.4, 0, 7); g.fill(); } },
  { n: 'socket', p: 'head', at: [9, -26], sh: smooth([[-9, -6, 1], [9, -7, 1], [10, 6, 1], [-8, 7, 1]]), c: 'brass', z: 6.2, lead: 3, paint: g => { for (const [x, y] of [[-7, -5], [7, -5], [7, 5], [-6, 5]]) { g.fillStyle = 'rgba(40,24,12,.8)'; g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); } } },
  { n: 'hood', p: 'torso', at: [2, -98], sh: smooth([[-26, 8, 1], [-24, -30], [-14, -58], [4, -66], [22, -56], [30, -34], [26, -18], [20, -40], [8, -52], [-6, -48], [-14, -30], [-16, 4]]), c: 'hood', z: 6.6,
    paint: g => { trim(g, [[24, -20], [20, -42], [6, -54], [-8, -50], [-16, -30], [-18, 2]]); fold(g, [[-20, -20], [-18, -46]]); } },
  { n: 'upperB', p: 'torso', at: [-30, -84], sh: S.upper, c: 'robe', z: 2 },
  { n: 'foreB', p: 'upperB', at: [0, 40], sh: S.fore, c: 'robe', z: 2, paint: g => trim(g, [[-11, 30], [11, 30]]) },
  { n: 'handB', p: 'foreB', at: [0, 34], sh: S.glove, c: 'leather', z: 2 },
  { n: 'upperF', p: 'torso', at: [30, -84], sh: S.upper, c: 'robe', z: 8, paint: g => fold(g, [[0, 4], [2, 38]]) },
  { n: 'foreF', p: 'upperF', at: [0, 40], sh: S.fore, c: 'robe', z: 8, paint: g => trim(g, [[-11, 30], [11, 30]]) },
  { n: 'handF', p: 'foreF', at: [0, 34], sh: S.glove, c: 'leather', z: 8.6 },
  { n: 'shard', p: 'handF', at: [4, 14], sh: smooth([[0, 0, 1], [18, 10, 1], [26, 38, 1], [8, 56, 1], [-10, 34, 1]]), c: 'shard', z: 8.5, lead: 3, mat: false,   // the glass held to the light
    paint: g => { brush(g, [[4, 8], [14, 40]], 1.2, { color: 'rgba(255,240,230,.5)' }); } },
];
export const GLAZIER_PAL = { robe: '#3e3a4a', hood: '#2e2a38', leather: '#6a4a2e', flesh: '#b07a5e', lens: '#ffb23a', brass: COL.gold, shard: COL.ruby };
export const GLAZIER_POSE = {
  hold: { upperF: -1.75, foreF: -1.55, handF: -.25, upperB: .2, foreB: -.9 },   // the shard raised beside the eye
  show: { upperF: -1.5, foreF: -.5, handF: -.4, upperB: .15, foreB: -.7 },       // offered forward
};
