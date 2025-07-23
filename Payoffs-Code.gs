function doGet(e) {
  var domain = e.parameter.domain;
  var expectedPayoff = parseFloat(e.parameter.expectedPayoff);
  var positiveExternality = parseFloat(e.parameter.positiveExternality);
  var negativeExternality = parseFloat(e.parameter.negativeExternality);
  var totalPayoff = parseFloat(e.parameter.totalPayoff);

  // Infer the current YYYYMM from the execution date
  var yearMonth = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMM");

  var output = ContentService.createTextOutput(
    JSON.stringify(
      incrementCounter(yearMonth, domain, expectedPayoff, positiveExternality, negativeExternality, totalPayoff)
    )
  );
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader("Access-Control-Allow-Origin", "*");
  return output;
}

function incrementCounter(yearMonth, domain, expectedPayoff, positiveExternality, negativeExternality, totalPayoff) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Ensure the first row is always the header
  var header = ["YYYYMM", "Domain", "Foresight%", "AvgPayoff", "Avg+Ex", "AvgNegEx", "ObservationCount", "ExpectedPayoff", "+Ex", "NegEx", "TotalPayoff"];
  if (!header.every((val, index) => sheet.getRange(1, index + 1).getValue() === val)) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }

  // Get all data from columns A to K starting from the second row
  var dataRange = sheet.getRange("A2:K" + sheet.getLastRow());
  var data = dataRange.getValues();
  
  var found = false;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == yearMonth && data[i][1] == domain) {
      // If the record exists, increment the values in the corresponding columns
      var newSampleSize = data[i][6] + 1;
      var newExpectedPayoff = data[i][7] + expectedPayoff;
      var newPositiveExternality = data[i][8] + positiveExternality;
      var newNegativeExternality = data[i][9] + negativeExternality;
      var newTotalPayoff = data[i][10] + totalPayoff;

      sheet.getRange(i + 2, 3).setFormula(`=J${i + 2}/G${i + 2}`);  // Foresight%
      sheet.getRange(i + 2, 4).setFormula(`=K${i + 2}/G${i + 2}`);  // Average Total Payoff
      sheet.getRange(i + 2, 5).setFormula(`=I${i + 2}/G${i + 2}`);  // Average Positive Externality
      sheet.getRange(i + 2, 6).setFormula(`=J${i + 2}/G${i + 2}`);  // Average Negative Externality
      sheet.getRange(i + 2, 7).setValue(newSampleSize);
      sheet.getRange(i + 2, 8).setValue(newExpectedPayoff);
      sheet.getRange(i + 2, 9).setValue(newPositiveExternality);
      sheet.getRange(i + 2, 10).setValue(newNegativeExternality);
      sheet.getRange(i + 2, 11).setValue(newTotalPayoff);
      
      found = true;
      break;
    }
  }
  
  if (!found) {
    // If the record is not found, insert a new row as the second row (after the header)
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1).setValue(yearMonth);
    sheet.getRange(2, 2).setValue(domain);
    sheet.getRange(2, 3).setFormula(`=(K2/H2)*100`);  // Foresight%
    sheet.getRange(2, 4).setFormula(`=K2/G2`);  // Average Total Payoff
    sheet.getRange(2, 5).setFormula(`=I2/G2`);  // Average Positive Externality
    sheet.getRange(2, 6).setFormula(`=J2/G2`);  // Average Negative Externality
    sheet.getRange(2, 7).setValue(1);  // Initialize sampleSize as 1
    sheet.getRange(2, 8).setValue(expectedPayoff);
    sheet.getRange(2, 9).setValue(positiveExternality);
    sheet.getRange(2, 10).setValue(negativeExternality);
    sheet.getRange(2, 11).setValue(totalPayoff);
  }
}
