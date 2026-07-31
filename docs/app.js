fetch("./data/mentions.json")
  .then((response) => response.json())
  .then((data) => {
    document.getElementById("count").textContent =
      `${data.total_count} mentions of AI found in UK Parliament`;

    const tbody = document.querySelector("#mentions tbody");
    for (const mention of data.mentions) {
      const row = document.createElement("tr");

      const link = document.createElement("a");
      link.href = mention.hansard_url;
      link.textContent = mention.text;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const mentionCell = document.createElement("td");
      mentionCell.appendChild(link);

      for (const value of [mention.date, mention.house, mention.speaker, mention.party ?? ""]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }
      const debateCell = document.createElement("td");
      debateCell.textContent = mention.debate_title;
      row.appendChild(debateCell);
      row.appendChild(mentionCell);

      tbody.appendChild(row);
    }
  });
