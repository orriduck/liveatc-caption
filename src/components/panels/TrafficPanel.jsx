"use client";

import NumberFlow from "@number-flow/react";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";

export default function TrafficPanel({
  aircraft = [],
  trafficCounts = { ascending: 0, descending: 0, level: 0 },
}) {
  return (
    <section className="glass-panel traffic-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">Airport traffic</div>
          <h2>Nearby aircraft</h2>
        </div>
      </div>

      <div className="traffic-counts">
        <Metric label="Total" value={aircraft.length} color="var(--atc-text)" />
        <Metric
          label="Ascending"
          value={trafficCounts.ascending}
          color={AIRCRAFT_COLORS.ascending}
        />
        <Metric
          label="Descending"
          value={trafficCounts.descending}
          color={AIRCRAFT_COLORS.descending}
        />
        <Metric
          label="Level"
          value={trafficCounts.level}
          color="var(--traffic-level-color)"
        />
      </div>
    </section>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <span>{label}</span>
      <strong style={{ color }}>
        <NumberFlow value={value} />
      </strong>
    </div>
  );
}
