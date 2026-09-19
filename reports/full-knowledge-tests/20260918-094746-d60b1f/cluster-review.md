# Cluster 1: Grading and Retention

Date: 2026-09-18. Scope: 6 live `/api/chat` requests, 3 topics, English and Cebuano, open context, concurrency 1. No other cluster was run. The full machine-readable answers are in `results.jsonl`.

## Outcome

- 4/6 responses exactly matched their official JSON answers; 2/6 were clearly wrong. This is a six-case result, not an overall chatbot accuracy rate.
- No clarification choices were returned. One answer was an unrelated admission-result response; one was a location fallback.
- Every answer was delivered through the Rasa API. The API does **not** disclose whether the optional LLM reranker selected a candidate. It is enabled on the running server, but per-request LLM versus local retrieval attribution is **unverified**. The LLM does not author the official answer text.

## Queries and Answers

### K097-CEB-01: Correct official data; 25.25 s

**Query:** Karon pa ko nahagbong og subject, pwede ra nako balikon?

**Response:**

> Sumala sa academic policies sa BukSU, pwede ka mokuha balik og subject kung first time pa nimo nga nabagsak.
>
> Apan palihog timan-i nga kung mabagsak nimo ang usa ka subject ug makadaghang beses, hangtod tulo ka attempts, mahimo kini magdala og seryosong mga resulta.
>
> Lakip niini ang posibilidad nga marekomenda ka nga mobalhin og laing eskwelahan.
>
> Mas maayo nga mokonsulta ka sa imong college faculty para sa mas klaro nga detalye ug hustong giya.

**Selection source:** Unverified (Rasa API does not expose reranker use).

### K097-EN-01: Correct official data; 23.92 s

**Query:** First time failing a subject. Am I allowed to take it again?

**Response:**

> According to BukSU academic policies, you may retake a subject if it is your first time failing it.
>
> However, please note that failing a subject multiple times, up to three total attempts, may lead to serious consequences.
>
> In some cases, this may include being advised to transfer to another school.
>
> For more specific details and proper guidance, it is recommended to consult your college faculty.

**Selection source:** Unverified (Rasa API does not expose reranker use).

### K098-CEB-01: Correct official data; 3.61 s

**Query:** Unsay pasabot sa academic probation sa BukSU?

**Response:** Ang academic probation ihatag sa students nga ubos ug performance.

**Selection source:** Unverified (Rasa API does not expose reranker use).

### K098-EN-01: Correct official data; 2.74 s

**Query:** What does academic probation mean at BukSU?

**Response:** Academic probation is given to students with low academic performance.

**Selection source:** Unverified (Rasa API does not expose reranker use).

### K099-CEB-01: Wrong data; 2.89 s

**Query:** Pasar ba o hagbong ang 3.0 sa grado sa BukSU?

**Response:**

> Unsaon ug kanus-a nako makuha ang resulta sa akong examination?
>
> Ang schedule sa pag-release sa examination results ipost sa BukSU Admission and Testing Facebook page.
>
> Ang resulta sa examination ipost usab sa imong admission account mga bulan sa Mayo hangtod Hunyo.
>
> Para mahibal-an kung nakapasar ka, login sa imong BukSU Admission account ug ablihi ang Admission tab o Show Exam Result kung available na.

**Expected:** The grading-system record says 3.0 is the passing mark. **Classification:** Unrelated admission-result answer, not a fallback or clarification. **Selection source:** Unverified.

### K099-EN-01: Wrong fallback; 3.03 s

**Query:** Is 3.0 a pass or a fail on a BukSU grade sheet?

**Response:** Sorry, I don't have location information for 3.0.

**Expected:** The grading-system record says 3.0 is the passing mark. **Classification:** Location fallback, not a clarification choice. **Selection source:** Unverified.

## Performance

The six requests took 61.5 s total. Median latency was approximately 3.3 s; p95 was 25.25 s. The first two requests account for most of the elapsed time. All returned HTTP 200, including the two wrong answers. Their recorded Node-to-Rasa call time was effectively the entire request time.

Resource samples during this cluster: system RAM 7,208-7,313 MB of 7,971 MB; Rasa RAM about 966-972 MB; action server RAM about 93-106 MB. While the first two requests were active, action-server CPU sampled at 78-99% of one core; Rasa CPU was 0-5%. The samples support an action-server bottleneck for these requests, but they do not distinguish expensive local retrieval from a particular external LLM call. PostgreSQL was not visibly busy in the samples. No source code or knowledge data was changed by this run.
