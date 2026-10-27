"""Spielt die MIDI-Noten mit FluidR3_GM ein, schneidet nahtlose Schleifen und kodiert MP3. Aufruf: python3 render_music.py <mid-ordner> <ziel>"""
import subprocess as sp, sys, os, glob
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
def run(*a): sp.run(a, check=True, capture_output=True)
for mid in sorted(glob.glob(f'{src}/*.mid')):
    name = os.path.basename(mid)[:-4]; raw = f'{src}/{name}.raw.wav'
    run('fluidsynth', '-ni', '-g', '0.45', '-r', '44100', '-o', 'synth.reverb.room-size=0.72', '-o', 'synth.reverb.damp=0.35', '-o', 'synth.reverb.level=0.75', '-o', 'synth.reverb.width=0.9', '-F', raw, SF, mid)
    fx = ['highpass', '28', 'compand', '0.02,0.25', '-50,-50,-24,-18,-6,-6,0,-3', '-4', '0', '0.02', 'gain', '-n', '-1.2']
    if os.path.exists(f'{src}/{name}.loop'):
        beats, bpm = map(float, open(f'{src}/{name}.loop').read().split()); L = beats*60/bpm
        # zweiter Durchgang: enthält schon den Nachhall des ersten, daher nahtlos
        run('sox', raw, f'{src}/{name}.cut.wav', 'trim', f'{L:.4f}', f'{L:.4f}', *fx)
        open(f'{dst}/{name}.txt', 'w').write(f'{L:.4f}')
    else:
        beats, bpm = map(float, open(f'{src}/{name}.len').read().split()); L = beats*60/bpm+2.5
        run('sox', raw, f'{src}/{name}.cut.wav', 'trim', '0', f'{L:.3f}', *fx, 'fade', '0', f'{L:.3f}', '1.2')
    run('ffmpeg', '-y', '-loglevel', 'error', '-i', f'{src}/{name}.cut.wav', '-codec:a', 'libmp3lame', '-b:a', '112k' if os.path.exists(f'{src}/{name}.loop') else '128k', f'{dst}/{name}.mp3')
    print(name, round(L, 1), 's', os.path.getsize(f'{dst}/{name}.mp3')//1024, 'KB')
