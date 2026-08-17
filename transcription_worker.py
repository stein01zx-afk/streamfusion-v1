#!/usr/bin/env python3
import argparse
import json
import os
import sys
import threading
from pathlib import Path

_model = None
_model_lock = threading.Lock()


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def load_model(args):
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is not None:
            return _model
        from faster_whisper import WhisperModel
        model_kwargs = {
            "device": args.device,
            "compute_type": args.compute_type,
        }
        if args.model_dir:
            model_kwargs["download_root"] = args.model_dir
        try:
            _model = WhisperModel(args.model, **model_kwargs)
        except Exception:
            if args.device != "cpu":
                model_kwargs["device"] = "cpu"
                model_kwargs["compute_type"] = "int8"
                _model = WhisperModel(args.model, **model_kwargs)
            else:
                raise
        return _model


def transcribe(model, audio_path, language):
    language = None if str(language or "auto").strip().lower() in ("", "auto") else str(language).strip().lower()
    segments, info = model.transcribe(
        str(audio_path),
        language=language,
        task="transcribe",
        beam_size=7,
        best_of=5,
        temperature=0.0,
        condition_on_previous_text=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        no_speech_threshold=0.5,
        compression_ratio_threshold=2.4,
        log_prob_threshold=-1.0,
        without_timestamps=True,
    )
    parts = []
    for segment in segments:
        text = str(getattr(segment, "text", "") or "").strip()
        if text:
            parts.append(text)
    text = " ".join(parts).strip()
    if not text:
        raise RuntimeError("No se detectó habla reconocible en el audio.")
    return {
        "text": text,
        "language": getattr(info, "language", None) or language or "unknown",
        "languageProbability": getattr(info, "language_probability", None),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=os.getenv("TRANSCRIPTION_MODEL", "small"))
    parser.add_argument("--device", default=os.getenv("TRANSCRIPTION_DEVICE", "cpu"))
    parser.add_argument("--compute-type", default=os.getenv("TRANSCRIPTION_COMPUTE_TYPE", "int8"))
    parser.add_argument("--model-dir", default=os.getenv("TRANSCRIPTION_MODEL_DIR", "/tmp/streamfusion-whisper-model"))
    args = parser.parse_args()

    try:
        # Validate import early, but do not download/load the model until the first job.
        import faster_whisper  # noqa: F401
    except Exception as exc:
        emit({"type": "ready", "ok": False, "error": f"faster-whisper no está instalado: {exc}"})
        return 2

    emit({"type": "ready", "ok": True, "model": args.model, "device": args.device, "computeType": args.compute_type})

    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            job = json.loads(raw)
            job_id = str(job.get("id") or "")
            if job.get("type") == "ping":
                emit({"type": "result", "id": job_id, "ok": True, "pong": True, "modelLoaded": _model is not None})
                continue
            if job.get("type") != "transcribe":
                emit({"type": "result", "id": job_id, "ok": False, "error": "Tipo de trabajo desconocido."})
                continue
            audio_path = Path(str(job.get("audioPath") or ""))
            if not audio_path.is_file():
                raise RuntimeError("No se encontró el audio temporal.")
            model = load_model(args)
            result = transcribe(model, audio_path, job.get("language") or "auto")
            emit({"type": "result", "id": job_id, "ok": True, **result})
        except Exception as exc:
            emit({"type": "result", "id": str(job.get("id") if isinstance(job, dict) else ""), "ok": False, "error": str(exc)})


if __name__ == "__main__":
    main()
