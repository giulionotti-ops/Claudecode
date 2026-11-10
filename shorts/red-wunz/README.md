# Red Wunz Go Fasta (comic short #2)

48 s, 1080×1920. Real lore: Orks' shared belief (their psychic WAAAGH field) makes it true, so red vehicles really do go faster.

**Hook:** engine revs, "BOSS! I made da buggy go fasta!" "'Ow'd ya do dat?" "I painted it RED!"
**Middle:** the rookie and sarge (from *Fifteen Hours*) watch; the buggy rockets off; the commissar explains it ("Orks believe it, so it's true"). The Orks paint everything red; the rookie paints his tank red.
**Payoff:** the Orks see the red-painted rookie, "Dat one's red! It's one of OURS!", and carry him off on the buggy. Commissar: "Desertion. At remarkable speed."

Built with the shared engine (`../comic/engine/`), run from this folder:
```
python3 ../comic/engine/layout.py
python3 ../comic/gen_page.py page1.txt page1-art.jpg --ref page1-layout.png --ref ../fifteen-hours/page1-art.jpg
python3 ../comic/gen_page.py page2.txt page2-art.jpg --ref page2-layout.png --ref page1-art.jpg
python3 ../comic/engine/panels.py && python3 ../comic/engine/voice.py && python3 ../comic/engine/words.py && python3 ../comic/engine/sfx.py
python3 ../comic/engine/render.py --sheet && python3 ../comic/engine/render.py
```
Gemini cost: 2 pages × ~$0.135 = **~$0.27**. Gemini drew the commissar in two panels where the prompt asked for the sarge, so his lines were recast instead of paying for a redraw.

## Cast
Mek: Callum (pitched down) · Boss: Harry (pitched down) · Rookie: Liam · Sarge: Gravel Midnight · Commissar: Daniel

## Upload
**Title:** In 40k, RED Paint Makes You FASTER (Seriously)
**Description:**
Orks believe red ones go faster... and in Warhammer 40,000, if enough Orks believe something, it becomes true.

#warhammer40k #40k #orks #40klore #40kmemes #shorts

*Unofficial fan work. Warhammer 40,000 is a trademark of Games Workshop Ltd. Original characters and artwork.*

**Tags:** warhammer 40k, orks, red ones go faster, waaagh, 40k lore, imperial guard, commissar, 40k comic, 40k funny
