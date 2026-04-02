# vouch.fun Demo Video Script — 2 Minutes

**Total Duration:** ~2 minutes
**Format:** Screen recording with voiceover + text overlays
**Key Message:** "Composable trust synthesis with AI consensus on GenLayer"

---

## Step 1: Open Homepage (10 seconds)

**Action:**
- Navigate to https://vouch.gudman.xyz
- Let page fully load
- Scroll to show: hero section + stats bar

**Voiceover:**
"Welcome to vouch.fun — a composable trust synthesis protocol. We evaluate every user across 6 dimensions of reputation: code quality, on-chain activity, social presence, DeFi history, governance, and identity."

**Text Overlay:**
"5 AI validators reach consensus on every evaluation"

**Visual Notes:**
- Stats bar shows total profiles and queries count
- Hero section displays the trust constellation graphic (6 colored nodes in a circle)

---

## Step 2: Search Samczsun (15 seconds)

**Action:**
- Click search bar on homepage
- Type "samczsun" into the search field
- Press Enter or click search button
- Wait for profile to load (~3-5 seconds)
- Observe the full profile card with 6-dimension radar chart

**Voiceover:**
"Here we search for samczsun, a legendary security researcher. Watch as GenLayer fetches live data from GitHub and Etherscan, then evaluates him against all six trust dimensions in real time."

**Text Overlay:**
"Live web data — GitHub API, Etherscan — not cached or hardcoded"

**Visual Notes:**
- Profile shows: samczsun header with score (e.g., 95)
- Trust tier badge: TRUSTED (green)
- 6 dimension cards visible:
  - Code: A (green)
  - On-Chain: A (green)
  - Social: B (blue)
  - DeFi: A (green)
  - Governance: B (blue)
  - Identity: A (green)
- Radar chart shows all 6 axes with samczsun's profile (blue/indigo fill)
- Summary text beneath describing strengths

---

## Step 3: Search Torvalds (15 seconds)

**Action:**
- Click search bar again (or go back to homepage)
- Type "torvalds" (Linus Torvalds)
- Press Enter
- Wait for profile to load
- Compare visually with samczsun

**Voiceover:**
"Now let's look at Linus Torvalds — legendary kernel developer. Notice: excellent code grade, but minimal on-chain history. GenLayer synthesizes this into a MODERATE trust tier. This is the power of composability — different users, different profiles."

**Text Overlay:**
"Composable dimensions — AI weighs each signal independently"

**Visual Notes:**
- Profile shows: torvalds with lower overall score (e.g., 55)
- Trust tier badge: MODERATE (yellow)
- 6 dimension cards:
  - Code: A (green) — high
  - On-Chain: F (red) — no activity
  - Social: C (yellow) — moderate
  - DeFi: F (red) — no activity
  - Governance: B (blue) — some activity
  - Identity: C (yellow)
- Radar chart shows stark contrast with samczsun (orange/amber fill)

---

## Step 4: Navigate to Gates Page (15 seconds)

**Action:**
- Click "Gates" link in header navigation
- Page loads showing "Active Trust Gates" section
- Scroll to see all 4 preset gates

**Voiceover:**
"Trust gates allow any dApp to access these profiles and gate access. We've deployed four composable gates: DevDAO requires code grade B+, DeFi Vault requires DeFi grade B+, Security Auditors requires code grade A, and Agent Marketplace requires code grade C+."

**Text Overlay:**
"4 composable trust gates. Build your own — any dimension, any threshold."

**Visual Notes:**
- Show each gate card:
  1. **DevDAO** — B+ code requirement — shows members (including samczsun)
  2. **DeFi Vault** — B+ DeFi requirement — fewer members
  3. **Security Auditors** — A code requirement — exclusive (samczsun shows here)
  4. **Agent Marketplace** — C+ code requirement — broader access

---

## Step 5: Check Gate Eligibility (15 seconds)

**Action:**
- Scroll down to "Check Gate Eligibility" form
- Type "samczsun" in the handle field
- Select "Security Auditors" from dropdown
- Click "Check" button
- Show result: ELIGIBLE (green)
- Then type "torvalds" and check against "DeFi Vault"
- Show result: BLOCKED (red, due to F on DeFi dimension)

**Voiceover:**
"The gate eligibility checker is live. Samczsun passes the Security Auditors gate because his code grade is A. But when we check Torvalds against DeFi Vault, it's blocked — he has no DeFi history. This rejection happens on-chain, instantly, verifiable."

**Text Overlay:**
"On-chain gating. No centralized approval. Dimension-based rules."

**Visual Notes:**
- ELIGIBLE result shows: green badge + "samczsun: grade A, required A"
- BLOCKED result shows: red badge + "torvalds: grade F, required B"

---

## Step 6: Trust Oracle Demo (15 seconds)

**Action:**
- Scroll to "Trust Oracle" section
- Type "gakonst" in the handle field
- Select "code" from dimension dropdown
- Select "≥ B" from grade dropdown
- Click "Query"
- Show JSON-style result with: pass (true/false), grade, confidence, overall_score, overall_tier, fresh status, age_days

**Voiceover:**
"The trust oracle is a one-line API integration. Any smart contract on GenLayer can call trust_query() with a handle, dimension, and minimum grade — it returns pass/fail with full confidence metrics and freshness status. All evaluated in real time by five validators reaching consensus."

**Text Overlay:**
"trust_query(handle, dimension, minGrade) → { pass: bool, grade, confidence }"

**Visual Notes:**
- Show oracle result in monospace format:
  - pass: true (or false in different color)
  - grade: B (or relevant grade)
  - confidence: 95+ (high)
  - overall_score: 70+
  - overall_tier: MODERATE or TRUSTED
  - fresh: true (green) or false (yellow)
  - age_days: 0-90

---

## Step 7: Batch Query (10 seconds)

**Action:**
- Scroll to "Batch Query" section
- Click "Run Batch" button
- Show results table for 5 sample profiles (vbuterin, gakonst, torvalds, samczsun, ridwannurudeen)
- Highlight passes vs failures

**Voiceover:**
"Batch queries let you evaluate multiple profiles at once. Here we're checking five developers against 'code grade B or better'. You see three passes and two failures — real time, on-chain."

**Text Overlay:**
"Batch oracle queries — scale trust evaluation across teams."

**Visual Notes:**
- Table with columns: PASS/FAIL | handle | grade
- Show color-coded results (green PASS, red FAIL)

---

## Step 8: Explore Page (15 seconds)

**Action:**
- Click "Explore" in header navigation
- Page shows grid of all profiles
- Stats: "X profiles | Y disputes"
- Scroll through the grid to show variety
- Show filter buttons: ALL, TRUSTED, MODERATE, LOW
- Click TRUSTED filter to narrow results

**Voiceover:**
"The Explore page shows all evaluated profiles. You can filter by trust tier, sort by score or name, and click any profile to see full details. Every profile here was evaluated by five GenLayer validators with live web data."

**Text Overlay:**
"This only works on GenLayer — no other chain has AI consensus with web data fetching in the VM"

**Visual Notes:**
- Grid shows diverse profiles with ProfileCard layout
- Each card: handle, score, trust badge, 6 dimension badges, summary excerpt
- Stats bar shows counts
- Filter interface visible

---

## Step 9: Profile Detail Page (15 seconds)

**Action:**
- Click on samczsun profile card (or any prominent profile)
- Full detail page loads
- Show: header with name + score + trust badge
- Show: radar chart (full 6-dimension visualization)
- Scroll to show: dimension breakdown cards with detailed explanations
- Show dispute/challenge section (if available)

**Voiceover:**
"Clicking any profile opens the full detail view. You see the radar chart overlaying all six dimensions, detailed scores for each, supporting data from GitHub and block explorers, and a live timestamp showing when the profile was last evaluated."

**Text Overlay:**
"6-dimension radar. Live data. AI-graded evidence."

**Visual Notes:**
- Radar chart center-left
- Dimension cards on right side showing:
  - Code: A — GitHub stars, PR quality, contribution history
  - On-Chain: A — transaction count, token holdings, smart contract interactions
  - Social: B — Twitter followers, engagement
  - DeFi: A — liquidity provided, swap history, TVL interactions
  - Governance: B — voting participation, proposal engagement
  - Identity: A — EAS attestations, verification badges
- Timestamp showing "Evaluated 2 hours ago"

---

## Step 10: How It Works & API (10 seconds)

**Action:**
- Click "How It Works" in header
- Quick scroll through explanation
- Then click "Integrate" page
- Show API documentation code snippet

**Voiceover:**
"Developers can integrate trust gates into their own contracts. We provide full API documentation, contract examples, and SDK support for JavaScript and Python. Every query runs through GenLayer's consensus engine — five validators evaluate the evidence, reaching agreement before returning results."

**Text Overlay:**
"Full API + SDK. Contract examples. Open source."

**Visual Notes:**
- Show code block with sample API call or contract integration
- Mention contract address displayed at top
- Show "GenLayer Bradbury Testnet" network indicator

---

## Final Shot: Call-to-Action (5 seconds)

**Action:**
- Return to homepage or landing section
- Quick zoom or transition to emphasize hero section

**Voiceover:**
"vouch.fun is live now on GenLayer Bradbury. Build composable trust gates, integrate trust oracles, and let AI consensus power your reputation infrastructure."

**Text Overlay:**
"vouch.fun — Composable Trust for the Agentic Economy"
"Live on GenLayer. Open source. No intermediaries."

**Visual Notes:**
- Trust constellation animation (6 nodes pulsing)
- vouch.fun logo
- "GenLayer" badge
- Links to GitHub, documentation

---

## Key Talking Points (for Natural Flow)

1. **Consensus**: Always mention "5 validators reach consensus" when showing results
2. **Live Data**: Emphasize "GitHub API, Etherscan" — not hardcoded
3. **Composability**: Highlight that dimensions can be mixed/matched in new gates
4. **GenLayer Unique**: Point out "only GenLayer can do this" — web data fetching + AI consensus
5. **On-Chain Verification**: Gates execute on-chain, decisions are immutable
6. **No Intermediaries**: The protocol is trustless, no central authority

---

## Technical Notes for Recording

- Ensure all queries complete before moving to next step (wait for loading spinners to finish)
- Use consistent GitHub handles across demo (samczsun, torvalds, gakonst are good contrasts)
- If a profile fails to load, use the batch query as backup
- Zoom to 125% browser if text is hard to read on recording
- Clear browser cache before recording to ensure fresh data fetches
- Narrate calmly, pause 1-2 seconds between major transitions
- Keep background music minimal/ambient to focus on voice and UI sounds

---

## Time Breakdown

| Step | Duration | Content |
|------|----------|---------|
| 1. Homepage | 10s | Hero, stats |
| 2. Samczsun search | 15s | Trust profile, radar chart |
| 3. Torvalds search | 15s | Contrasting profile, MODERATE tier |
| 4. Gates page | 15s | Show 4 preset gates |
| 5. Gate eligibility | 15s | Samczsun ELIGIBLE, Torvalds BLOCKED |
| 6. Oracle demo | 15s | trust_query() call, JSON result |
| 7. Batch query | 10s | Multi-profile evaluation |
| 8. Explore page | 15s | Profile grid, filters |
| 9. Detail page | 15s | Full radar, dimension breakdown |
| 10. API docs | 10s | Integration examples |
| Final CTA | 5s | Close with vision |
| **Total** | **120s** | **2 minutes** |

---

## Recording Checklist

- [ ] All pages load within 5 seconds
- [ ] Samczsun profile shows A grades across most dimensions
- [ ] Torvalds profile shows strong code (A) but F on DeFi/On-Chain
- [ ] Gates page displays all 4 gates with member counts
- [ ] Gate eligibility checker returns ELIGIBLE and BLOCKED correctly
- [ ] Oracle query returns JSON with all fields populated
- [ ] Batch query runs and shows pass/fail results
- [ ] Explore page shows 5+ distinct profiles in grid
- [ ] Profile detail page radar chart renders cleanly
- [ ] Network indicator shows "GenLayer Bradbury"
- [ ] No error messages or broken images visible
- [ ] Audio is clear and narration pacing matches visuals
- [ ] Total runtime is under 120 seconds
