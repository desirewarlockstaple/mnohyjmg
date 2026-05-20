# SDG mapping

Explicit alignment of TideGuard AI activities with the UN Sustainable
Development Goals. Required by Zayed Sustainability Prize, MIT Solve and
helpful for GEEP / RELX.

| SDG | Target | TideGuard contribution |
|-----|--------|------------------------|
| **4 – Quality Education** | 4.7 (education for sustainable development) | 10 EE lessons in `content/lessons/` with SDG metadata; teacher guide rendered to PDF; alignment with Taiwan 108 / Cambridge IGCSE Environmental Management / AP Environmental Science / IB ESS curricula (see `docs/curriculum_mapping.md`). |
| **6 – Clean Water and Sanitation** | 6.6 (water-related ecosystems) | Direct reduction of marine debris pressure on coastal water-related ecosystems; open dataset of citizen reports useful to water agencies. |
| **13 – Climate Action** | 13.3 (climate education and awareness) | Lessons explicitly tie ocean plastic to climate-driven sea-level rise and storm frequency; carbon footprint of model training tracked and published. |
| **14 – Life Below Water** | 14.1 (reduce marine pollution) | Core mission. Prediction + cleanup loop directly removes plastic before it fragments into microplastic. |
| **14 – Life Below Water** | 14.a (increase scientific knowledge) | PINN with learnable α, K, λ produces *interpretable* physical parameters; open-source code reproducible in CI; baseline benchmark vs persistence + Lagrangian transparently published. |
| **17 – Partnerships** | 17.16 (multi-stakeholder partnerships) | Partnerships with online schools, GEEP regional centres, optional NGO collaborations. Open-source license invites unbounded reuse. |

## Per-lesson SDG mapping

Each lesson in `content/lessons/` has explicit `sdg: [...]` metadata in its
front matter. The list below mirrors that metadata for jurors who don't want
to grep:

| Lesson | SDGs | Practical task |
|--------|------|----------------|
| 01 marine-plastic | 14.1 | Find one plastic item in your home with no recycling code. |
| 02 lifecycle | 14.1, 12.5 | Trace one item from store shelf to ocean. |
| 03 microplastic | 14.1, 6.3 | Filter 200 mL tap water and inspect with a phone microscope. |
| 04 read-the-map | 4.7, 14.1 | Open `/map`, find a hotspot near you, screenshot. |
| 05 good-report | 4.7, 14.1 | Submit one report via the mobile app. |
| 06 safety | 3.6, 13.1 | Pack a cleanup safety kit. |
| 07 organize-cleanup | 17.16, 14.1 | Plan an event with one classmate. |
| 08 sort-waste | 12.5, 14.1 | Sort one cleanup haul into 5 streams. |
| 09 reduce-reuse | 12.1, 12.5 | Eliminate one single-use item from your week. |
| 10 lead-school | 4.7, 17.16 | Recruit two classmates to repeat the program. |

## Regional relevance — Zayed Sustainability Prize

TideGuard is **regionally portable** by design. For the Persian Gulf —
explicitly named as a priority region by the Zayed Prize — the same
architecture re-trained on local CMEMS currents (`cmems_mod_glo_phy-cur_anfc`
covers all global oceans) generalises. Anchor partners we are pursuing for
the Gulf:

- Emirates Environmental Group (EEG) — established schools network.
- Khalifa University Marine Pollution Lab — co-supervision of model
  validation.
- Local schools in Abu Dhabi / Sharjah for the Global High Schools category.

## Submission packaging

- For Zayed Global High Schools, the submission requires a head-of-school
  attestation: template in `docs/letters_of_support_template.md`.
- For Stockholm Junior Water Prize, the research-paper conversion of the
  model card lives at `docs/research_paper.md` (IMRaD format).
- For Young Climate Prize / STIRworld, the design narrative leans on
  `docs/founder_story.md` and the 12-slide deck at `docs/deck/`.
