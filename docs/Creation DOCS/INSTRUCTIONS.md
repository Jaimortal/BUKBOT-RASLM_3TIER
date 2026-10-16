# How to Run the Application (Windows Compatible)

This guide covers how to run the project on your local machine, with specific instructions for Windows.

## Prerequisites

1.  **Node.js**: Version 18 or higher.
2.  **Terminal**: PowerShell, Command Prompt (cmd), or Git Bash.

## Quick Start (Frontend Only)

The default port for this application is **5000**.

### 1. Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### 2. Run the App

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
6.  Important Note!
    ```bash
    you can view the index.ts the server side, to see what port needed to access during testing

    win + R -> CMD -> ipconfig -> copy the ipv4 address
    go to browser run the http://<ipv4 address>:5005
    "http://10.0.x.x:5000" <- Sample
    ```



## ❗NOTE this are the thing you need to know in the development of this project
- you only re run the python server to refresh the entire response for the chatbot
- do not re run the rasa shell, or rasa API sample is it will load more longer
- you only need to wait for the python server and API to fully used the chatbot

## Troubleshooting on Windows

- **"NODE_ENV is not recognized..."**: Use `npx cross-env` as shown above.
- **"Port 5000 is already in use"**: Change the port using the instructions above, or close the application using that port.
