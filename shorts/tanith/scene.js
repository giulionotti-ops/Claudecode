// One state object -> one 1080x1920 frame: stone (surface), the lancet (glass + lead), overlay; the WebGL compositor lights it.
import { Pass } from './glass.js';
import { drawStone, drawWindow, LW, BOT, APEX } from './win.js';

export const W = 1080, H = 1920;
export const camMatrix = cam => new DOMMatrix().translate(W / 2, H / 2).scale(cam[2]).translate(-cam[0], -cam[1]);

export function renderScene(Lc, L, comp, st) {
  const { G, S, R, O } = Lc;
  for (const c of [G, S, R, O]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); }
  const cam = st.cam, M = camMatrix(cam), hw = W / 2 / cam[2], hh = H / 2 / cam[2];
  const view = [cam[0] - hw, cam[1] - hh, cam[0] + hw, cam[1] + hh];
  drawStone(S, M, view);
  const P = new Pass(G, S); P.setTransform(M);
  drawWindow(P, M, view, st);
  if (st.overlay) st.overlay(O);
  comp.render(L, {
    cam: [cam[0], cam[1], cam[2]], vert: true,
    sunU: st.sunU, bandW: st.bandW, bandSoft: st.bandSoft ?? 40, skew: st.skew ?? .1, sunI: st.sunI, sunCol: st.sunCol,
    skyI: st.skyI ?? .14, skyCol: st.skyCol || [.55, .65, .95], amb: st.amb ?? .16, ambCol: st.ambCol, haze: st.haze ?? .5, raysK: 0,
    lancets: [{ rect: [-LW / 2, APEX, LW / 2, BOT], I: st.spill ?? st.sunI * .35 }], pts: st.pts || [], floorMode: 0,
    expo: st.expo ?? 1.1, bloom: st.bloom ?? .6, thr: st.thr ?? .5, vign: st.vign ?? .45, sat: st.sat ?? 1.1, contrast: st.contrast ?? .12,
    fade: st.fade || 0, tint: st.tint, time: st.time || 0,
  });
}
