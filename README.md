# Recipe Extractor Chrome Extension

A private desktop utility for turning TikTok and Instagram cooking posts into saved, editable recipes.

There is no standalone website. The visible product is a Chrome extension. A small Python helper runs only on your computer at `127.0.0.1:5000` so the extension can download/transcribe social media and send the result back to Chrome.

## What it does

- Detects the TikTok or Instagram page you currently have open
- Extracts the post caption and accessible media
- Transcribes the creator's spoken audio
- Builds a structured recipe without inventing missing measurements
- Shows ingredients, amounts, instructions, notes, missing details, and the raw transcript
- Saves recipes locally in Chrome
- Lets you search saved recipes
- Lets you edit recipe names, ingredients, quantities, units, notes, and instructions
- Scales numeric ingredient quantities to a different serving count
- Lets you set/correct the original serving count if the creator did not state one
- Keeps an original baseline so scaled recipes can be reset
- Links back to the original TikTok/Instagram post
- Supports duplicating and deleting saved recipes

## First-time setup on Windows

### 1. Download this repository

On GitHub, click **Code > Download ZIP**, unzip it somewhere permanent such as:

`Documents\Recipe Extractor`

Do not delete or move the folder after loading the extension unless you plan to reload it from the new location.

### 2. Install Python

Install Python 3.11 or newer if you do not already have it. During installation, enable the option to add/install the Python launcher.

### 3. Run setup

Double-click:

`setup.bat`

It creates a private Python environment, installs the required packages, and creates a `.env` file.

### 4. Add your OpenAI API key

Open `.env` in Notepad and replace `your_key_here` with your API key. Never commit your real `.env` file to GitHub.

### 5. Load the Chrome extension

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `extension` folder inside this repository.
6. Pin **Recipe Extractor** from Chrome's Extensions menu so it is always visible.

That only needs to be done once. When code in the extension folder changes, return to `chrome://extensions` and click the extension's reload button.

## Each time you want to use it

### Start the local helper

Double-click:

`start.bat`

A small command window will say the Recipe Extractor helper is running. Keep that window open while using the extension. You can minimize it.

### Extract a recipe

1. Open a public TikTok video or Instagram Reel/post containing a recipe.
2. Click the **Recipe Extractor** Chrome icon.
3. The current page link should appear automatically. If not, click **Use current page** or paste the link manually.
4. Click **Extract recipe**.
5. Wait for the recipe to appear in the popup.
6. Review the ingredients and instructions. Expand **Notes & source details** if you want to see missing information or the raw transcript.
7. Click **Save**.

## View and manage saved recipes

Click **My Recipes** in the extension popup. This opens a full-size page that belongs to the extension, not a website.

Your saved recipes are stored in Chrome on this computer using `chrome.storage.local`.

### Search

Use the search box at the top. It searches recipe names and ingredient names.

### Edit a recipe

Open a saved recipe and edit any field directly:

- recipe name
- ingredient amount
- unit
- ingredient name
- ingredient notes
- cooking instructions
- recipe notes

Changes auto-save. You can also click **Save changes**.

### Scale a recipe

1. Open a saved recipe.
2. Check **Original servings**. If the creator did not state a serving count, enter what you believe the original recipe makes.
3. Under **Scale to**, enter the desired number of servings or use the `−` and `+` buttons.
4. Numeric ingredient amounts update automatically.
5. Amounts such as `to taste`, `a splash`, or unspecified quantities stay unchanged because they cannot be scaled reliably.
6. Click **Reset** to restore the original extracted/edited baseline quantities.

Common fractions are displayed in kitchen-friendly form when possible, such as `1/2`, `3/4`, or `1 1/2`.

### Fix an extracted amount

If the extractor got an ingredient wrong, type the correct amount directly into the ingredient row. That corrected amount becomes the new baseline for future scaling.

### Add missing information

Use **+ Add ingredient** or **+ Add step**. This is useful when the video shows something visually but never says it clearly in the audio/caption.

### Duplicate

Click **Duplicate** if you want a modified version while keeping the original recipe unchanged, for example a high-protein version or a version with your own substitutions.

### Return to the source

Click **Original post** to reopen the TikTok or Instagram source.

### Delete

Click **Delete** and confirm.

## How the tool is structured

- `extension/` — the entire user-facing Chrome extension
- `app.py` — local-only API used by the extension
- `setup.bat` — one-time Windows setup
- `start.bat` — starts the local helper
- `.env` — your private API key and model settings; ignored by Git

Processing flow:

`TikTok / Instagram -> Chrome extension -> local Python helper -> media/caption -> transcription -> structured recipe -> Chrome local storage`

## Privacy / limitations

The helper binds to `127.0.0.1`, so it is intended to be reachable only from your computer. Saved recipe records stay in Chrome local storage unless you manually export or copy them elsewhere.

TikTok and Instagram can change how public media is exposed. Public posts usually work best. Private, login-gated, region-restricted, or otherwise inaccessible posts may fail. Only process media you are permitted to access.
