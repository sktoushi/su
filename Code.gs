function doGet() {
  var output = ContentService.createTextOutput(JSON.stringify(incrementCounter()));
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader("Access-Control-Allow-Origin", "*");
  return output;
}

function incrementCounter() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var today = new Date();
  var yearMonth = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyyMM");

  // Get all data from column A
  var data = sheet.getRange("A:B").getValues();
  
  var found = false;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == yearMonth) {
      // If the yearMonth exists in column A, increment the value in column B
      sheet.getRange(i + 1, 2).setValue(data[i][1] + 1);
      found = true;
      break;
    }
  }
  
  if (!found) {
    // If yearMonth is not found, insert a new row at the top
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1).setValue(yearMonth);
    sheet.getRange(1, 2).setValue(1);
  }
}
