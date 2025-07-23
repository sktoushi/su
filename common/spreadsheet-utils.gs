function getRangesData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ranges');
  const data = sheet.getDataRange().getValues();

  const config = data.slice(1).map(row => ({
    username: row[0],
    repo: row[1],
    startIdx: row[2],
    endIdx: row[3]
  }));

  return config;
}

function getFrequencyModsData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('frequencyMod');
  const data = sheet.getDataRange().getValues();

  const frequencyMods = {};

  data.slice(1).forEach(row => {
    const key = `${row[0]}-${row[1]}`;
    const issueNumber = row[2];
    const frequency = row[3];

    if (!frequencyMods[key]) {
      frequencyMods[key] = {};
    }
    frequencyMods[key][issueNumber] = frequency;
  });

  return frequencyMods;
}
