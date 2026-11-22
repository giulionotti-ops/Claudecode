"""Split Orbit: satisfying ball-physics shorts, simulated and rendered from scratch.

  python engine.py <episode> --seed N --out file.mp4     render one short (1080x1920, 60 fps, with sound)
  python engine.py <episode> --probe [--seeds 0-40]       simulate without drawing; print when each seed finishes
  python engine.py <episode> --still T --seed N --out x.jpg   draw one frame at time T

Episodes: overflow (every hit splits a ball), swing (a paddle swings in a bowl; every hit splits a ball), escape (break out of 15 spinning rings), fill (the ball grows every bounce).
Needs numpy, pycairo and ffmpeg.
"""
import argparse, math, os, subprocess, sys, wave
import numpy as np
import cairo

W, H, FPS, SUB = 1080, 1920, 60, 6          # 60 fps picture, 6 physics steps per frame (360 Hz)
DT = 1 / (FPS * SUB)
SR = 48000
C = np.array([540.0, 1010.0])               # arena centre
R = 440.0                                   # arena radius
G = np.array([0.0, 1500.0])                 # gravity, px/s^2
TAIL = 3.0                                  # seconds of finale after the goal is reached
FONT = 'Inter'

PALETTE = [(1.0, 0.36, 0.42), (1.0, 0.72, 0.25), (0.98, 0.93, 0.35), (0.40, 0.92, 0.55),
           (0.30, 0.82, 0.98), (0.55, 0.55, 1.0), (0.85, 0.45, 1.0), (1.0, 0.50, 0.80)]
PENTA = [0, 2, 4, 7, 9]


def note_freq(step, base=261.63):
    """Step along a major pentatonic scale from middle C."""
    octave, i = divmod(step, len(PENTA))
    return base * 2 ** (octave + PENTA[i] / 12)


def hsv(h, s=0.75, v=1.0):
    h = (h % 1.0) * 6; i = int(h); f = h - i
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    return [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i % 6]


# ---------------------------------------------------------------- episodes

class Episode:
    title = subtitle = ''
    goal_text = ''
    max_time = 75.0

    def __init__(self, seed):
        self.rng = np.random.default_rng(seed)
        self.t = 0.0
        self.done_at = None          # time the goal was reached
        self.sounds = []             # (time, freq, gain, kind)
        self.particles = []          # [x, y, vx, vy, life, r, g, b]

    def finished(self):
        return self.done_at is not None and self.t >= self.done_at + TAIL

    def frame(self):
        for _ in range(SUB):
            self.step(DT)
            self.t += DT
        self.step_particles(1 / FPS)

    def burst(self, x, y, color, n=24, speed=600):
        for _ in range(n):
            a = self.rng.uniform(0, 2 * math.pi); s = self.rng.uniform(0.3, 1) * speed
            self.particles.append([x, y, math.cos(a) * s, math.sin(a) * s, 1.0, *color])

    def step_particles(self, dt):
        for p in self.particles:
            p[2] *= 0.97; p[3] = p[3] * 0.97 + 600 * dt
            p[0] += p[2] * dt; p[1] += p[3] * dt; p[4] -= dt * 1.4
        self.particles = [p for p in self.particles if p[4] > 0]


class Overflow(Episode):
    """A bar spins in the middle of the circle. Every ball it hits splits in two. Goal: 1,000 balls."""
    title, subtitle = 'Will It Overflow?', 'every hit splits a ball'
    GOAL, BR, L, HALF, COOL = 1000, 8.0, 360.0, 14.0, 2.2

    def __init__(self, seed):
        super().__init__(seed)
        a = self.rng.uniform(0, 2 * math.pi)
        self.p = np.array([C + [0, -250]], float)
        self.v = np.array([[math.cos(a) * 500, -300.0]])
        self.col = np.array([0])
        self.cool = np.zeros(1)
        self.ang = self.rng.uniform(0, math.pi)
        self.w0 = self.rng.uniform(1.2, 1.8) * self.rng.choice([-1, 1])
        self.hits_this_frame = 0

    def counter(self):
        return f'{len(self.p):,} / {self.GOAL:,}'

    def omega(self):
        return self.w0 * (1 + 0.35 * math.sin(self.t * 0.7))

    def step(self, dt):
        p, v = self.p, self.v
        v += G * dt
        p += v * dt
        self.cool -= dt
        if self.done_at is not None:          # finale: the wall is gone, everything falls out
            return
        self.ang += self.omega() * dt
        # wall
        rel = p - C; d = np.linalg.norm(rel, axis=1) + 1e-9
        m = d + self.BR > R
        if m.any():
            n = rel[m] / d[m, None]
            p[m] = C + n * (R - self.BR)
            vn = (v[m] * n).sum(1)
            out = vn > 0
            v[m] -= ((1 + 0.92) * np.where(out, vn, 0))[:, None] * n
        # spinning bar (a capsule through the centre)
        u = np.array([math.cos(self.ang), math.sin(self.ang)])
        rel = p - C
        s = np.clip(rel @ u, -self.L, self.L)
        q = C + s[:, None] * u
        diff = p - q; d = np.linalg.norm(diff, axis=1) + 1e-9
        m = d < self.BR + self.HALF
        if not m.any():
            return
        idx = np.nonzero(m)[0]
        n = diff[idx] / d[idx, None]
        p[idx] = q[idx] + n * (self.BR + self.HALF)
        vb = self.omega() * s[idx, None] * np.array([-u[1], u[0]])
        vrel = v[idx] - vb
        vn = (vrel * n).sum(1)
        hit = vn < 0
        v[idx] -= ((1 + 0.95) * np.where(hit, vn, 0))[:, None] * n
        sp = np.linalg.norm(v, axis=1)
        v[sp > 2400] *= (2400 / sp[sp > 2400])[:, None]
        split = idx[hit & (self.cool[idx] <= 0)]
        if len(split):
            self.hits_this_frame += len(split)
            room = self.GOAL - len(p)
            split = split[:max(room, 0)]
            if len(split):
                rot = self.rng.choice([-1, 1], len(split)) * self.rng.uniform(0.25, 0.6, len(split))
                cs, sn = np.cos(rot), np.sin(rot)
                vv = v[split]
                nv = np.stack([vv[:, 0] * cs - vv[:, 1] * sn, vv[:, 0] * sn + vv[:, 1] * cs], 1)
                self.p = np.vstack([p, p[split] + self.rng.normal(0, 2, (len(split), 2))])
                self.v = np.vstack([v, nv])
                self.col = np.concatenate([self.col, self.rng.integers(0, len(PALETTE), len(split))])
                self.cool[split] = self.COOL
                self.cool = np.concatenate([self.cool, np.full(len(split), self.COOL)])
                if len(self.p) >= self.GOAL:
                    self.done_at = self.t + DT
                    self.sounds.append((self.done_at, 0, 1.0, 'finale'))
                    self.v += self.rng.normal(0, 250, self.v.shape)

    def frame(self):
        self.hits_this_frame = 0
        super().frame()
        if self.hits_this_frame and self.done_at is None:
            n = len(self.p)
            step = int(math.log2(max(n, 1)) * 1.6)
            self.sounds.append((self.t, note_freq(step), min(1.0, 0.45 + 0.08 * self.hits_this_frame), 'pluck'))

    def draw(self, ctx, fx):
        if self.done_at is None:
            fx.arena(ctx, rim=True)
            u = (math.cos(self.ang), math.sin(self.ang))
            ctx.set_line_cap(cairo.LINE_CAP_ROUND)
            ctx.set_line_width(self.HALF * 2)
            ctx.set_source_rgb(0.80, 0.82, 0.95)
            ctx.move_to(C[0] - u[0] * self.L, C[1] - u[1] * self.L)
            ctx.line_to(C[0] + u[0] * self.L, C[1] + u[1] * self.L)
            ctx.stroke()
            ctx.set_source_rgb(0.55, 0.58, 0.75)
            ctx.arc(C[0], C[1], 9, 0, 2 * math.pi); ctx.fill()
        else:
            fx.arena(ctx, rim=False, shatter=self.t - self.done_at)
        for k, rgb in enumerate(PALETTE):
            sel = self.p[self.col == k]
            if not len(sel):
                continue
            ctx.set_source_rgb(*rgb)
            for x, y in sel:
                if -20 < y < H + 20:
                    ctx.arc(x, y, self.BR, 0, 2 * math.pi); ctx.new_sub_path()
            ctx.fill()
        if self.done_at is not None:
            fx.banner(ctx, 'OVERFLOW!', self.t - self.done_at)


class Escape(Episode):
    """A ball starts in the middle of 15 spinning rings, each with a gap. Every gap it gets through breaks that ring."""
    title, subtitle = 'Can It Escape?', '15 rings, one ball'
    N, BR = 15, 13.0

    def __init__(self, seed):
        super().__init__(seed)
        r = self.rng
        self.radii = np.linspace(95, R, self.N)
        self.gap = np.radians(np.linspace(54, 36, self.N))
        self.rot = r.uniform(0, 2 * math.pi, self.N)
        self.spd = r.uniform(0.6, 1.4, self.N) * np.where(np.arange(self.N) % 2, 1, -1)
        self.alive = 0                        # index of the innermost ring still standing
        a = r.uniform(0, 2 * math.pi)
        self.p = C.copy(); self.v = np.array([math.cos(a), math.sin(a)]) * 700
        self.trail = []
        self.bounces = 0

    def counter(self):
        return f'rings left: {self.N - self.alive}'

    def ring_color(self, i):
        return hsv(0.92 - i / self.N * 0.75, 0.65, 1.0)

    def step(self, dt):
        self.rot += self.spd * dt
        self.v += G * dt
        self.p += self.v * dt
        if self.done_at is not None or self.alive >= self.N:
            return
        i = self.alive
        Ri = self.radii[i]
        rel = self.p - C; d = math.hypot(*rel)
        if d - self.BR > Ri:                  # fully outside: the ring breaks
            self.break_ring(i)
            return
        if d + self.BR <= Ri:
            return
        a = math.atan2(rel[1], rel[0])
        off = (a - self.rot[i]) % (2 * math.pi)
        half = math.asin(min(1, self.BR / d))
        if half < off < self.gap[i] - half:   # inside the gap: let it through
            return
        n = rel / d
        self.p = C + n * (Ri - self.BR)
        vn = self.v @ n
        if vn > 0:
            self.v -= 2 * vn * n
            sp = math.hypot(*self.v)
            if sp < 900:                       # keep it lively
                self.v *= 900 / sp
            self.bounces += 1
            self.sounds.append((self.t, note_freq(self.bounces % 10 + 2), 0.55, 'pluck'))

    def break_ring(self, i):
        col = self.ring_color(i)
        for k in range(40):
            a = k / 40 * 2 * math.pi
            if (a - self.rot[i]) % (2 * math.pi) < self.gap[i]:
                continue
            x, y = C + self.radii[i] * np.array([math.cos(a), math.sin(a)])
            self.burst(x, y, col, n=3, speed=500)
        self.alive += 1
        self.sounds.append((self.t, note_freq(5 + self.alive), 0.9, 'chime'))
        if self.alive >= self.N:
            self.done_at = self.t
            self.sounds.append((self.t, 0, 1.0, 'finale'))

    def frame(self):
        super().frame()
        self.trail.append(self.p.copy())
        self.trail = self.trail[-14:]

    def draw(self, ctx, fx):
        fx.arena(ctx, rim=False)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        for i in range(self.alive, self.N):
            ctx.set_line_width(9)
            ctx.set_source_rgb(*self.ring_color(i))
            ctx.arc(C[0], C[1], self.radii[i], self.rot[i] + self.gap[i], self.rot[i] + 2 * math.pi)
            ctx.stroke()
        for k, (x, y) in enumerate(self.trail):
            f = (k + 1) / len(self.trail)
            ctx.set_source_rgba(1, 1, 1, 0.25 * f)
            ctx.arc(x, y, self.BR * (0.4 + 0.6 * f), 0, 2 * math.pi); ctx.fill()
        ctx.set_source_rgb(1, 1, 1)
        ctx.arc(self.p[0], self.p[1], self.BR, 0, 2 * math.pi); ctx.fill()
        if self.done_at is not None:
            fx.banner(ctx, 'ESCAPED!', self.t - self.done_at)


class Fill(Episode):
    """One ball in a circle. Every bounce it grows by 3%. Goal: fill the circle."""
    title, subtitle = 'Will It Fill the Circle?', 'every bounce it grows'
    GROW = 1.022

    def __init__(self, seed):
        super().__init__(seed)
        a = self.rng.uniform(-2.6, -0.5)
        self.r = 45.0
        self.p = C + np.array([0, -150.0]); self.v = np.array([math.cos(a), math.sin(a)]) * 800
        self.bounces = 0
        self.rings = []                       # outlines left behind at each bounce: (x, y, r, hue)

    def counter(self):
        return f'{min(100, (self.r / R) ** 2 * 100):.0f}%'

    def step(self, dt):
        if self.done_at is not None:
            return
        self.v += G * dt
        self.p += self.v * dt
        rel = self.p - C; d = math.hypot(*rel) + 1e-9
        if d + self.r > R:
            n = rel / d
            vn = self.v @ n
            if vn > 0:
                self.v -= 2 * vn * n
                sp = math.hypot(*self.v)
                if sp < 850:
                    self.v *= 850 / sp
                self.bounces += 1
                self.rings.append((*self.p, self.r, self.bounces * 0.031))
                self.r = min(R, self.r * self.GROW)
                self.sounds.append((self.t, note_freq(min(self.bounces // 3, 19)), 0.6, 'pluck'))
                if self.r >= R * 0.985:
                    self.r = R; self.p = C.copy(); self.done_at = self.t
                    self.sounds.append((self.t, 0, 1.0, 'finale'))
                    return
            self.p = C + n * (R - self.r)

    def draw(self, ctx, fx):
        fx.arena(ctx, rim=True)
        ctx.save(); ctx.arc(C[0], C[1], R, 0, 2 * math.pi); ctx.clip()
        ctx.set_line_width(2.5)
        for x, y, r, h in self.rings[-60:]:
            ctx.set_source_rgba(*hsv(h, 0.6, 1.0), 0.55)
            ctx.arc(x, y, r, 0, 2 * math.pi); ctx.stroke()
        h = self.bounces * 0.031
        ctx.set_source_rgb(*hsv(h, 0.7, 1.0))
        ctx.arc(self.p[0], self.p[1], self.r, 0, 2 * math.pi); ctx.fill()
        ctx.set_source_rgba(1, 1, 1, 0.18)
        ctx.arc(self.p[0] - self.r * 0.3, self.p[1] - self.r * 0.3, self.r * 0.35, 0, 2 * math.pi); ctx.fill()
        ctx.restore()
        if self.done_at is not None:
            fx.banner(ctx, 'FILLED!', self.t - self.done_at)


class Swing(Episode):
    """A V-shaped bowl at the bottom of the circle with a paddle swinging inside it. Every ball the paddle hits splits in two."""
    title, subtitle = 'Will It Overflow?', 'every hit splits a ball'
    GOAL, BR, COOL = 1000, 7.0, 3.4
    SIDE = math.radians(52)          # the fixed walls of the bowl, measured from straight up
    HALF = math.radians(10)          # half-width of the paddle
    AMP = math.radians(41)           # how far the paddle swings each way
    LEN = 0.92 * R

    def __init__(self, seed):
        super().__init__(seed)
        self.P = C + np.array([0, 0.9 * R])                       # pivot, near the bottom of the circle
        a = self.rng.uniform(-0.6, 0.6)
        self.p = np.array([C + [self.rng.uniform(-120, 120), -260]], float)
        self.v = np.array([[math.sin(a) * 400, 0.0]])
        self.col = np.array([int(self.rng.integers(0, len(PALETTE)))])
        self.cool = np.zeros(1)
        self.w0 = 2 * math.pi / self.rng.uniform(2.2, 2.8)      # swing speed
        self.ph = self.rng.uniform(0, 2 * math.pi)
        self.hits_this_frame = 0
        # inward normals of the two fixed walls (lines from the pivot)
        self.walls = []
        for sgn in (-1, 1):
            d = np.array([math.sin(sgn * self.SIDE), -math.cos(sgn * self.SIDE)])   # from pivot up along the wall
            n = np.array([-d[1], d[0]]) * (1 if sgn < 0 else -1)                   # pointing into the bowl
            self.walls.append((d, n))

    counter = Overflow.counter

    def phi(self, t=None):
        t = self.t if t is None else t
        return self.AMP * math.sin(self.w0 * t + self.ph)

    def omega(self):
        return self.AMP * self.w0 * math.cos(self.w0 * self.t + self.ph)

    def paddle(self, phi=None):
        """The paddle as a convex polygon: the pivot plus points along its arc."""
        phi = self.phi() if phi is None else phi
        pts = [self.P]
        for k in range(9):
            a = phi - self.HALF + 2 * self.HALF * k / 8
            pts.append(self.P + self.LEN * np.array([math.sin(a), -math.cos(a)]))
        return np.array(pts)

    def step(self, dt):
        p, v = self.p, self.v
        v += G * dt
        p += v * dt
        self.cool -= dt
        if self.done_at is not None:
            return
        # rim
        rel = p - C; d = np.linalg.norm(rel, axis=1) + 1e-9
        m = d + self.BR > R
        if m.any():
            n = rel[m] / d[m, None]
            p[m] = C + n * (R - self.BR)
            vn = (v[m] * n).sum(1)
            v[m] -= ((1 + 0.9) * np.maximum(vn, 0))[:, None] * n
        # fixed walls of the bowl (half-planes through the pivot)
        for dvec, n in self.walls:
            s = (p - self.P) @ n
            m = s < self.BR
            if m.any():
                p[m] += (self.BR - s[m])[:, None] * n
                vn = v[m] @ n
                v[m] -= ((1 + 0.85) * np.minimum(vn, 0))[:, None] * n
        # swinging paddle (convex polygon, moving)
        poly = self.paddle()
        a, b = poly, np.roll(poly, -1, axis=0)
        e = b - a
        el = (e ** 2).sum(1)
        en = np.stack([e[:, 1], -e[:, 0]], 1) / np.sqrt(el)[:, None]      # outward normals (polygon is clockwise on screen)
        if (en[1] @ (poly.mean(0) - a[1])) > 0:
            en = -en
        rel = p[:, None, :] - a[None]
        tt = np.clip((rel * e[None]).sum(2) / el[None], 0, 1)
        q = a[None] + tt[..., None] * e[None]
        diff = p[:, None, :] - q
        dist = np.linalg.norm(diff, axis=2)
        k = dist.argmin(1)
        idx = np.arange(len(p))
        dmin = dist[idx, k]
        inside = ((rel * en[None]).sum(2) < 0).all(1)
        m = inside | (dmin < self.BR)
        if not m.any():
            return
        ii = np.nonzero(m)[0]
        qq = q[ii, k[ii]]
        nrm = np.where(inside[ii, None], en[k[ii]], diff[ii, k[ii]] / np.maximum(dmin[ii], 1e-9)[:, None])
        p[ii] = qq + nrm * self.BR
        r = qq - self.P
        vb = self.omega() * np.stack([-r[:, 1], r[:, 0]], 1)
        vn = ((v[ii] - vb) * nrm).sum(1)
        hit = vn < 0
        v[ii] -= ((1 + 0.95) * np.minimum(vn, 0))[:, None] * nrm
        sp = np.linalg.norm(v, axis=1)
        fast = sp > 2300
        v[fast] *= (2300 / sp[fast])[:, None]
        split = ii[hit & (self.cool[ii] <= 0)]
        if len(split):
            self.hits_this_frame += len(split)
            split = split[:max(self.GOAL - len(p), 0)]
            if len(split):
                rot = self.rng.choice([-1, 1], len(split)) * self.rng.uniform(0.25, 0.6, len(split))
                cs, sn = np.cos(rot), np.sin(rot)
                vv = v[split]
                nv = np.stack([vv[:, 0] * cs - vv[:, 1] * sn, vv[:, 0] * sn + vv[:, 1] * cs], 1)
                self.p = np.vstack([p, p[split] + self.rng.normal(0, 1.5, (len(split), 2))])
                self.v = np.vstack([v, nv])
                self.col = np.concatenate([self.col, self.rng.integers(0, len(PALETTE), len(split))])
                self.cool[split] = self.COOL
                self.cool = np.concatenate([self.cool, np.full(len(split), self.COOL)])
                if len(self.p) >= self.GOAL:
                    self.done_at = self.t + DT
                    self.sounds.append((self.done_at, 0, 1.0, 'finale'))
                    self.v += self.rng.normal(0, 250, self.v.shape)

    def frame(self):
        self.hits_this_frame = 0
        Episode.frame(self)
        if self.hits_this_frame and self.done_at is None:
            step = int(math.log2(max(len(self.p), 1)) * 1.6)
            self.sounds.append((self.t, note_freq(step), min(1.0, 0.45 + 0.08 * self.hits_this_frame), 'pluck'))

    def draw(self, ctx, fx):
        shatter = None if self.done_at is None else self.t - self.done_at
        if shatter is None or shatter < 1.2:
            fall = 0 if shatter is None else 1400 * shatter ** 2
            alpha = 1 if shatter is None else max(0, 1 - shatter / 1.2)
            ctx.set_source_rgb(0.075, 0.08, 0.14)
            ctx.arc(C[0], C[1], R, 0, 2 * math.pi); ctx.fill()
            ctx.save(); ctx.translate(0, fall)
            # brick rim
            ctx.set_line_width(26)
            ctx.set_source_rgba(0.27, 0.29, 0.45, alpha)
            ctx.arc(C[0], C[1], R + 13, 0, 2 * math.pi); ctx.stroke()
            ctx.set_line_width(2)
            ctx.set_source_rgba(0.16, 0.17, 0.28, alpha)
            for kk in range(72):
                a = kk / 72 * 2 * math.pi
                ca, sa = math.cos(a), math.sin(a)
                ctx.move_to(C[0] + ca * R, C[1] + sa * R); ctx.line_to(C[0] + ca * (R + 26), C[1] + sa * (R + 26))
            ctx.stroke()
            # fixed walls of the bowl
            ctx.save(); ctx.arc(C[0], C[1], R, 0, 2 * math.pi); ctx.clip()
            ctx.set_source_rgba(0.55, 0.56, 0.74, alpha)
            for sgn in (-1, 1):
                ang = sgn * self.SIDE
                far = self.P + 2 * R * np.array([math.sin(ang), -math.cos(ang)])
                side = self.P + 2 * R * np.array([sgn, 0.3])
                ctx.move_to(*self.P); ctx.line_to(*far); ctx.line_to(far[0] + sgn * 2 * R, far[1]); ctx.line_to(*side)
                ctx.close_path(); ctx.fill()
            ctx.rectangle(self.P[0] - 2 * R, self.P[1] - 1, 4 * R, 2 * R); ctx.fill()
            ctx.restore()
            # paddle with ruler marks
            poly = self.paddle()
            ctx.move_to(*poly[0])
            for pt in poly[1:]:
                ctx.line_to(*pt)
            ctx.close_path()
            ctx.set_source_rgba(0.80, 0.81, 0.94, alpha); ctx.fill()
            phi = self.phi()
            u = np.array([math.sin(phi), -math.cos(phi)]); w = np.array([-u[1], u[0]])
            ctx.set_line_width(3); ctx.set_source_rgba(0.45, 0.46, 0.62, alpha)
            for kk in range(1, 7):
                c0 = self.P + u * self.LEN * (0.3 + kk * 0.09)
                half = math.tan(self.HALF) * self.LEN * (0.3 + kk * 0.09) * 0.55
                ctx.move_to(*(c0 - w * half)); ctx.line_to(*(c0 + w * half * 0.3))
            ctx.stroke()
            ctx.set_source_rgba(0.40, 0.41, 0.58, alpha)
            ctx.arc(self.P[0], self.P[1], 26, math.pi, 2 * math.pi); ctx.fill()
            ctx.restore()
        for kk, rgb in enumerate(PALETTE):
            sel = self.p[self.col == kk]
            if not len(sel):
                continue
            ctx.set_source_rgb(*rgb)
            for x, y in sel:
                if -20 < y < H + 20:
                    ctx.arc(x, y, self.BR, 0, 2 * math.pi); ctx.new_sub_path()
            ctx.fill()
        ctx.set_source_rgba(1, 1, 1, 0.55)
        for x, y in self.p:
            if -20 < y < H + 20:
                ctx.arc(x - 2, y - 2, 2, 0, 2 * math.pi); ctx.new_sub_path()
        ctx.fill()
        if shatter is not None:
            fx.banner(ctx, 'OVERFLOW!', shatter)


EPISODES = {'overflow': Overflow, 'escape': Escape, 'fill': Fill, 'swing': Swing}


# ---------------------------------------------------------------- drawing

class FX:
    def __init__(self):
        self.bg = cairo.LinearGradient(0, 0, 0, H)
        self.bg.add_color_stop_rgb(0, 0.05, 0.055, 0.10)
        self.bg.add_color_stop_rgb(1, 0.08, 0.07, 0.15)

    def arena(self, ctx, rim=True, shatter=None):
        ctx.set_source_rgb(0.075, 0.08, 0.14)
        ctx.arc(C[0], C[1], R, 0, 2 * math.pi); ctx.fill()
        if rim:
            for wdt, a in ((34, 0.06), (22, 0.12), (12, 1.0)):
                ctx.set_line_width(wdt)
                ctx.set_source_rgba(0.62, 0.66, 0.95, a)
                ctx.arc(C[0], C[1], R + 6, 0, 2 * math.pi); ctx.stroke()
        if shatter is not None and shatter < 1.2:           # the rim flies apart
            ctx.set_line_width(12)
            for k in range(24):
                a0 = k / 24 * 2 * math.pi
                push = shatter * 700
                dx, dy = math.cos(a0 + 0.13) * push, math.sin(a0 + 0.13) * push + 900 * shatter ** 2
                ctx.set_source_rgba(0.62, 0.66, 0.95, max(0, 1 - shatter / 1.2))
                ctx.arc(C[0] + dx, C[1] + dy, R + 6, a0, a0 + 2 * math.pi / 24 - 0.04); ctx.stroke()

    def text(self, ctx, s, y, size, rgb=(1, 1, 1), weight=cairo.FONT_WEIGHT_BOLD, alpha=1.0, scale=1.0):
        ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL, weight)
        ctx.set_font_size(size * scale)
        e = ctx.text_extents(s)
        ctx.move_to(W / 2 - e.width / 2 - e.x_bearing, y)
        ctx.set_source_rgba(*rgb, alpha)
        ctx.show_text(s)

    def banner(self, ctx, s, age):
        pop = min(1, age / 0.25)
        scale = 0.6 + 0.5 * pop - 0.1 * max(0, min(1, (age - 0.25) / 0.2))
        ctx.set_source_rgba(0, 0, 0, 0.45 * pop)
        ctx.rectangle(0, C[1] - 120, W, 200); ctx.fill()
        self.text(ctx, s, C[1] + 40, 120, (1, 0.9, 0.35), alpha=pop, scale=scale)

    def hud(self, ctx, ep):
        self.text(ctx, ep.title, 250, 74)
        self.text(ctx, ep.subtitle, 305, 36, (0.62, 0.64, 0.78), cairo.FONT_WEIGHT_NORMAL)
        self.text(ctx, ep.counter(), 450, 64, (1, 0.9, 0.35))


def draw_frame(ctx, ep, fx):
    ctx.set_source(fx.bg); ctx.paint()
    ep.draw(ctx, fx)
    for x, y, vx, vy, life, r, g, b in ep.particles:
        ctx.set_source_rgba(r, g, b, max(0, life))
        ctx.arc(x, y, 4, 0, 2 * math.pi); ctx.fill()
    fx.hud(ctx, ep)


# ---------------------------------------------------------------- sound

def synth(sounds, dur):
    out = np.zeros(int(dur * SR) + SR)
    rng = np.random.default_rng(7)

    def add(t0, sig):
        i = int(t0 * SR); j = min(len(out), i + len(sig))
        if i < len(out):
            out[i:j] += sig[:j - i]

    for t0, f, g, kind in sounds:
        if kind == 'pluck':
            n = int(0.35 * SR); tt = np.arange(n) / SR
            env = np.exp(-tt * 14) * np.minimum(1, tt * 400)
            add(t0, g * 0.32 * env * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)))
        elif kind == 'chime':
            n = int(0.9 * SR); tt = np.arange(n) / SR
            env = np.exp(-tt * 5) * np.minimum(1, tt * 300)
            sig = sum(np.sin(2 * np.pi * f * m * tt) / (k + 1) for k, m in enumerate((1, 1.5, 2, 3)))
            add(t0, g * 0.28 * env * sig + g * 0.12 * np.exp(-tt * 25) * rng.normal(0, 1, n))
        elif kind == 'finale':
            n = int(2.6 * SR); tt = np.arange(n) / SR
            env = np.exp(-tt * 1.6) * np.minimum(1, tt * 200)
            chord = sum(np.sin(2 * np.pi * note_freq(s) * tt) for s in (5, 7, 9, 10, 12))
            add(t0, 0.22 * env * chord + 0.25 * np.exp(-tt * 9) * rng.normal(0, 1, n))
    # soft room: a couple of short echoes
    for delay, amt in ((0.083, 0.22), (0.161, 0.12)):
        k = int(delay * SR); out[k:] += amt * out[:-k].copy()
    peak = np.abs(out).max() or 1
    return np.tanh(out / peak * 1.4) * 0.85


def write_wav(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


# ---------------------------------------------------------------- main

def run(ep, render=None):
    frames = 0
    while not ep.finished() and ep.t < ep.max_time:
        ep.frame(); frames += 1
        if render:
            render(ep)
    return frames


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('episode', choices=EPISODES)
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--out')
    ap.add_argument('--probe', action='store_true')
    ap.add_argument('--seeds', default='0-30')
    ap.add_argument('--still', type=float)
    a = ap.parse_args()
    cls = EPISODES[a.episode]

    if a.probe:
        lo, hi = map(int, a.seeds.split('-'))
        for s in range(lo, hi + 1):
            ep = cls(s); run(ep)
            print(s, 'goal at', None if ep.done_at is None else round(ep.done_at, 1), flush=True)
        return

    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
    ctx = cairo.Context(surf)
    fx = FX()
    ep = cls(a.seed)

    if a.still is not None:
        while ep.t < a.still and not ep.finished():
            ep.frame()
        draw_frame(ctx, ep, fx); surf.flush()
        png = a.out.rsplit('.', 1)[0] + '.png'
        surf.write_to_png(png)
        if not a.out.endswith('.png'):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', png, '-q:v', '3', a.out], check=True); os.remove(png)
        return

    base = a.out.rsplit('.', 1)[0]
    silent, wav = base + '.video.mp4', base + '.wav'
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}',
                            '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
                            '-pix_fmt', 'yuv420p', silent], stdin=subprocess.PIPE)

    def render(e):
        draw_frame(ctx, e, fx); surf.flush()
        enc.stdin.write(surf.get_data())

    n = run(ep, render)
    enc.stdin.close(); enc.wait()
    write_wav(wav, synth(ep.sounds, n / FPS))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a',
                    '-af', 'loudnorm=I=-14:TP=-1.5', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
                    '-shortest', '-movflags', '+faststart', a.out], check=True)
    os.remove(silent); os.remove(wav)
    print(f'{a.out}: {n / FPS:.1f} s, goal at {ep.done_at and round(ep.done_at, 1)}')


if __name__ == '__main__':
    main()
