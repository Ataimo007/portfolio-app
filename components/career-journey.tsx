"use client";
import { useState } from "react";

const roles = [
  {
    title: "Software development",
    period: "2016 – 2019",
    description:
      "Built web, desktop and mobile applications at Logic Gate Ventures and Klex Global Resources. This is where hands-on engineering became the foundation of my work.",
  },
  {
    title: "Azure support engineering",
    period: "2019 – 2022",
    description:
      "At Tek Experts, supporting Microsoft Azure, I progressed from Stage 2 to Stage 3 support: investigating production incidents, resolving escalations and mentoring engineers.",
  },
  {
    title: "Customer solutions architecture",
    period: "2021 – 2025",
    description:
      "At Tyk, I led technical discovery, architecture reviews and workshops, translating enterprise requirements into practical API platform designs and implementation plans.",
  },
  {
    title: "Customer success engineering",
    period: "2025 – Present",
    description:
      "Today I own post-sales technical engagements across EMEA at Tyk, connecting architecture guidance with migrations, operational readiness and production troubleshooting.",
  },
];
export default function CareerJourney() {
  const [selected, setSelected] = useState(roles.length - 1);
  return (
    <section className="career-journey" aria-labelledby="career-heading">
      <div className="career-introduction">
        <h2 id="career-heading">A career connecting disciplines.</h2>
        <p>
          Different roles. One thread: understanding systems and helping people
          make them work.
        </p>
      </div>
      <div className="career-layout">
        <div className="career-choices" aria-label="Career roles">
          {roles.map((role, index) => (
            <button
              key={role.title}
              id={`career-role-${index}`}
              aria-pressed={selected === index}
              aria-controls="career-detail"
              onClick={() => setSelected(index)}
            >
              <span>{role.period}</span>
              <strong>{role.title}</strong>
            </button>
          ))}
        </div>
        <div
          id="career-detail"
          className="career-detail"
          aria-live="polite"
          aria-atomic="true"
        >
          <div key={selected} className="career-detail-content">
            <p className="career-period">{roles[selected].period}</p>
            <h3>{roles[selected].title}</h3>
            <p>{roles[selected].description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
