"""Batch TTS with Chatterbox (run inside the chatterbox venv).

usage: tts_cb.py <model> <jobs.json>
  model: a local dir (German fine-tune, ChatterboxTTS) or "mtl" (multilingual, language de)
  jobs: [{"text", "out", "exaggeration", "cfg", "temp", "prompt"?}]
"""
import json, sys
import torch, torchaudio

torch.manual_seed(7)
if sys.argv[1] == "mtl":
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    model = ChatterboxMultilingualTTS.from_pretrained("cpu")
    extra = {"language_id": "de"}
else:
    from chatterbox.tts import ChatterboxTTS
    model = ChatterboxTTS.from_local(sys.argv[1], "cpu")
    extra = {}
for job in json.load(open(sys.argv[2])):
    torch.manual_seed(job.get("seed", 7))
    kw = dict(extra, exaggeration=job.get("exaggeration", 0.6), cfg_weight=job.get("cfg", 0.5), temperature=job.get("temp", 0.8))
    if job.get("prompt"):
        kw["audio_prompt_path"] = job["prompt"]
    wav = model.generate(job["text"], **kw)
    torchaudio.save(job["out"], wav, model.sr)
    print("tts", job["out"].rsplit("/", 1)[-1], round(wav.shape[-1] / model.sr, 2), flush=True)
