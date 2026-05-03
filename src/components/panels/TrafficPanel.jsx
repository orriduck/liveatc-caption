"use client";

import NumberFlow from "@number-flow/react";
import { AIRCRAFT_COLORS } from "../../constants/aircraft.js";

export default function TrafficPanel({
  aircraft = [],
  trafficCounts = { departure: 0, arrival: 0, unknown: 0 },
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
          label="Departures"
          value={trafficCounts.departure}
          color={AIRCRAFT_COLORS.departure}
        />
        <Metric
          label="Arrivals"
          value={trafficCounts.arrival}
          color={AIRCRAFT_COLORS.arrival}
        />
        <Metric
          label="Unknown"
          value={trafficCounts.unknown}
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
