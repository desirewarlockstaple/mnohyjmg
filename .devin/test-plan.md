# Test plan — Brain Dash polish + custom konspekt upload (PR #3)

## What changed (user-visible)

The user's last feedback asked for four concrete things. The test must prove all four:

1. Препятствия выглядят как машины (а не безликие кубы).
2. На раунд ровно **3 вопроса**, после третьего автоматически — экран результатов.
3. За правильный ответ начисляется **+10** очков.
4. Пользователь может **загрузить свой конспект** (например, «Что такое филология?») и пробежать с ним Brain Dash.

## Where to test

Preview URL: <https://dist-apwcsmdt.devinapps.com>

No CI is configured (0 checks). No review comments on PR #3.

## Primary end-to-end flow

Single uninterrupted recording. All assertions are concrete and a broken implementation will visibly fail them.

### Step 1 — Open home screen
- Navigate to the preview URL.
- **Assert**: Home page shows the header «Мои конспекты» with a button «+ Загрузить конспект» (proof: `src/app/HomeScreen.tsx`). If the button is missing, the custom-upload feature is broken.

### Step 2 — Upload custom konspekt «Филология»
- Click **«+ Загрузить конспект»**.
- A modal opens with fields: title, subject, textarea.
- Fill title: `Филология` and subject: `Гуманитарные науки`.
- Paste this content into the textarea (uses the format documented in `src/data/questionParser.ts`):

  ```
  Q: Что такое филология?
  A) Наука о языке и текстах *
  B) Раздел физики
  C) Учение о растениях

  Q: Что изучает лингвистика?
  A) Язык *
  B) Минералы
  C) Планеты

  Q: Кто написал «Войну и мир»?
  A) Л. Н. Толстой *
  B) А. С. Пушкин
  C) М. Ю. Лермонтов
  ```

- Click **«Сохранить»**.
- **Assert (parser worked)**: A new card titled «Филология» appears under «Мои конспекты». If the parser failed, a warning will be displayed instead and no card appears.
- **Assert (persistence)**: localStorage key `mnoh-custom-konspekts` should contain an array with 1 entry whose `questions.length === 3`. Verify via the page (refreshing the page must keep the card visible).

### Step 3 — Launch Brain Dash with the new konspekt
- Click on the «Филология» card → choose **Brain Dash**.
- Wait for INTRO → COUNTDOWN → RUNNING.
- **Assert (cars)**: The first few obstacles that pass under the player must look like cars — visible body, cabin/roof, 4 wheels, headlights. Generic single-color cubes/bars indicate a regression. Capture a screenshot mid-run.
- **Assert (humanoid)**: The player avatar has a head, torso, two arms, two legs (not a single capsule). Visible from default chase camera.

### Step 4 — First question gate: «Что такое филология?»
- A banner above the road must render the literal text **«Что такое филология?»** with three lane plates labeled **A / B / C**.
- Steer the player onto the lane whose plate reads **«Наука о языке и текстах»**.
- **Assert (HUD before)**: Note current score. Expected starting score = 0.
- **Assert (correct answer)**: After crossing the gate, the score increases by exactly **+10** (or +10 × multiplier — at multiplier 1× it must be exactly 10). The chosen lane plate flashes green, the wrong plates flash red.
- **Assert (no health lost)**: Lives indicator stays at 3.

### Step 5 — Second question gate: wrong answer
- For the next question, deliberately drive into a wrong lane.
- **Assert**: Score does not increase by 10. Lives decrease by 1 (HUD shows 2). Plate flashes red.

### Step 6 — Third question gate ends the round
- For the third gate, answer either way.
- **Assert (round auto-finishes)**: Immediately after crossing the **third** gate, the runner stops and the Results screen appears. No fourth gate is reached. This is the strongest signal that `questionsPerRound: 3` is wired through (config: `src/game/brain-dash/config.ts`).
- **Assert (Results screen totals)**:
  - Correct answers = 1, incorrect = 1 (or whatever the third answer was — total = 3).
  - Final score includes +10 for the one correct answer in Step 4.

### Step 7 — Persistence sanity check
- Return to Home. Reload page (F5).
- **Assert**: «Филология» card still visible under «Мои конспекты» (proves localStorage save survived reload).

## What I will NOT test (out of scope for this feedback iteration)

- Lore Quest changes — user feedback was specifically about Brain Dash visuals + custom konspekts. Will mention Lore Quest only as untested.
- Touch swipe controls, mobile layout, reduced-motion mode.
- Stress test with >20 questions or malformed JSON in the textarea.

## Pass / fail summary

The PR passes if **every** assertion in steps 2–6 passes. If even one of the four user-requested points (cars / 3 questions / +10 / custom upload) cannot be visually confirmed, the test is marked FAILED for that point.
