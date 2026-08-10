import json
import os
import re
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ALLOWED_HOSTS = {
    "tiktok.com",
    "www.tiktok.com",
    "vm.tiktok.com",
    "vt.tiktok.com",
    "instagram.com",
    "www.instagram.com",
}


def validate_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("Please paste a public TikTok or Instagram link.")


def download_media(url: str, workdir: str):
    output_template = str(Path(workdir) / "source.%(ext)s")
    options = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "restrictfilenames": True,
    }

    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(url, download=True)
        sanitized = ydl.sanitize_info(info)
        requested = info.get("requested_downloads") or []
        if requested and requested[0].get("filepath"):
            media_path = requested[0]["filepath"]
        else:
            media_path = ydl.prepare_filename(info)

    if not os.path.exists(media_path):
        candidates = list(Path(workdir).glob("source.*"))
        if not candidates:
            raise RuntimeError("The media could not be downloaded from this post.")
        media_path = str(candidates[0])

    metadata = {
        "title": sanitized.get("title") or "",
        "description": sanitized.get("description") or "",
        "creator": sanitized.get("uploader") or sanitized.get("channel") or "",
        "creator_url": sanitized.get("uploader_url") or sanitized.get("channel_url") or "",
        "duration_seconds": sanitized.get("duration"),
        "thumbnail": sanitized.get("thumbnail") or "",
        "webpage_url": sanitized.get("webpage_url") or url,
    }
    return media_path, metadata


def transcribe(media_path: str) -> str:
    with open(media_path, "rb") as media_file:
        result = client.audio.transcriptions.create(
            model=os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe"),
            file=media_file,
        )
    return result.text.strip()


def extract_recipe(transcript: str, metadata: dict) -> dict:
    prompt = f"""
You are converting a social-media cooking post into a precise recipe record.

Use ONLY facts supported by the creator's spoken transcript or caption/metadata below.
Do not invent quantities, temperatures, timings, serving counts, or ingredients.
If a relevant detail is missing, use null or explicitly say "not stated".
Separate ingredients from optional garnishes when possible.
Put instructions in the order the creator performs or describes them.
Preserve useful details such as pan size, heat level, rest time, texture cues, substitutions, storage, and serving suggestions.

Return ONLY valid JSON with exactly this shape:
{{
  "recipe_name": string,
  "creator": string|null,
  "yield": string|null,
  "prep_time": string|null,
  "cook_time": string|null,
  "total_time": string|null,
  "ingredients": [{{"item": string, "quantity": string|null, "notes": string|null}}],
  "instructions": [string],
  "notes": [string],
  "missing_details": [string]
}}

POST METADATA/CAPTION:
{json.dumps(metadata, ensure_ascii=False)}

SPOKEN TRANSCRIPT:
{transcript}
""".strip()

    response = client.responses.create(
        model=os.getenv("OPENAI_TEXT_MODEL", "gpt-5-mini"),
        input=prompt,
        store=False,
    )
    text = response.output_text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    return json.loads(text)


@app.get("/")
def home():
    return render_template("index.html")


@app.post("/api/transcribe")
def transcribe_recipe():
    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()

    try:
        validate_url(url)
        if not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY is not configured.")

        with tempfile.TemporaryDirectory() as workdir:
            media_path, metadata = download_media(url, workdir)
            transcript = transcribe(media_path)
            recipe = extract_recipe(transcript, metadata)

        return jsonify({
            "source": metadata,
            "recipe": recipe,
            "transcript": transcript,
        })
    except Exception as exc:
        app.logger.exception("Recipe transcription failed")
        return jsonify({"error": str(exc)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
