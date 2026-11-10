"""The film: shots in reading order. Coordinates are page pixels (1696x2528 Gemini pages).
focus  = box the camera frames (bubbles in the shot are added automatically)
lines  = voice lines with their bubble: box, tail tip, kind (round | shout), font size
sfx    = (sound, offset s from shot start or 'lNN+x' = x s after that line starts, gain dB)
marks  = SFX lettering: (text, x, y, size, rotation, colour, when)
"""
P1 = 'page1-art.jpg'; P2 = 'page2-art.jpg'
SHOTS = [
 dict(page=P1, focus=[1080, 40, 1660, 640], hold=0.15,
      sfx=[('boom', 0.0, 0)], marks=[('BOOM!', 1390, 230, 150, -8, '#E8452C', 0.0)], shake=[(0.0, 26)]),
 dict(page=P1, focus=[330, 180, 680, 640],
      lines=[('l01', [56, 40, 600, 214], (640, 240), 'round', 32)]),
 dict(page=P1, focus=[900, 160, 1300, 640], hold=0.2,
      lines=[('l02', [680, 44, 1060, 168], (950, 222), 'round', 34)],
      sfx=[('puff', 'l02+1.6', -8)]),
 dict(page=P1, focus=[260, 900, 620, 1520], move_sfx=True,
      lines=[('l03', [586, 878, 846, 1056], (612, 1110), 'round', 32)],
      sfx=[('tick', 0.0, -6)]),
 dict(page=P1, focus=[1050, 920, 1580, 1450], hold=0.7,
      lines=[('l04', [882, 880, 1112, 962], (1062, 1006), 'round', 34)],
      sfx=[('puff', 'l04+0.9', -8)]),
 dict(page=P1, focus=[140, 2090, 850, 2480], hold=0.25, zoom=0.86, move_sfx=True,
      lines=[('l05', [110, 1668, 880, 1930], (480, 2120), 'shout', 110)],
      sfx=[('stomp', 0.0, -2)], shake=[('l05', 20), ('l05+0.6', 14)], pre=0.35),
 dict(page=P1, focus=[1000, 1740, 1665, 2480], hold=0.35,
      lines=[('l06', [1004, 1660, 1238, 1770], (1098, 1882), 'round', 32),
             ('l07', [1236, 1600, 1662, 1744], (1474, 1778), 'round', 32)],
      sfx=[('click', 'l07+0.05', 0)], marks=[('KLIK', 1300, 2000, 56, 12, '#ffffff', 'l07+0.05')]),
 dict(page=P2, focus=[60, 140, 800, 800], hold=0.25, turn=True,
      lines=[('l08', [60, 44, 780, 196], (420, 196), 'shout', 72)],
      sfx=[('lasers', 'l08', -1)], shake=[('l08', 12), ('l08+0.8', 10)],
      marks=[('PEW!', 760, 640, 80, -12, '#ff5a3c', 'l08+0.2'), ('PEW!', 560, 760, 64, 8, '#ff5a3c', 'l08+0.7')]),
 dict(page=P2, focus=[100, 900, 800, 1560], hold=0.35,
      lines=[('l09', [196, 878, 548, 1030], (556, 1044), 'round', 35)],
      sfx=[('thud', 0.0, -2)], marks=[('THUD!', 420, 1290, 80, -6, '#F2B33D', 0.05)], shake=[(0.05, 16)], pre=0.35),
 dict(page=P2, focus=[930, 920, 1600, 1500], hold=0.25,
      lines=[('l10', [872, 878, 1290, 1040], (1326, 1068), 'round', 34)],
      sfx=[('clink', 'l10+1.4', -4)], marks=[('TING!', 1090, 1330, 58, -10, '#FFE066', 'l10+1.4')]),
 dict(page=P2, focus=[180, 1860, 760, 2480], hold=0.3,
      lines=[('l11', [52, 1652, 640, 1830], (560, 1876), 'round', 34)]),
 dict(page=P2, focus=[860, 1680, 1460, 2480], hold=0.0, end=True,
      lines=[('l12', [1236, 1950, 1440, 2048], (1214, 2104), 'round', 32)],
      sfx=[('gulp', 'l12+0.05', -6), ('whistle', 'l12+0.9', -2)],
      marks=[('WHEEEE...', 1330, 1730, 60, 22, '#ffffff', 'l12+1.0')]),
]
