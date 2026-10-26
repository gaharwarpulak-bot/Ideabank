# IdeaBank — Neeman's ad film scripts

A 5-step ad script generator that runs on this PC and calls Claude through the Anthropic API.
It writes inside Neeman's brand — positioning, tone of voice and the film guidelines from the
brand manual are built into the prompt, so the output comes back on brand rather than generic.

## Run it

Double-click `start.bat`, or from a terminal:

```bash
node server.js
```

Then open http://localhost:4321 (start.bat opens it for you).

Opening `public/index.html` straight off the disk also works — it sends itself to the server.
If the server isn't running it says so plainly, with a button to open the right address.

## The API key

The first time the page loads it asks for your Anthropic API key. It is verified with a
tiny test call, then saved to `%USERPROFILE%\.ideabank\config.json` — so you are only
asked once. "Change key" in the header forgets it and asks again.

The key never appears in the page source: the browser talks to `server.js`, and only the
server talks to `api.anthropic.com`. You can also set `ANTHROPIC_API_KEY` as an
environment variable instead, which takes priority over the saved key.

Get a key at https://console.anthropic.com/settings/keys — usage is billed to that account.

## The five steps

1. **Ad type** — Campaign Ad, Product Ad or Founder's Ad. A campaign ad leads with the brand
   idea and the audience truth; a product ad makes one specific shoe wanted; a founder's ad
   puts the founder on camera in first person, pitching the product or the reason the brand
   exists. Founder films get their own craft rules — direct to lens, natural light, a real
   place, led by a real decision rather than a greeting. The prompt will not invent the
   founder's name or biography; it writes the part as FOUNDER for the team to cast.
2. **Category** — Sneakers, Slip-Ons, Loafers, Oxfords & Brogues, Sandals, Slides, Clogs,
   Flip-Flops, Flats (Women), Sports & Walking, or Whole range / Brand level.
   The list follows the collections on neemans.com.
3. **Reference images** — click or drag in 1 to 10 product/reference shots. They are resized
   in the browser and sent to Claude as real images, so the scripts describe the actual shoe.
   Optional, but the output is markedly more specific with them.
4. **Duration** — 6 / 10 / 15 / 20 / 30 / 45 / 60 sec, or Custom. Every beat in the script
   is timed to add up to exactly this, start and end slates included.
5. **Story approach, per script** — set each of the three scripts to Origin Based, Over The
   Top, Slice of Life, Problem–Solution or Metaphorical. Leave any on **Auto** and Claude
   picks what fits best. The approach is the structure of the film, not a label — each one
   is explained to Claude in full, and the chosen approach is printed in the script heading.
6. **Write the scripts** — an optional free-text brief, then Generate. Claude streams back
   three genuinely different scripts, each with the idea, why it is Neeman's, a shot-by-shot
   table, taglines, music direction and a craft reference. Then "The Pick" — which one it
   would make and why.

After generating, the panel collapses to Quick Fire: regenerate, swap category, duration or
story approach with one tap, go back to Edit Brief, or Start Over. Copy or save any answer
as `.md`.

## Sessions

Every generated set of scripts is saved automatically and listed in the **Sessions** sidebar
on the left, newest first — click one to reload its scripts along with the ad type, category,
duration and approaches that produced it. **New** clears the form for a fresh run, and the ×
on a row deletes it.

Sessions live on this machine as one JSON file each, in `%USERPROFILE%\.ideabank\sessions\`.
Because they are stored by the server and not in the browser, they survive clearing browser
data, and the folder can be backed up or cleaned out by hand. Nothing is sent anywhere.

## The brand profile

Before every request the app hands Claude a brand profile — who the brand is, its
personality, its audience, its tone-of-voice rules, its film guidelines, its palette, the
facts it is allowed to state, and the craft worth borrowing from. That profile is what makes
the output land on brand instead of generic, and it does more work than any other part of
the prompt.

**It is not in this repository.** Brand strategy and brand manuals are internal documents, so
the real profile lives in `public/brand.local.js`, which is gitignored. What ships here is
`public/brand.example.js` — the same structure, with notes on what belongs in each section.

To set it up:

```bash
cp public/brand.example.js public/brand.local.js
```

Then fill it in and reload. The server serves `brand.local.js` as `/brand.js` when it exists
and falls back to the example when it does not, so the app runs either way — it just warns
you when it is running on the placeholder.

Write the tone-of-voice section as hard rules with right-and-wrong examples rather than
adjectives; that section changes the output more than anything else in the file. To change
how the scripts are structured rather than what the brand sounds like, edit `SYSTEM` in
`public/index.html`.

## Files

- `server.js` — static server + streaming proxy to the Anthropic API. No dependencies.
- `public/index.html` — the whole UI (HTML/CSS/JS in one file).
- `public/index.previous.html.bak` — the previous generic version, kept as a fallback.
- `start.bat` — launcher.

Change the port with `set PORT=5000 && node server.js`.
