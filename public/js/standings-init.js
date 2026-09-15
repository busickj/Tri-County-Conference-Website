const standingsSportSelect = document.getElementById("sport-select");
const standingsTableContainer = document.getElementById("standings-table");
populateSportSelect(standingsSportSelect);

const standingsParams = new URLSearchParams(location.search);
if (standingsParams.has("sport")) standingsSportSelect.value = standingsParams.get("sport");
standingsSportSelect.addEventListener("change", () => renderStandingsTable(standingsTableContainer, standingsSportSelect.value));
renderStandingsTable(standingsTableContainer, standingsSportSelect.value);
