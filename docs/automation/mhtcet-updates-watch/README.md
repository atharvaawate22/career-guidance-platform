# mhtcet-updates-watch (scheduled task snapshot)

This is a **tracked reference copy** of the `mhtcet-updates-watch` Claude Code
scheduled task. The live, authoritative source the scheduler actually runs
from is local automation config, not part of this repo:

```
~/.claude/scheduled-tasks/mhtcet-updates-watch/SKILL.md
~/.claude/scheduled-tasks/mhtcet-updates-watch/cutoff_state.txt
```

Runs daily at 9am IST (bumps to every 4 hours automatically while a CAP
round's window is open and its cutoff hasn't loaded yet — see SKILL.md step
5.0). It detects new official MHT-CET notices and inserts them into the
`updates` table, and auto-downloads/parses/loads newly-live CAP round cutoff
PDFs into the `cutoffs` table (Round II onward; Round I was loaded manually
on 2026-08-12, see [../../../scripts/parse_ai_cutoffs.py](../../../scripts/parse_ai_cutoffs.py)
and [../../../backend/scripts/load_ai_cutoffs_additive.js](../../../backend/scripts/load_ai_cutoffs_additive.js)).

When the live config changes, re-sync these copies by hand (or ask Claude
to do it) — they won't update automatically.
