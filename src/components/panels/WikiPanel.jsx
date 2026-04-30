"use client";

export default function WikiPanel({
  wikiSummary,
  wikiLoading = false,
  airportName = "Airport",
}) {
  return (
    <section className="glass-panel wiki-panel">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">Airport wiki</div>
          <h2>{wikiSummary?.title || airportName}</h2>
        </div>
        {wikiSummary?.url ? (
          <a
            className="panel-link"
            href={wikiSummary.url}
            target="_blank"
            rel="noreferrer"
          >
            Wikipedia
          </a>
        ) : null}
      </div>

      <p className="wiki-copy">
        {wikiSummary?.extract
          ? wikiSummary.extract
          : wikiLoading
            ? "Loading airport introduction..."
            : "No Wikipedia summary was found for this airport. The rest of the dashboard remains live."}
      </p>

      <div className="wiki-source">Source: Wikipedia summary API</div>
    </section>
  );
}
