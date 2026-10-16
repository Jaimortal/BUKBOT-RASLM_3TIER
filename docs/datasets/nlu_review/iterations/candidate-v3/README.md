# candidate-v3 training-only iteration

This iteration advances Candidate v2 by:
1. Moving all remaining 146 reserve training groups into training.
2. Adding 64 BukSU-grounded boundary bridge examples specifically targeted at the errors identified in Candidate v2 (grade scale definitions, cross-enrollment offerings, dental/counseling services, facility booking procedures, unit overload workflows, and validity schedules).
3. Keeping the frozen 158 validation examples and 150 test examples 100% byte-for-byte identical to ensure strict benchmark comparability.

| Split | Count |
|---|---:|
| Training | 1287 |
| Validation | 158 |
| Test | 150 |
