let allMentions = [];

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

function render() {
  const filtered = applyFilters(allMentions, currentFilters());
  document.getElementById("count").textContent =
    `${filtered.length} of ${allMentions.length} mentions of AI shown`;
  renderChart(filtered);
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
