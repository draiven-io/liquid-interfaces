# The technical reference

A single document covering LIP, IBAC and agentic-bus, written for a technical
audience that has to be convinced rather than informed.

**[Read it →](../liquid-interfaces-technical-reference.pdf)** (19 pages, A4)

## What it is for

Sections 1–4 are the argument, 5–7 the evidence, and **section 8 is the one
that earns its keep**: seven objections with answers, including the two that
concede. *“Negotiating every interaction is too slow”* is answered with
*“correct, for the wrong workload”*, because a defence with no concessions in
it is not credible to the people most worth convincing.

Section 9.2 lists the known gaps outright for the same reason. Stating them
first is stronger than being asked about them.

## Regenerating

The source of truth is [`index.html`](index.html). The PDF is a build artifact
that happens to be committed, so the repository can link to something.

```bash
npm install && npx playwright install chromium
```

```bash
npm run docs:pdf
```

## Keeping it honest

Every figure in the document was read from the source repositories at the time
of writing, not recalled. That is the property worth preserving: a defence
document with one wrong number is worse than no document, because the reader
who catches it stops believing the rest.

So when the protocol version moves, or a gap in §9.2 closes, **change the
document in the same commit**. The things most likely to go stale:

| In the document | Read it from |
|---|---|
| Protocol version, performative list | `agentic_bus/core/protocol/envelope.py` |
| IBAC decisions, evaluation points, layer precedence | `agentic_bus/core/ibac/engine.py` |
| Conformance requirement table (§6.2) | `agentic_bus/conformance.py` |
| Test counts and line counts (§5) | `pytest -q`, `find … | wc -l` |
| Shipped-versus-pending table (§9.1) | PyPI and npm, not memory |

## A note on the font check

`render.mjs` verifies that each webfont is genuinely rendering, by measuring
text width against its fallback, and **throws** if any face fell back.

This exists because `document.fonts.check()` returns a false negative for
variable fonts with an `opsz` axis — an earlier version of the script reported
Newsreader as missing while it was rendering correctly. The reverse failure is
the one that matters: a silent fallback produces a PDF that looks right to the
machine that built it and wrong to everyone who opens it.
