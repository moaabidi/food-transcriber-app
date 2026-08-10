# Food Transcriber

A deliberately small web tool for turning public TikTok and Instagram recipe links into usable recipes.

Paste a link and the tool attempts to:

- pull the post metadata and media
- transcribe spoken audio
- combine the transcript with the creator's caption
- extract the recipe name, creator, yield, ingredients, measurements, timing, notes, and ordered instructions
- clearly mark details that were not actually stated instead of inventing them

## Run locally

1. Install Python 3.11+ and ffmpeg.
2. Create a virtual environment.
3. Run `pip install -r requirements.txt`.
4. Copy `.env.example` to `.env` and add your OpenAI API key.
5. Run `python app.py`.
6. Open `http://localhost:5000`.

## Environment variables

```bash
OPENAI_API_KEY=your_key_here
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_TEXT_MODEL=gpt-5-mini
```

## Notes

This is a personal utility, not a mobile application. Social platforms change their public extraction behavior frequently. Public posts usually work best; private, login-gated, region-restricted, or otherwise inaccessible posts may fail. Only process media you are permitted to access.
