import { useState } from "react";

export default function Summary() {
  const [lang, setLang] = useState<"en" | "ru">("en");
  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-accent-400 font-semibold">One-pager / executive summary</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">PulseGrid — investor & partner brief</h1>
        </div>
        <div className="flex items-center gap-1 p-0.5 bg-ink-900 border border-white/10 rounded-md">
          {(["en", "ru"] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs rounded uppercase ${lang === l ? "bg-accent-500 text-white" : "text-ink-300 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {lang === "en" ? <EN /> : <RU />}
    </div>
  );
}

function EN() {
  return (
    <article className="card p-8 space-y-6 leading-relaxed text-ink-200">
      <header className="border-b border-white/5 pb-5">
        <h2 className="text-2xl font-bold text-white">PulseGrid — Vietnam's roads, decoded.</h2>
        <p className="text-ink-300 mt-2">
          A B2B SaaS platform that turns the anonymized, aggregated VETC payment-ecosystem data into a live digital twin
          of Vietnamese road traffic. Two privacy-preserving data tiers feed a spatiotemporal GNN with conformal
          prediction; outputs are sold via REST API to logistics, ride-hailing, e-commerce, insurance, FMCG and tourism.
        </p>
      </header>

      <Section title="What it is">
        <ul className="space-y-1.5 list-disc list-inside text-ink-200">
          <li>~2M daily VETC toll-gate passages — Tier A ground truth across 67 provinces.</li>
          <li>Opt-in on-device federated GPS aggregates from the 30M+ VETC app — Tier B urban and motorcycle depth.</li>
          <li>Spatiotemporal Graph Neural Network + conformal prediction for calibrated probabilistic ETAs.</li>
          <li>Target accuracy: ETA MAPE 5–8% (vs ~18% Google Maps in Vietnam).</li>
          <li>Productized as a REST API + SDK — never as raw data, never as government tooling.</li>
        </ul>
      </Section>

      <Section title="Who buys it">
        <p className="text-ink-200">
          Logistics (J&T, Ahamove, GHN), ride-hailing (Grab, Be, Xanh SM), e-commerce last-mile (Shopee Express, Lazada,
          Tiki), insurers (Bao Viet, PVI, Bao Minh) for road-segment UBI risk pricing, FMCG distribution (Vinamilk,
          Masan, Unilever, Circle K), and tourism (Vinpearl, Agoda, Klook). Vietnam SAM ≈ $420M by 2028.
        </p>
      </Section>

      <Section title="Why TASCO × VETC × PulseGrid is unique">
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Exclusive access to the largest commercial transport dataset in Southeast Asia.</li>
          <li>VETC payment rails for frictionless B2C and B2B monetization.</li>
          <li>30M+ VETC app users as a free B2C "Traffic Forecast" widget distribution channel.</li>
          <li>The same widget feeds the Tier B federated layer — a compounding data flywheel.</li>
          <li>MVP achievable in Build Week on existing VETC endpoints with 90 days of historical data.</li>
        </ul>
      </Section>

      <Section title="Why it's legal by construction">
        <p>
          PulseGrid is constructively limited to aggregated and anonymized data: k-anonymity ≥ 50, differential privacy
          ε ≤ 1.0, on-device federated aggregation (raw GPS tracks never leave the device), zero storage of license
          plates, photos, names or per-vehicle tracks. It is ordinary commercial B2B SaaS analytics — it does not manage
          traffic, does not connect to traffic lights, emergency services or any critical infrastructure, does not
          require government licenses, and does not interact with police or municipal systems. VETC data is processed
          under the existing commercial-platform user agreement and Vietnam's Personal Data Protection Law
          (Law 13/2023/QH15, PDPL).
        </p>
      </Section>

      <Section title="The ask (Build Week)">
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Build Week pilot slot for PulseGrid.</li>
          <li>VETC sandboxed data access (90 days historical + live feed).</li>
          <li>Three TASCO-led intros to anchor B2B customers (1 logistics, 1 ride-hail or food, 1 insurer).</li>
          <li>Cash prize to fund the 6-week MVP team.</li>
        </ul>
      </Section>

      <Section title="Track relevance">
        <p>
          Primary: Track #4 — Digital Twin of Urban Traffic.<br />
          Adjacency: Track #5 — Navigation & Routing (safety, ecology, efficiency).
        </p>
      </Section>

      <Section title="Contact">
        <p>
          <span className="kbd">pilots@pulsegrid.vn</span> · <span className="kbd">+84 28 xxxx xxxx</span> · Hanoi · Singapore
        </p>
      </Section>
    </article>
  );
}

function RU() {
  return (
    <article className="card p-8 space-y-6 leading-relaxed text-ink-200">
      <header className="border-b border-white/5 pb-5">
        <h2 className="text-2xl font-bold text-white">PulseGrid — дороги Вьетнама, расшифрованные.</h2>
        <p className="text-ink-300 mt-2">
          B2B SaaS-платформа, превращающая обезличенные агрегированные данные платёжной экосистемы VETC в живой
          цифровой двойник дорожного трафика Вьетнама. Два конструктивно приватных слоя данных питают
          spatiotemporal GNN с conformal prediction; выход продаётся через REST API в логистику, райд-хейлинг,
          e-commerce, страхование, FMCG и туризм.
        </p>
      </header>

      <Section title="Что это">
        <ul className="space-y-1.5 list-disc list-inside">
          <li>~2 млн ежедневных проездов через шлагбаумы VETC — Tier A ground truth по 67 провинциям.</li>
          <li>Опциональные on-device federated GPS-агрегаты из 30+ млн VETC-приложения — Tier B (город и мотоциклы).</li>
          <li>Spatiotemporal Graph Neural Network + conformal prediction для калиброванных вероятностных ETA.</li>
          <li>Целевая точность: ETA MAPE 5–8% против ~18% у Google Maps во Вьетнаме.</li>
          <li>Продукт — REST API + SDK. Не сырые данные, не государственные инструменты.</li>
        </ul>
      </Section>

      <Section title="Кому продаём">
        <p>
          Логистика (J&T, Ahamove, GHN), райд-хейлинг (Grab, Be, Xanh SM), e-commerce-доставка (Shopee Express,
          Lazada, Tiki), страховщики (Bao Viet, PVI, Bao Minh) — UBI-скоринг по сегментам дорог, FMCG-дистрибуция
          (Vinamilk, Masan, Unilever, Circle K), туризм (Vinpearl, Agoda, Klook). SAM Вьетнама ≈ $420 млн к 2028.
        </p>
      </Section>

      <Section title="Почему TASCO × VETC × PulseGrid — уникальная синергия">
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Эксклюзивный доступ к крупнейшему коммерческому транспортному датасету Юго-Восточной Азии.</li>
          <li>Готовая платёжная инфраструктура VETC для биллинга B2C/B2B.</li>
          <li>30+ млн пользователей VETC-приложения — канал дистрибуции бесплатного consumer-виджета.</li>
          <li>Этот же виджет питает Tier B federated-слой — самоусиливающаяся data-маховик.</li>
          <li>MVP реализуем за Build Week: pipeline на готовых VETC-эндпоинтах + 90 дней истории.</li>
        </ul>
      </Section>

      <Section title="Почему это легально">
        <p>
          PulseGrid конструктивно ограничен только агрегированными и анонимизированными данными: k-анонимность ≥ 50,
          differential privacy ε ≤ 1.0, on-device federated aggregation (сырые GPS-треки физически не покидают
          устройство), нулевое хранение госномеров, фото, имён и треков конкретных ТС. Решение — обычная коммерческая
          B2B SaaS-аналитика: не управляет дорожным движением, не подключается к светофорам, экстренным службам или
          иной критической инфраструктуре, не требует государственных лицензий и не предполагает взаимодействия с
          госорганами, полицией или муниципальными системами. Данные VETC обрабатываются в рамках уже действующего
          пользовательского соглашения коммерческой платформы и Закона Вьетнама № 13/2023/QH15 «О защите персональных
          данных» (PDPL).
        </p>
      </Section>

      <Section title="Что просим (Build Week)">
        <ul className="space-y-1.5 list-disc list-inside">
          <li>Слот в Build Week для PulseGrid.</li>
          <li>Sandboxed-доступ к данным VETC (90 дней истории + live).</li>
          <li>Три знакомства через TASCO с якорными B2B-клиентами (1 логистика, 1 райд-хейлинг или food, 1 страховщик).</li>
          <li>Денежный приз для финансирования команды 6-недельного MVP.</li>
        </ul>
      </Section>

      <Section title="Релевантное направление">
        <p>
          Основное: №4 — Цифровой двойник городского трафика.<br />
          Прикладной выход: №5 — Навигация и маршрутизация (безопасность, экология, эффективность).
        </p>
      </Section>

      <Section title="Контакт">
        <p>
          <span className="kbd">pilots@pulsegrid.vn</span> · <span className="kbd">+84 28 xxxx xxxx</span> · Ханой · Сингапур
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm uppercase tracking-wider text-accent-400 font-bold mb-2">{title}</h3>
      <div className="text-[15px]">{children}</div>
    </section>
  );
}
