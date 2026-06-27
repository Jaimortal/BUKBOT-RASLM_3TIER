# BukSU Chatbot RASA based

This guide covers how to run the project on your local machine, with specific instructions for Windows.

## Prerequisites

1.  **Node.js**: Version 18 or higher.
2.  **Python**: Version 3.8 - 3.10 (for Rasa backend)
3.  **Terminal**: PowerShell, Command Prompt (cmd), or Git Bash.

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Jaimortal/Chatbot_V3_RASABASED.git
cd Chatbot_V3_RASABASED
```

### 2. Install Node.js Dependencies
```bash
npm install
```

### 3. Setup Python Environment (for Rasa)
```bash
cd rasa
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install rasa
cd ..
```

## Quick Start (Frontend Only)

The default port for this application is **5000**.

### 1. Run the App

**Option A: Using Git Bash (Recommended for Windows)**
```bash
npm run dev
```

**Option B: Using Command Prompt (cmd) or PowerShell**
Since the default scripts use Linux-style environment variables, you might need to run the command manually if `npm run dev` fails.

Run this command instead:
```bash
npx cross-env NODE_ENV=development npx tsx server/index.ts
```

*   The app will start at `http://localhost:5000`.
*   The admin dashboard is at `http://localhost:5000/admin`.
*   Sample URL `http://10.0.x.x:5000`

---

## Changing the Port

By default, the app runs on port **5000**. If you want to use a different port (e.g., 3000), you can set the `PORT` environment variable.

**Command Prompt (cmd):**
```cmd
set PORT=3000 && npx cross-env NODE_ENV=development npx tsx server/index.ts
```

**PowerShell:**
```powershell
$env:PORT=3000; npx cross-env NODE_ENV=development npx tsx server/index.ts
```
**Git Bash / Mac / Linux:**
```bash
PORT=3000 npm run dev
```

---

## Running the Real Rasa Backend (Optional)

If you are using the Python Rasa backend:

1.  **Install Python 3.8 - 3.10** and make sure it's in your PATH.
2.  Navigate to the `rasa` folder:
    ```bash
    cd rasa
    ```
3.  Create and activate virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows command
    ```
4.  Install Rasa:
    ```bash
    pip install rasa
    ```
5.  Train and Run:
    ```bash
    rasa train
    rasa run actions
    rasa run --enable-api --cors "*"
    (sample: rasa run --enable-api --cors "http://127.0.0.1:5000") for spacific domain only
    ```

---

## Features

- **Interactive Chat Widget**: Floating chat bubble with expanded window
- **Voice Input**: Speech-to-text integration using Web Speech API
- **Map Integration**: Leaflet maps rendered directly in chat for navigation queries
- **Admin Dashboard**: Manage intents, responses, and map locations
- **Bilingual Support**: English and Bisaya (Cebuano) with phrase-based translation
- **Phrase-based Translation**: Rule-based English to Cebuano translation system
- **Auto-translation**: Automatically translates English responses to Cebuano

## Project Structure

- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express, TypeScript
- **AI**: Rasa (Python)
- **Translation**: Phrase-based rule system in `rulebaseTranslation/`
- **Maps**: Leaflet / React-Leaflet

## Translation System

The project includes a phrase-based translation system for English to Cebuano:

- **Phrase Rules**: Located in `rulebaseTranslation/phrase_rules.json`
- **Python Translator**: `rulebaseTranslation/phraseTranslator.py`
- **TypeScript Integration**: `rulebaseTranslation/phraseTranslator.ts`
- **Auto-translation**: Automatically translates admin responses when Cebuano field is left blank

## Development Notes

- You only re-run the Python server to refresh the entire response for the chatbot
- Do not re-run the Rasa shell or Rasa API sample as it will load longer
- You only need to wait for the Python server and API to fully load before using the chatbot
- The translation system uses phrase rules and falls back to English when phrases aren't found

## Building for Production

To create a production build:

```bash
npm run build
```

This will generate a `dist` folder containing:
- `dist/public`: The compiled static frontend assets
- `dist/index.cjs`: The server entry point

To run the production build:

```bash
npm start
```

## Troubleshooting on Windows

- **"NODE_ENV is not recognized..."**: Use `npx cross-env` as shown above
- **"Port 5000 is already in use"**: Change the port using the instructions above, or close the application using that port
- **Python/Rasa issues**: Make sure Python 3.8-3.10 is installed and in your PATH
- **Translation not working**: Check that `rulebaseTranslation/phrase_rules.json` exists and is properly formatted

## Environment Variables

Create a `.env` file in the root directory for configuration:

```env
PORT=5000
NODE_ENV=development
PYTHON_CMD=python3
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of BukSU (Bukidnon State University) Information Unit.
