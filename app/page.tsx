"use client";

import { useMemo, useState } from "react";
import reportData from "./class-data.json";

type ClassRow = {
  source: string;
  program: string;
  className: string;
  day: string;
  time: string;
  registrations: number;
  firstDate: string;
};

const classes = reportData.classes as ClassRow[];
const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function shortTime(time: string) {
  return time.replace(/^0/, "").replace(":00", "");
}

export default function Home() {
  const [source, setSource] = useState("All reports");
  const [day, setDay] = useState("All days");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("schedule");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = classes.filter(
      (item) =>
        (source === "All reports" || item.source === source) &&
        (day === "All days" || item.day === day) &&
        (!normalizedQuery ||
          item.className.toLowerCase().includes(normalizedQuery) ||
          item.program.toLowerCase().includes(normalizedQuery)),
    );

    return [...rows].sort((a, b) => {
      if (sort === "largest") return b.registrations - a.registrations;
      if (sort === "smallest") return a.registrations - b.registrations;
      return (
        dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) ||
        a.time.localeCompare(b.time)
      );
    });
  }, [source, day, query, sort]);

  const totalRegistrations = filtered.reduce((sum, item) => sum + item.registrations, 0);
  const average = filtered.length ? totalRegistrations / filtered.length : 0;
  const largest = filtered.reduce<ClassRow | null>(
    (best, item) => (!best || item.registrations > best.registrations ? item : best),
    null,
  );
  const maxRegistrations = Math.max(...filtered.map((item) => item.registrations), 1);
  const byDay = dayOrder
    .map((label) => ({
      label,
      value: filtered
        .filter((item) => item.day === label)
        .reduce((sum, item) => sum + item.registrations, 0),
    }))
    .filter((item) => item.value > 0);
  const maxDay = Math.max(...byDay.map((item) => item.value), 1);

  function resetFilters() {
    setSource("All reports");
    setDay("All days");
    setQuery("");
    setSort("schedule");
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Class view home">
          <span className="brand-mark">C</span>
          <span>Classview</span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot" />
          3 reports connected
          <span className="divider" />
          Updated today
        </div>
      </header>

      <div className="dashboard" id="top">
        <section className="intro">
          <div>
            <p className="eyebrow">CENTER CLASS REPORTS</p>
            <h1>Every class, in one clear view.</h1>
            <p className="intro-copy">
              A combined snapshot of your ages 2–4, ages 7–8, and Sunday class reports.
            </p>
          </div>
          <button className="outline-button" onClick={resetFilters}>
            Reset view
          </button>
        </section>

        <section className="filters" aria-label="Dashboard filters">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search classes or programs"
              aria-label="Search classes or programs"
            />
          </label>
          <label>
            <span className="sr-only">Report</span>
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option>All reports</option>
              {reportData.sources.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Day</span>
            <select value={day} onChange={(event) => setDay(event.target.value)}>
              <option>All days</option>
              {dayOrder.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="metrics" aria-label="Summary metrics">
          <article className="metric-card primary">
            <p>Active registrations</p>
            <strong>{totalRegistrations}</strong>
            <span>across the current view</span>
          </article>
          <article className="metric-card">
            <p>Class sections</p>
            <strong>{filtered.length}</strong>
            <span>{source === "All reports" ? "from all 3 reports" : `in ${source}`}</span>
          </article>
          <article className="metric-card">
            <p>Average class size</p>
            <strong>{average.toFixed(1)}</strong>
            <span>registrations per section</span>
          </article>
          <article className="metric-card">
            <p>Largest section</p>
            <strong>{largest?.registrations ?? 0}</strong>
            <span>{largest?.className ?? "No matching classes"}</span>
          </article>
        </section>

        <section className="analytics-grid">
          <article className="panel class-load">
            <div className="panel-heading">
              <div>
                <p className="section-label">CLASS LOAD</p>
                <h2>Registration by section</h2>
              </div>
              <span className="quiet-label">Top sections</span>
            </div>
            <div className="bar-list">
              {[...filtered]
                .sort((a, b) => b.registrations - a.registrations)
                .slice(0, 6)
                .map((item) => (
                  <div className="bar-row" key={`${item.source}-${item.className}`}>
                    <div className="bar-label">
                      <span>{item.className}</span>
                      <strong>{item.registrations}</strong>
                    </div>
                    <div className="bar-track">
                      <span
                        className="bar-fill"
                        style={{ width: `${(item.registrations / maxRegistrations) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              {!filtered.length && <p className="empty-copy">No classes match these filters.</p>}
            </div>
          </article>

          <article className="panel day-mix">
            <div className="panel-heading">
              <div>
                <p className="section-label">WEEKLY MIX</p>
                <h2>Where registrations land</h2>
              </div>
            </div>
            <div className="day-chart">
              {byDay.map((item) => (
                <div className="day-column" key={item.label}>
                  <strong>{item.value}</strong>
                  <div className="day-bar-shell">
                    <span style={{ height: `${(item.value / maxDay) * 100}%` }} />
                  </div>
                  <small>{item.label.slice(0, 3)}</small>
                </div>
              ))}
              {!byDay.length && <p className="empty-copy">No schedule data to show.</p>}
            </div>
          </article>
        </section>

        <section className="panel table-panel">
          <div className="panel-heading table-heading">
            <div>
              <p className="section-label">FULL SCHEDULE</p>
              <h2>Class breakdown</h2>
            </div>
            <label className="sort-control">
              <span>Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="schedule">Schedule</option>
                <option value="largest">Largest first</option>
                <option value="smallest">Smallest first</option>
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Report</th>
                  <th>Day &amp; time</th>
                  <th>Program</th>
                  <th className="numeric">Registrations</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={`${item.source}-${item.className}`}>
                    <td>
                      <span className="class-name">{item.className}</span>
                    </td>
                    <td>
                      <span className={`source-pill source-${item.source.charAt(0).toLowerCase()}`}>
                        {item.source}
                      </span>
                    </td>
                    <td>
                      {item.day} <span className="muted">· {shortTime(item.time)}</span>
                    </td>
                    <td>{item.program}</td>
                    <td className="numeric">
                      <strong>{item.registrations}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="empty-state">
                <strong>No matching classes</strong>
                <span>Try changing a filter or clearing your search.</span>
              </div>
            )}
          </div>
        </section>

        <footer>
          <span>Classview · Combined center reports</span>
          <span>Student contact details are not shown</span>
        </footer>
      </div>
    </main>
  );
}
