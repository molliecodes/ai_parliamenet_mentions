// Fallback (DEFAULT_PARTY_COLOR) covers any party not listed — new/minor
// parties can appear in future daily fetches without breaking. The 7-color
// core palette (Labour, Conservative, Liberal Democrat, SNP, Green, Reform UK,
// Crossbench) is from the design doc; the rest extend it in the same muted
// family, with Labour (Co-op) reusing Labour's color since it's Labour-affiliated.
const PARTY_COLORS = {
  "Labour": "#C8393E",
  "Labour (Co-op)": "#C8393E",
  "Conservative": "#1E76B4",
  "Liberal Democrat": "#E8A33D",
  "Scottish National Party": "#B99A2E",
  "Green Party": "#4C8C2B",
  "Reform UK": "#1FA0AC",
  "Crossbench": "#8A8578",
  "Independent": "#8A8578",
  "Non-affiliated": "#8A8578",
  "Bishops": "#6B5F52",
  "Lord Speaker": "#8A8578",
  "Democratic Unionist Party": "#8C4A3F",
  "Plaid Cymru": "#2F6B4F",
  "Ulster Unionist Party": "#5F7A9C",
  "Traditional Unionist Voice": "#7A6A50",
  "Your Party": "#8A8578",
};
const DEFAULT_PARTY_COLOR = "#8A8578";

function partyColor(party) {
  return PARTY_COLORS[party] || DEFAULT_PARTY_COLOR;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d, 10)} ${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
}

const PAGE_SIZE = 25;

let allMentions = [];
let state = { globalYear: "All", globalHouse: "All", party: "", search: "", expandedId: null, visibleCount: PAGE_SIZE };

function availableYears() {
  return [...new Set(allMentions.map((m) => m.date.slice(0, 4)))].sort();
}

// Filters by the two GLOBAL dimensions only (year, house) — this is the
// shared input to stats, both ranking charts, the trend chart, and the
// recent-debates chart. Party/search are list-only refinements applied on
// top of this in filteredMentions().
function globallyFiltered() {
  return allMentions.filter((m) => {
    if (state.globalYear !== "All" && m.date.slice(0, 4) !== state.globalYear) return false;
    if (state.globalHouse !== "All" && m.house !== state.globalHouse) return false;
    return true;
  });
}

function computeStatsAndCharts(mentions) {
  document.getElementById("stat-total").textContent = mentions.length;

  // Distinct debates = unique hansard_url, not unique title — generic
  // titles like "Topical Questions" recur across dozens of different
  // sitting dates as the identical string, so counting by title alone
  // undercounts real distinct debates.
  document.getElementById("stat-debates").textContent =
    new Set(mentions.map((m) => m.hansard_url)).size;

  const commonsCount = mentions.filter((m) => m.house === "Commons").length;
  document.getElementById("stat-commons-pct").textContent =
    mentions.length ? `${Math.round((commonsCount / mentions.length) * 100)}%` : "–";

  renderBarChart("chart-speakers", topSpeakers(mentions, 8));
  renderBarChart("chart-parties", byParty(mentions));
  renderRecentDebates(mentions, 10);
}

function topSpeakers(mentions, limit) {
  const counts = new Map();
  for (const m of mentions) {
    const entry = counts.get(m.speaker) || { name: m.speaker, party: m.party, count: 0 };
    entry.count += 1;
    counts.set(m.speaker, entry);
  }
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = ranked.length ? ranked[0].count : 1;
  return ranked.map((s) => ({ name: s.name, count: s.count, color: partyColor(s.party), pct: (s.count / max) * 100 }));
}

function byParty(mentions) {
  const counts = new Map();
  for (const m of mentions) {
    const party = m.party || "No party listed";
    counts.set(party, (counts.get(party) || 0) + 1);
  }
  const ranked = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const max = ranked.length ? ranked[0].count : 1;
  return ranked.map((p) => ({ name: p.name, count: p.count, color: partyColor(p.name), pct: (p.count / max) * 100 }));
}

function renderBarChart(containerId, rows) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "chart-row";

    const dot = document.createElement("span");
    dot.className = "chart-dot";
    dot.style.backgroundColor = row.color;

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = row.name;
    label.title = row.name;

    const track = document.createElement("span");
    track.className = "chart-track";
    const bar = document.createElement("span");
    bar.className = "chart-bar-fill";
    bar.style.width = `${row.pct}%`;
    bar.style.backgroundColor = row.color;
    track.appendChild(bar);

    const count = document.createElement("span");
    count.className = "chart-count";
    count.textContent = row.count;

    rowEl.append(dot, label, track, count);
    container.appendChild(rowEl);
  }
  if (rows.length === 0) {
    container.innerHTML = "<div class=\"chart-empty\">No mentions in this view.</div>";
  }
}

function computeRecentDebates(mentions, limit) {
  const debates = new Map();
  for (const m of mentions) {
    const existing = debates.get(m.hansard_url);
    if (!existing) {
      debates.set(m.hansard_url, { title: m.debate_title, house: m.house, date: m.date, count: 1, url: m.hansard_url });
    } else {
      existing.count += 1;
      if (m.date > existing.date) existing.date = m.date;
    }
  }
  return [...debates.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
}

function renderRecentDebates(mentions, limit) {
  const container = document.getElementById("chart-recent-debates");
  container.innerHTML = "";
  const debates = computeRecentDebates(mentions, limit);

  if (debates.length === 0) {
    container.innerHTML = "<div class=\"chart-empty\">No debates in this view.</div>";
    return;
  }

  for (const debate of debates) {
    const row = document.createElement("a");
    row.className = "debate-row";
    row.href = debate.url;
    row.target = "_blank";
    row.rel = "noopener noreferrer";

    const date = document.createElement("span");
    date.className = "debate-row-date";
    date.textContent = formatDate(debate.date);

    const title = document.createElement("span");
    title.className = "debate-row-title";
    title.textContent = debate.title;
    title.title = debate.title;

    const housePill = document.createElement("span");
    housePill.className = "house-pill";
    housePill.textContent = debate.house;

    const count = document.createElement("span");
    count.className = "debate-row-count";
    count.textContent = debate.count;

    row.append(date, title, housePill, count);
    container.appendChild(row);
  }
}

function renderTrend(mentions) {
  const barsContainer = document.getElementById("trend-bars");
  barsContainer.innerHTML = "";

  if (state.globalYear !== "All") {
    // Compact Jan-Dec view for a single selected year.
    const counts = {};
    for (const m of mentions) {
      const month = m.date.slice(5, 7);
      counts[month] = (counts[month] || 0) + 1;
    }
    const max = Math.max(1, ...Object.values(counts));

    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, "0");
      const count = counts[key] || 0;
      appendTrendBar(barsContainer, MONTH_LABELS[m - 1], count, Math.max(3, Math.round((count / max) * 48)), count);
    }
    return;
  }

  // "All" years: full chronological view across the whole date range
  // instead of a Jan-Dec view, since mixing years into 12 buckets isn't
  // meaningful. Label every 3rd bar to avoid crowding, same pattern as
  // the pre-redesign chart.
  const counts = {};
  for (const m of mentions) {
    const key = m.date.slice(0, 7);
    counts[key] = (counts[key] || 0) + 1;
  }
  const months = Object.keys(counts).sort();
  const max = Math.max(1, ...months.map((k) => counts[k]));

  months.forEach((key, i) => {
    const count = counts[key];
    appendTrendBar(barsContainer, i % 3 === 0 ? key : "", count, Math.max(3, Math.round((count / max) * 48)), count);
  });
}

function appendTrendBar(container, label, count, barHeight, title) {
  const col = document.createElement("div");
  col.className = "trend-col";

  const bar = document.createElement("div");
  bar.className = "trend-bar";
  bar.style.height = `${barHeight}px`;
  bar.title = String(title);

  const labelEl = document.createElement("div");
  labelEl.className = "trend-month-label";
  labelEl.textContent = label;

  col.append(bar, labelEl);
  container.appendChild(col);
}

function renderGlobalHouseSegmented() {
  const container = document.getElementById("global-house-segmented");
  container.innerHTML = "";
  for (const house of ["All", "Commons", "Lords"]) {
    const button = document.createElement("button");
    button.textContent = house;
    button.className = state.globalHouse === house ? "segmented-btn active" : "segmented-btn";
    button.addEventListener("click", () => {
      state.globalHouse = house;
      renderGlobalHouseSegmented();
      renderGlobal();
    });
    container.appendChild(button);
  }
}

function populateGlobalYearSelect() {
  const select = document.getElementById("global-year");
  const option = document.createElement("option");
  option.value = "All";
  option.textContent = "All years";
  select.appendChild(option);
  for (const year of availableYears()) {
    const o = document.createElement("option");
    o.value = year;
    o.textContent = year;
    select.appendChild(o);
  }
  select.value = state.globalYear;
  select.addEventListener("change", () => {
    state.globalYear = select.value;
    renderGlobal();
  });
}

function populatePartyOptions() {
  const select = document.getElementById("filter-party");
  const parties = [...new Set(allMentions.map((m) => m.party).filter(Boolean))].sort();
  for (const party of parties) {
    const option = document.createElement("option");
    option.value = party;
    option.textContent = party;
    select.appendChild(option);
  }
}

function filteredMentions() {
  return globallyFiltered().filter((m) => {
    if (state.party && m.party !== state.party) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const matchesSpeaker = m.speaker.toLowerCase().includes(q);
      const matchesDebate = m.debate_title.toLowerCase().includes(q);
      if (!matchesSpeaker && !matchesDebate) return false;
    }
    return true;
  });
}

function renderList() {
  const allRows = filteredMentions();
  const rows = allRows.slice(0, state.visibleCount);
  const listEl = document.getElementById("mentions-list");
  const emptyEl = document.getElementById("empty-state");
  const loadMoreBtn = document.getElementById("load-more-btn");
  listEl.innerHTML = "";

  emptyEl.hidden = allRows.length > 0;
  if (allRows.length === 0) {
    loadMoreBtn.hidden = true;
    return;
  }

  for (const [index, mention] of rows.entries()) {
    const rowId = `${mention.hansard_url}#${index}`;
    const expanded = state.expandedId === rowId;
    const color = partyColor(mention.party);

    const wrapper = document.createElement("div");
    wrapper.className = "mention-row-wrapper";

    const row = document.createElement("div");
    row.className = "mention-row";
    row.addEventListener("click", () => {
      state.expandedId = expanded ? null : rowId;
      renderList();
    });

    const dateCell = document.createElement("div");
    dateCell.className = "cell-date";
    dateCell.textContent = formatDate(mention.date);

    const houseCell = document.createElement("div");
    const housePill = document.createElement("span");
    housePill.className = "house-pill";
    housePill.textContent = mention.house;
    houseCell.appendChild(housePill);

    const speakerCell = document.createElement("div");
    speakerCell.className = "cell-speaker";
    const speakerLine = document.createElement("div");
    speakerLine.className = "speaker-line";
    const dot = document.createElement("span");
    dot.className = "speaker-dot";
    dot.style.backgroundColor = color;
    const name = document.createElement("span");
    name.className = "speaker-name";
    name.textContent = mention.speaker;
    speakerLine.append(dot, name);
    const partyLine = document.createElement("div");
    partyLine.className = "speaker-party";
    partyLine.textContent = mention.party || "No party listed";
    speakerCell.append(speakerLine, partyLine);

    const debateCell = document.createElement("div");
    debateCell.className = "cell-debate";
    const debateTitle = document.createElement("div");
    debateTitle.className = "debate-title";
    debateTitle.textContent = mention.debate_title;
    const quotePreview = document.createElement("div");
    quotePreview.className = "quote-preview";
    quotePreview.textContent = mention.text;
    debateCell.append(debateTitle, quotePreview);

    const chevronCell = document.createElement("div");
    chevronCell.className = "chevron";
    chevronCell.textContent = "▸";
    chevronCell.style.transform = expanded ? "rotate(90deg)" : "rotate(0deg)";

    row.append(dateCell, houseCell, speakerCell, debateCell, chevronCell);
    wrapper.appendChild(row);

    if (expanded) {
      const expandedBlock = document.createElement("div");
      expandedBlock.className = "expanded-block";
      const quote = document.createElement("blockquote");
      quote.className = "expanded-quote";
      quote.style.borderLeftColor = color;
      quote.textContent = `“${mention.text}”`;
      const link = document.createElement("a");
      link.className = "hansard-link";
      link.href = mention.hansard_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View on Hansard →";
      expandedBlock.append(quote, link);
      wrapper.appendChild(expandedBlock);
    }

    listEl.appendChild(wrapper);
  }

  const remaining = allRows.length - rows.length;
  loadMoreBtn.hidden = remaining <= 0;
  if (remaining > 0) {
    loadMoreBtn.textContent = `Show ${Math.min(PAGE_SIZE, remaining)} more (${remaining} remaining)`;
  }
}

document.getElementById("load-more-btn").addEventListener("click", () => {
  state.visibleCount += PAGE_SIZE;
  renderList();
});

// Called when a GLOBAL filter (year/house) changes: recomputes stats,
// both ranking charts, the trend chart, the recent-debates chart, and the
// list (since the list sits on top of the global filter too).
function renderGlobal() {
  state.visibleCount = PAGE_SIZE;
  const gf = globallyFiltered();
  computeStatsAndCharts(gf);
  renderTrend(gf);
  renderList();
}

fetch("./data/mentions.json")
  .then((response) => response.json())
  .then((data) => {
    allMentions = data.mentions;

    populateGlobalYearSelect();
    renderGlobalHouseSegmented();
    populatePartyOptions();

    document.getElementById("filter-party").addEventListener("change", (e) => {
      state.party = e.target.value;
      state.visibleCount = PAGE_SIZE;
      renderList();
    });
    document.getElementById("filter-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      state.visibleCount = PAGE_SIZE;
      renderList();
    });

    renderGlobal();
  });
