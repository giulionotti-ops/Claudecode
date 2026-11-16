import json, subprocess
S = json.load(open("script.json"))
parts = []
for i, s in enumerate(S, 1):
    subprocess.run(["/tmp/tts-venv/bin/edge-tts","--voice","en-GB-RyanNeural","--rate=-5%","--text",s["vo"],"--write-media",f"audio/v{i}.mp3"],check=True,capture_output=True)
    d = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"audio/v{i}.mp3"]))+0.5
    n = int(d*30)
    zi = "zoompan=z='1+0.08*on/%d':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=%d:s=1920x1080:fps=30"%(n,n)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-loop","1","-i",f"frames/s{i}.png","-i",f"audio/v{i}.mp3","-filter_complex",f"[0:v]{zi}[v];[1:a]apad=pad_dur=0.5[a]","-map","[v]","-map","[a]","-t",f"{d:.2f}","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac","-ar","44100",f"part{i}.mp4"],check=True)
    parts.append(f"part{i}.mp4"); print(i, round(d,1))
open("list.txt","w").write("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg","-y","-loglevel","error","-f","concat","-i","list.txt","-c","copy","test_never_stopped.mp4"],check=True)
