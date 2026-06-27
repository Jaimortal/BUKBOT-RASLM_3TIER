# Gorilla Chat Testing Guide

This project can run a local gorilla/stress regression test by sending many real chat messages through the same Express endpoint used by the chatbox.

The tester uses:

- endpoint: `http://127.0.0.1:5000/api/chat`
- dataset: `docs/Structured Retrieval QA Baseline Dataset.md`
- output folder: `reports/gorilla-tests/`
- guide location: `tools/Gorilla Chat Testing Guide.md`

## Before Running

Start the normal local services:

```powershell
rasa run actions
rasa run --enable-api --cors "*"
npm.cmd run dev
```

Open the chatbot once manually and confirm one ordinary question works before running the bulk test.

## Laptop-Safe Test

Use this first:

```powershell
python tools/gorilla_chat_test.py --total 100 --concurrency 2
```

This sends 100 messages with only 2 parallel requests.

## 1000-Message Gorilla Test

Recommended local command:

```powershell
python tools/gorilla_chat_test.py --total 1000 --concurrency 5 --shuffle
```

Use lower concurrency if the laptop becomes hot or slow:

```powershell
python tools/gorilla_chat_test.py --total 1000 --concurrency 2 --shuffle
```

## Ramp / Arrival-Rate Traffic Test

Use this when you want to simulate traffic increasing over time instead of sending only a fixed batch.

Important: during a ramp test, do not use the normal chatbox for manual testing. The test intentionally fills the same Express/Rasa queue used by real chat messages, so a simple `Hi` can become slow while the test is running.

Manual-chat-safe ramp test:

```powershell
python tools/gorilla_chat_test.py --arrival-rate-test --users 30 --duration-seconds 60 --start-rate 0.5 --end-rate 3 --concurrency 3 --shuffle
```

Use this when you still want to click around the app while the test is running.

Laptop-safe ramp test:

```powershell
python tools/gorilla_chat_test.py --arrival-rate-test --users 50 --duration-seconds 60 --start-rate 1 --end-rate 5 --concurrency 5 --shuffle
```

This means:

- `--users 50`: use 50 different simulated chat sessions
- `--duration-seconds 60`: run the ramp for 60 seconds
- `--start-rate 1`: start at about 1 message per second
- `--end-rate 5`: ramp up to about 5 messages per second
- `--concurrency 5`: allow up to 5 in-flight requests at the same time

Heavy saturation test:

```powershell
python tools/gorilla_chat_test.py --arrival-rate-test --users 100 --duration-seconds 120 --start-rate 5 --end-rate 30 --concurrency 30 --shuffle
```

This schedules about 2,100 messages in 120 seconds. It is expected to make normal chat messages slow while it runs because your laptop is serving the test traffic and your manual chat at the same time.

Very heavy saturation test, only if the laptop is stable:

```powershell
python tools/gorilla_chat_test.py --arrival-rate-test --users 100 --duration-seconds 180 --start-rate 10 --end-rate 60 --concurrency 60 --shuffle
```

This is not a good target for a 4GB RAM server unless the server has multiple workers, a queue, and enough CPU. It is mainly for finding the breaking point.

For a 4GB RAM server, start much lower:

```powershell
python tools/gorilla_chat_test.py --arrival-rate-test --users 30 --duration-seconds 60 --start-rate 0.5 --end-rate 2 --concurrency 2 --shuffle
```

## Context Memory Stress Test

This uses one session ID for all messages, so it stresses slot/context behavior more heavily:

```powershell
python tools/gorilla_chat_test.py --total 300 --concurrency 1 --keep-context
```

Use concurrency `1` for this mode because one conversation should be tested in order.

## Output

The terminal prints every request by default:

```text
1
question: Where is the main campus of BukSU located?
response: yes (bot did respond)
preview: Bukidnon State University...
```

It also keeps the progress markers and final summary:

```text
sent 25/100
sent 50/100
sent 75/100
sent 100/100

Done in 213.4s
Total: 100
Heuristic failures: 5
CSV: reports/gorilla-tests/gorilla-chat-YYYYMMDD-HHMMSS.csv
Report: reports/gorilla-tests/gorilla-chat-YYYYMMDD-HHMMSS.md
```

Each run creates:

- CSV report with every request/answer preview
- Markdown report with summary and first 30 failures
- Memory CSV report with RAM samples during the run
- Virtual-user latency summary in the Markdown report

The report flags:

- fallback-like answers
- HTTP/runtime errors
- missing map when the dataset says map is expected
- latency statistics
- peak RAM usage and memory percentage
- latency per simulated user/session

If you want less console noise during a large run, add:

```powershell
python tools/gorilla_chat_test.py --total 1000 --concurrency 5 --shuffle --no-log-each
```

## How To Read Results

A failure does not always mean the bot is wrong. It means the heuristic found something worth checking.

Common false alarms:

- The dataset says map is expected, but the correct answer is a clarification choice.
- The answer is valid but contains a fallback-like phrase.
- The expected record name in the dataset is outdated.

Common real bugs:

- The answer is unrelated to the question.
- A location answer has no map when the exact location exists.
- A short Cebuano question routes to office hours or unrelated enrollment text.
- A follow-up question ignores the previous subject.

## Good Targets

For a local capstone laptop:

- 100 messages: quick smoke check
- 300 messages: memory/context check
- 1000 messages: bulk stability check

Keep Chrome DevTools closed during bulk testing if memory is tight.
