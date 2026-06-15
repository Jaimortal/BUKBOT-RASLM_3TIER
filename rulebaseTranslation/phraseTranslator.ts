import { spawn } from "child_process";
import path from "path";

const PROJECT_ROOT = process.cwd();

interface TranslationResult {
  success: boolean;
  translatedText?: string;
  error?: string;
}

class PhraseTranslator {
  private pythonScript: string;

  constructor() {
    // Path to rulebaseTranslation folder
    this.pythonScript = path.join(PROJECT_ROOT, "rulebaseTranslation", "phraseTranslator.py");
  }

  async translateToCebuano(text: string): Promise<string> {
    if (!text || typeof text !== "string") {
      return text;
    }

    try {
      const result = await this.runPythonScript(text);
      return result;
    } catch (error) {
      console.error("Phrase translation error:", error);
      return text; // Return original text if translation fails
    }
  }

  private async runPythonScript(text: string): Promise<string> {
    const candidates: Array<{ cmd: string; argsPrefix: string[] }> = [];
    
    if (process.env.PYTHON_CMD) {
      candidates.push({ cmd: process.env.PYTHON_CMD, argsPrefix: [] });
    }

    if (process.platform === "win32") {
      candidates.push({ cmd: "py", argsPrefix: ["-3"] });
      candidates.push({ cmd: "python", argsPrefix: [] });
      candidates.push({ cmd: "python3", argsPrefix: [] });
    } else {
      candidates.push({ cmd: "python3", argsPrefix: [] });
      candidates.push({ cmd: "python", argsPrefix: [] });
    }

    const trySpawn = (idx: number): Promise<string> => {
      if (idx >= candidates.length) {
        throw new Error("Python is not available for phrase translation");
      }

      const { cmd, argsPrefix } = candidates[idx];
      const args = [
        ...argsPrefix,
        this.pythonScript,
        "--translate",
        text,
      ];

      return new Promise((resolve, reject) => {
        const child = spawn(cmd, args);
        let stdout = "";
        let stderr = "";
        let settled = false;

        const doneOk = (val: string) => {
          if (settled) return;
          settled = true;
          resolve(val);
        };
        
        const doneErr = (err: unknown) => {
          if (settled) return;
          settled = true;
          reject(err);
        };

        child.stdout?.on("data", (d) => (stdout += String(d)));
        child.stderr?.on("data", (d) => (stderr += String(d)));

        child.on("error", (err: any) => {
          if (err && err.code === "ENOENT") {
            trySpawn(idx + 1).then(doneOk).catch(doneErr);
            return;
          }
          doneErr(err);
        });

        child.on("close", (code) => {
          if (code !== 0) {
            doneErr(new Error(stderr || `Phrase translator failed with code ${code}`));
            return;
          }

          try {
            // Parse JSON output from Python script
            const lines = stdout.trim().split('\n');
            const jsonLine = lines.find(line => line.trim().startsWith('{'));
            
            if (jsonLine) {
              const parsed = JSON.parse(jsonLine);
              if (parsed?.success && typeof parsed.translatedText === "string") {
                doneOk(parsed.translatedText);
                return;
              }
              doneErr(new Error(parsed?.error || "Phrase translator returned no translatedText"));
            } else {
              // If no JSON found, treat entire stdout as translated text
              if (stdout.trim()) {
                doneOk(stdout.trim());
              } else {
                doneErr(new Error("No valid output from phrase translator"));
              }
            }
          } catch (e) {
            // If JSON parsing fails, treat stdout as plain text
            if (stdout.trim()) {
              doneOk(stdout.trim());
            } else {
              doneErr(new Error(`Failed to parse Python output: ${stdout || stderr}`));
            }
          }
        });
      });
    };

    return trySpawn(0);
  }
}

export default PhraseTranslator;
