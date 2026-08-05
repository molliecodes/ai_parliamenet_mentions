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

let allMentions = [];
let state = { house: "All", party: "", search: "", expandedId: null, trendYear: null };

function computeStatsAndCharts() {
  document.getElementById("stat-total").textContent = allMentions.length;
  document.getElementById("stat-debates").textContent =
    new Set(allMentions.map((m) => m.debate_title)).size;
  const commonsCount = allMentions.filter((m) => m.house === "Commons").length;
  document.getElementById("stat-commons-pct").textContent =
    `${Math.round((commonsCount / allMentions.length) * 100)}%`;

  renderBarChart("chart-speakers", topSpeakers(8));
  renderBarChart("chart-parties", byParty());
}

function topSpeakers(limit) {
  const counts = new Map();
  for (const m of allMentions) {
    const entry = counts.get(m.speaker) || { name: m.speaker, party: m.party, count: 0 };
    entry.count += 1;
    counts.set(m.speaker, entry);
  }
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = ranked.length ? ranked[0].count : 1;
  return ranked.map((s) => ({ name: s.name, count: s.count, color: partyColor(s.party), pct: (s.count / max) * 100 }));
}

function byParty() {
  const counts = new Map();
  for (const m of allMentions) {
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
}

function availableYears() {
  return [...new Set(allMentions.map((m) => m.date.slice(0, 4)))].sort();
}

function renderTrend() {
  const yearSelect = document.getElementById("trend-year");
  if (!yearSelect.options.length) {
    for (const year of availableYears()) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
    yearSelect.value = state.trendYear;
    yearSelect.addEventListener("change", () => {
      state.trendYear = yearSelect.value;
      renderTrend();
    });
  }

  const counts = {};
  for (const m of allMentions) {
    if (m.date.slice(0, 4) !== state.trendYear) continue;
    const month = m.date.slice(5, 7);
    counts[month] = (counts[month] || 0) + 1;
  }
  const max = Math.max(1, ...Object.values(counts));

  const barsContainer = document.getElementById("trend-bars");
  barsContainer.innerHTML = "";
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, "0");
    const count = counts[key] || 0;
    const barHeight = Math.max(3, Math.round((count / max) * 48));

    const col = document.createElement("div");
    col.className = "trend-col";

    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.style.height = `${barHeight}px`;
    bar.title = String(count);

    const label = document.createElement("div");
    label.className = "trend-month-label";
    label.textContent = MONTH_LABELS[m - 1];

    col.append(bar, label);
    barsContainer.appendChild(col);
  }
}

function renderHouseSegmented() {
  const container = document.getElementById("house-segmented");
  container.innerHTML = "";
  for (const house of ["All", "Commons", "Lords"]) {
    const button = document.createElement("button");
    button.textContent = house;
    button.className = state.house === house ? "segmented-btn active" : "segmented-btn";
    button.addEventListener("click", () => {
      state.house = house;
      renderHouseSegmented();
      renderList();
    });
    container.appendChild(button);
  }
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
  return allMentions.filter((m) => {
    if (state.house !== "All" && m.house !== state.house) return false;
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
  const rows = filteredMentions();
  const listEl = document.getElementById("mentions-list");
  const emptyEl = document.getElementById("empty-state");
  listEl.innerHTML = "";

  emptyEl.hidden = rows.length > 0;
  if (rows.length === 0) return;

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
}

fetch("./data/mentions.json")
  .then((response) => response.json())
  .then((data) => {
    allMentions = data.mentions;
    const years = availableYears();
    state.trendYear = years[years.length - 1];

    computeStatsAndCharts();
    renderTrend();
    renderHouseSegmented();
    populatePartyOptions();

    document.getElementById("filter-party").addEventListener("change", (e) => {
      state.party = e.target.value;
      renderList();
    });
    document.getElementById("filter-search").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      renderList();
    });

    renderList();
  });
