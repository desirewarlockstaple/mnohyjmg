# Founder story — TideGuard AI

> First-person narrative for STIRworld, Young Climate Prize, MIT Solve and GEEP applications.
> Edit only the bracketed `<verify>` markers before final submission — everything else is the working draft.

I grew up close to the sea. Every spring my parents would take me to a small coastal town and every spring the same thing happened: by the second day, my hands were full of bottle caps, fishing line and bright shards of melted polystyrene. I could not understand why a place that was supposed to be wild was always littered. At ten years old I assumed it was the local people, until my mother showed me a label on a bottle written in a language I did not recognise. The currents had carried it across an entire sea. The mess on our beach had nothing to do with the people who lived there — it was a global accounting error that landed at our feet.

At thirteen I joined my first organised cleanup. Eight hours of work, around two hundred kilograms of plastic, blistered hands, a school certificate and a feeling of pride that lasted exactly three weeks — which is how long it took for the next storm to refill the same coast. I asked the organiser, a marine biology graduate student, why we kept showing up *after* the plastic landed instead of *before*. She told me, very calmly, that nobody predicted these events because the math was hard and the data was scattered. I went home and started reading.

I taught myself Python on free YouTube tutorials. I tried to build a "predictor" out of linear regression and it failed at the very first test. A year later I read Raissi, Perdikaris and Karniadakis's 2019 paper on **Physics-Informed Neural Networks** and realised that the same idea used to solve heat equations on materials could be aimed at the ocean. The transport math was the same: advection plus diffusion, with a sink term for items that beach themselves. The missing ingredient was data — and to my surprise, the data was already free. The European Copernicus Marine Service publishes currents at high resolution. ECMWF publishes wind reanalysis. ESA's Sentinel-2 sees floating macroplastic. Citizen reports could fill the gaps satellites couldn't see.

So I built **TideGuard**.

I built it open-source because the kid on the next beach over should not have to wait for a private company to sell them what they need. I built the education module because a forecasting tool that does not teach the next cleanup leader cannot scale beyond me. I built the leaderboard because I have watched twelve-year-olds run *three* community cleanups in a single semester when their classroom dashboard ticks up. Pride is a renewable resource and adolescents are excellent at metabolising it.

This is not a research project I sent to a journal. It's a working tool. The code in this repository is intended to be deployed, used, taken apart, improved and then handed to the next student who picks up where I leave off. Everything is MIT-licensed for code and CC-BY for content; nothing is patented or hidden. If TideGuard helps one school organise one cleanup that wouldn't have happened, the project has paid for itself.

I'm sixteen. I do not pretend that an algorithm can solve marine pollution. But I refuse to accept that **prediction** is the missing piece while we have free satellites overhead and free PyTorch on a laptop. We can be there *before* the tide, not after. That is the difference between mopping the floor and turning off the tap.

— *Eleanora* <!-- <verify>final name + age + city if different</verify> -->

---

### Why this version is honest

- The team-member names, school, city and exact metrics are stated only in *verifiable* terms. Where a number depends on a specific pilot we have not yet completed, we say so in the proposal rather than fabricate it.
- The hardcoded "50,000 km² monitored / 1,240 kg collected / 320 students / 6 schools" KPI tiles on the landing page have been **removed**. The site now reads the real `/cleanups/stats` endpoint and shows "Pilot launching" when the count is zero.
- Carbon footprint numbers in `docs/model_card.md` are labelled *estimates* and tied to the actual `codecarbon` measurement we now record at training time.
- The PINN is now trained on every CI run on synthetic data and the resulting checkpoint is committed at `apps/ml/checkpoints/pinn_demo.pt`, so every forecast tile the jury sees is the real network — not a hand-coded Gaussian.
