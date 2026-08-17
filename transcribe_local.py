#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path


def fail(message, code=1):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    raise SystemExit(code)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--language", default="auto")
    parser.add_argument("--model", default=os.getenv("TRANSCRIPTION_MODEL", "medium"))
    parser.add_argument("--device", default=os.getenv("TRANSCRIPTION_DEVICE", "cpu"))
    parser.add_argument("--compute-type", default=os.getenv("TRANSCRIPTION_COMPUTE_TYPE", "int8"))
    parser.add_argument("--model-dir", default=os.getenv("TRANSCRIPTION_MODEL_DIR", ""))
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        fail(
            "El motor local faster-whisper no está instalado. "
            "Ejecuta el instalador de Transcripción o instala las dependencias de "
            "python-transcription/requirements.txt. Detalle: " + str(exc)
        )

    audio = Path(args.audio)
    if not audio.exists():
        fail("No se encontró el archivo temporal de audio.")
    if audio.stat().st_size == 0:
        fail("El audio está vacío.")

    device = args.device
    compute_type = args.compute_type
    try:
        model_kwargs = {"device": device, "compute_type": compute_type}
        if args.model_dir:
            model_kwargs["download_root"] = args.model_dir
        model = WhisperModel(args.model, **model_kwargs)
    except Exception as exc:
        # On systems without CUDA, transparently retry CPU/int8 when a GPU config is invalid.
        if device != "cpu":
            try:
                model_kwargs = {"device": "cpu", "compute_type": "int8"}
                if args.model_dir:
                    model_kwargs["download_root"] = args.model_dir
                model = WhisperModel(args.model, **model_kwargs)
                device = "cpu"
                compute_type = "int8"
            except Exception as retry_exc:
                fail(f"No se pudo cargar faster-whisper: {retry_exc}")
        else:
            fail(f"No se pudo cargar faster-whisper: {exc}")

    language = None if str(args.language).strip().lower() in ("", "auto") else str(args.language).strip().lower()
    try:
        segments, info = model.transcribe(
            str(audio),
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
            fail("No se detectó habla reconocible en el audio.")
        detected = getattr(info, "language", None) or language or "unknown"
        probability = getattr(info, "language_probability", None)
        print(json.dumps({
            "ok": True,
            "text": text,
            "language": detected,
            "languageProbability": probability,
            "model": args.model,
            "device": device,
            "computeType": compute_type,
        }, ensure_ascii=False))
    except Exception as exc:
        fail(f"Falló la transcripción local: {exc}")


if __name__ == "__main__":
    main()
