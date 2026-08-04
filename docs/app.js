let allMentions = [];

// Fallback color (DEFAULT_PARTY_COLOR) covers any party not listed here —
// new/minor parties can appear in future daily fetches without breaking.
const PARTY_COLORS = {
  "Labour": "#E4003B",
  "Labour (Co-op)": "#E4003B",
  "Conservative": "#0087DC",
  "Liberal Democrat": "#FAA61A",
  "Crossbench": "#888888",
  "Non-affiliated": "#999999",
  "Independent": "#AAAAAA",
  "Scottish National Party": "#E8CB2D",
  "Bishops": "#7E5CAD",
  "Green Party": "#6AB023",
  "Democratic Unionist Party": "#D5282C",
  "Reform UK": "#12B6CF",
  "Plaid Cymru": "#005B54",
  "Traditional Unionist Voice": "#0C3B5C",
  "Ulster Unionist Party": "#6699CC",
  "Lord Speaker": "#777777",
};
const DEFAULT_PARTY_COLOR = "#777777";

function partyColor(party) {
  return PARTY_COLORS[party] || DEFAULT_PARTY_COLOR;
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function populatePartyOptions(mentions) {
  const select = document.getElementById("filter-party");
  const parties = [...new Set(mentions.map((m) => m.party).filter(Boolean))].sort();
  for (const party of parties) {
    const option = document.createElement("option");
    option.value = party;
    option.textContent = party;
    select.appendChild(option);
  }
}

function currentFilters() {
  return {
    house: document.getElementById("filter-house").value,
    party: document.getElementById("filter-party").value,
    speaker: document.getElementById("filter-speaker").value.trim().toLowerCase(),
  };
}

function applyFilters(mentions, filters) {
  return mentions.filter((m) => {
    if (filters.house && m.house !== filters.house) return false;
    if (filters.party && m.party !== filters.party) return false;
    if (filters.speaker && !m.speaker.toLowerCase().includes(filters.speaker)) return false;
    return true;
  });
}

function renderTable(mentions) {
  const tbody = document.querySelector("#mentions tbody");
  tbody.innerHTML = "";
  for (const mention of mentions) {
    const row = document.createElement("tr");
    for (const value of [mention.date, mention.house, mention.speaker, mention.party ?? ""]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }

    const debateCell = document.createElement("td");
    debateCell.textContent = mention.debate_title;
    row.appendChild(debateCell);

    const link = document.createElement("a");
    link.href = mention.hansard_url;
    link.textContent = mention.text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const mentionCell = document.createElement("td");
    mentionCell.appendChild(link);
    row.appendChild(mentionCell);

    tbody.appendChild(row);
  }
}

function renderChart(mentions) {
  const svg = document.getElementById("chart");
  svg.innerHTML = "";

  const counts = {};
  for (const m of mentions) {
    const key = monthKey(m.date);
    counts[key] = (counts[key] || 0) + 1;
  }
  const months = Object.keys(counts).sort();
  if (months.length === 0) return;

  const width = svg.clientWidth || 800;
  const height = 160;
  const padding = 20;
  const barGap = 2;
  const barWidth = (width - padding) / months.length - barGap;
  const maxCount = Math.max(...months.map((m) => counts[m]));

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  months.forEach((month, i) => {
    const count = counts[month];
    const barHeight = maxCount ? (count / maxCount) * (height - padding) : 0;
    const x = padding + i * (barWidth + barGap);
    const y = height - padding - barHeight;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", Math.max(barWidth, 1));
    rect.setAttribute("height", barHeight);
    rect.setAttribute("class", "chart-bar");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${month}: ${count} mention${count === 1 ? "" : "s"}`;
    rect.appendChild(title);
    svg.appendChild(rect);

    if (i % 3 === 0) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x);
      text.setAttribute("y", height - 4);
      text.setAttribute("class", "chart-label");
      text.textContent = month;
      svg.appendChild(text);
    }
  });
}

function renderTopSpeakers(mentions, limit = 10) {
  const list = document.getElementById("top-speakers");
  list.innerHTML = "";

  if (mentions.length === 0) {
    list.innerHTML = "<li class=\"ranking-empty\">No mentions match these filters.</li>";
    return;
  }

  const counts = new Map();
  for (const m of mentions) {
    const entry = counts.get(m.speaker) || { party: m.party, count: 0 };
    entry.count += 1;
    counts.set(m.speaker, entry);
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);

  for (const [speaker, { party, count }] of ranked) {
    const item = document.createElement("li");

    const dot = document.createElement("span");
    dot.className = "party-dot";
    dot.style.backgroundColor = partyColor(party);

    const name = document.createElement("span");
    name.className = "ranking-name";
    name.textContent = speaker;

    const partyLabel = document.createElement("span");
    partyLabel.className = "ranking-party";
    partyLabel.textContent = party || "No party listed";

    const countLabel = document.createElement("span");
    countLabel.className = "ranking-count";
    countLabel.textContent = count;

    item.append(dot, name, partyLabel, countLabel);
    list.appendChild(item);
  }
}

function renderPartyRanking(mentions) {
  const container = document.getElementById("party-ranking");
  container.innerHTML = "";

  if (mentions.length === 0) {
    container.innerHTML = "<p class=\"ranking-empty\">No mentions match these filters.</p>";
    return;
  }

  const counts = new Map();
  for (const m of mentions) {
    const party = m.party || "No party listed";
    counts.set(party, (counts.get(party) || 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = ranked[0][1];

  for (const [party, count] of ranked) {
    const row = document.createElement("div");
    row.className = "party-row";

    const label = document.createElement("span");
    label.className = "party-row-label";
    label.textContent = party;
    label.title = party;

    const barTrack = document.createElement("span");
    barTrack.className = "party-row-track";
    const bar = document.createElement("span");
    bar.className = "party-row-bar";
    bar.style.width = `${(count / maxCount) * 100}%`;
    bar.style.backgroundColor = partyColor(party);
    barTrack.appendChild(bar);

    const countLabel = document.createElement("span");
    countLabel.className = "party-row-count";
    countLabel.textContent = count;

    row.append(label, barTrack, countLabel);
    container.appendChild(row);
  }
}

function render() {
  const filtered = applyFilters(allMentions, currentFilters());
  document.getElementById("count").textContent =
    `${filtered.length} of ${allMentions.length} mentions of AI shown`;
  renderChart(filtered);
  renderTopSpeakers(filtered);
  renderPartyRanking(filtered);
  renderTable(filtered);
}

let debounceHandle;
function renderDebounced() {
  clearTimeout(debounceHandle);
  debounceHandle = setTimeout(render, 150);
}

fetch("./data/mentions.json")
  .then((response) => response.json())
  .then((data) => {
    allMentions = data.mentions;
    populatePartyOptions(allMentions);

    document.getElementById("filter-house").addEventListener("change", render);
    document.getElementById("filter-party").addEventListener("change", render);
    document.getElementById("filter-speaker").addEventListener("input", renderDebounced);

    render();
  });
