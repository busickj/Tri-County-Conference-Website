const scheduleSchoolSelect = document.getElementById("school-select");
const scheduleSportSelect = document.getElementById("sport-select");
const scheduleTableContainer = document.getElementById("schedule-table");

populateSchoolSelect(scheduleSchoolSelect);
populateSportSelect(scheduleSportSelect, true);

// Links from a school's page (e.g. "?school=osage&sport=football") preselect
// both dropdowns instead of always landing on the first school/sport.
const scheduleParams = new URLSearchParams(location.search);
if (scheduleParams.has("school")) scheduleSchoolSelect.value = scheduleParams.get("school");
if (scheduleParams.has("sport")) scheduleSportSelect.value = scheduleParams.get("sport");

// "All Sports" (empty sport value) has no single MSHSAA embed that spans
// every sport, so that view stays backed by our own database. Picking one
// specific sport switches to MSHSAA's live embed for that school/sport -
// always current, straight from the source.
function refreshScheduleTable() {
  if (scheduleSportSelect.value) {
    renderMshsaaEmbed(scheduleTableContainer, scheduleSchoolSelect.value, scheduleSportSelect.value);
  } else {
    renderScheduleTable(scheduleTableContainer, scheduleSchoolSelect.value, scheduleSportSelect.value);
  }
}

scheduleSchoolSelect.addEventListener("change", refreshScheduleTable);
scheduleSportSelect.addEventListener("change", refreshScheduleTable);
refreshScheduleTable();
