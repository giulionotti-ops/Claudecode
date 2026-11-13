"""Ogryns Never Quit: shots in reading order (page pixels, 1696x2528). See ../fifteen-hours/shots.py for the format.
Page 2 panel 3 came out with a human face on Grunk, so it is skipped: l09 plays on panel 2 instead.
Page 2 panel 4 has a second (standing) rookie, so the last shots frame only the left side."""
P1 = 'page1-art.jpg'; P2 = 'page2-art.jpg'
ENDING = {'tail': 1.8}
SHOTS = [
 dict(page=P1, focus=[466, 126, 1310, 756], pre=0.2,
      lines=[('l01', [880, 40, 1662, 290], (1050, 335), 'round', 40)],
      sfx=[('boom', 0.0, -2), ('stomp', 0.2, -6)], shake=[(0.0, 18)],
      marks=[('BOOM!', 230, 420, 90, -8, '#E8452C', 0.0), ('KA-BOOM!', 1450, 420, 70, 8, '#F2B33D', 0.6)]),
 dict(page=P1, focus=[29, 861, 753, 1595], hold=0.2,
      lines=[('l02', [40, 872, 740, 1000], (520, 1070), 'round', 32)],
      sfx=[('puff', 'l02+2.3', -8)]),
 dict(page=P1, focus=[782, 861, 1669, 1595], hold=0.5,
      lines=[('l03', [795, 868, 1660, 990], (1300, 1030), 'round', 31)],
      sfx=[('boing', 'l03+3.6', -8)]),
 dict(page=P1, focus=[29, 1640, 995, 2491], hold=0.3, move_sfx=True,
      lines=[('l04', [420, 1648, 994, 1825], (860, 1870), 'round', 31)],
      sfx=[('ping', 0.0, -4), ('ping', 'l04+1.5', -10)],
      marks=[('PING!', 300, 1880, 64, -10, '#FFE066', 0.1), ('PANG!', 330, 2150, 58, 8, '#FFE066', 0.6)]),
 dict(page=P1, focus=[1023, 1640, 1669, 2491], hold=0.8,
      lines=[('l05', [1300, 1652, 1662, 1900], (1540, 1950), 'round', 28),
             ('l06', [1035, 1652, 1292, 1835], (1210, 1865), 'round', 28)]),
 dict(page=P2, focus=[29, 38, 1669, 819], hold=0.3, turn=True, pre=0.2,
      lines=[('l07', [480, 46, 1240, 200], (1000, 250), 'shout', 90)],
      sfx=[('roar', 0.0, -6), ('crash', 'l07+0.4', -2)], shake=[('l07', 18), ('l07+0.8', 14)],
      marks=[('KRUNCH!', 1320, 430, 80, -8, '#F2B33D', 'l07+0.5'), ('WHAM!', 300, 560, 74, 10, '#E8452C', 'l07+0.9')]),
 dict(page=P2, focus=[29, 861, 834, 1595], hold=0.8, pre=0.4,
      lines=[('l08', [360, 872, 830, 995], (640, 1010), 'round', 28),
             ('l09', [40, 872, 340, 1045], (300, 1070), 'round', 28)],
      sfx=[('rain', 0.0, -8), ('rain', 3.0, -10)]),
 dict(page=P2, focus=[29, 1640, 760, 2491], hold=0.4, pre=0.3,
      lines=[('l10', [130, 1770, 500, 2060], (520, 2125), 'round', 30)],
      sfx=[('birds', 0.0, -10)]),
 dict(page=P2, focus=[29, 1640, 760, 2491], zoom=0.92,
      lines=[('l11', [110, 1650, 600, 1742], (600, 1775), 'round', 32)]),
]
