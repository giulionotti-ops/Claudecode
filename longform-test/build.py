import sys, json, subprocess, math, os
sys.path.insert(0, "/root/glazier-40k/.claude/skills/claude-drawing-skill/lib")
from chalk import Chalkboard, WHITE, YELLOW, PINK, BLUE
S = json.load(open("script.json"))
os.makedirs("frames", exist_ok=True)
CX, CY, R = 960, 640, 300

def caption(b, lines, hi):
    y = 140
    for ln in lines:
        w = b.text_width(ln, 74)
        x = 960 - w/2
        if hi in ln:
            a, c = ln.split(hi, 1)
            b.text(a, x, y, 74, WHITE, anchor='ls')
            xa = x + b.text_width(a, 74)
            b.text(hi, xa, y, 74, YELLOW, anchor='ls')
            b.text(c, xa + b.text_width(hi, 74), y, 74, WHITE, anchor='ls')
        else:
            b.text(ln, x, y, 74, WHITE, anchor='ls')
        y += 90

def earth(b, hole=True):
    b.circle(CX, CY, R, WHITE, width=6)
    if hole:
        b.line(CX, CY-R, CX, CY+R, YELLOW, width=5)

for i, s in enumerate(S, 1):
    b = Chalkboard(seed=i)
    b.slate(); 
    caption(b, s["cap"], s["hi"])
    if i == 1:
        earth(b); b.circle(CX, CY-R-30, 14, PINK, width=6); b.arrow([(CX+120, CY-R-60),(CX+40, CY-R-35)], PINK)
    elif i == 2:
        earth(b); b.dot(CX, CY, 12, PINK); b.arrow([(CX-30,CY+80),(CX-30,CY+240)], PINK, width=6)
    elif i == 3:
        b.line(CX, 330, CX, 380, WHITE, width=5)
        pts = [(CX + 330*math.sin(t), 380 + 330*(1-math.cos(t))*0.9) for t in [x/20*1.0-0.7 for x in range(0,29)]]
        b.stroke(pts, WHITE, width=3, pressure=0.5)
        b.dot(CX, 380+330*0.0+300, 14, PINK); b.line(CX, 380, CX, 680, WHITE, width=5)
        b.arrow([(CX+30,740),(CX+300,700)], PINK, width=6)
    elif i == 4:
        earth(b); b.dot(CX, CY+R-20, 12, PINK); b.arrow([(CX-80,CY-R+60),(CX-80,CY+R-60)], PINK, width=6)
        b.arrow([(CX+80,CY+R-60),(CX+80,CY-R+60)], BLUE, width=6)
    else:
        earth(b); 
        for k in range(3):
            b.arrow([(CX-170+k*5, CY-R+70),(CX-170+k*5, CY+R-70)], PINK if k%2==0 else BLUE, width=5)
        b.circle(CX, CY, R+50, YELLOW, width=3)
    b.dust(); b.frame(); b.composite()
    b.save(f"frames/s{i}.png")
    print("scene", i, "done", flush=True)
