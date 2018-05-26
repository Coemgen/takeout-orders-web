/*jslint
 browser, for, maxlen: 80, single, white
 */
/*global
 AdminDirectory, DocumentApp, HtmlService, ScriptProperties, Session,
 PropertiesService, SpreadsheetApp
 */


/**
 * write info to external debugFile
 * @param {string} info to be saved for debugging
 */
function writeDebug(info) {
  'use strict';
  var debugFile = DocumentApp.openById(
      PropertiesService.getScriptProperties()
      .getProperty('debugFileId')
      ).getBody()
      .editAsText();
  debugFile.appendText(info + '\n');
}


/**
 * @param {object} file @return {string}
 */
function include(file) {
  'use strict';
  return HtmlService.createHtmlOutputFromFile(file).getContent();
}


/**
 * Get Active orders from current Order Sheet
 * @param {string} userId has a value for enter orders page requests
 * @return {string}
 */
function getOrders(userId) {
  'use strict';
  var ss = SpreadsheetApp.openById(
      ScriptProperties.getProperty('orderSsId')
      );
  var date = new Date();
  var ordersSheet = ss.getSheetByName(date.getYear());
  var lastRow = ordersSheet.getLastRow();
  // get first row in active range
  var row = ordersSheet.getRange(2, 11).getValue() || 1;
  var column = 1;
  var numRows = lastRow - row + 1;
  var numColumns = 11;
  var ordersObj = {};
  ordersObj.orders = [];
  if (lastRow > row) {
    ordersObj.orders = ordersSheet.getRange(row, column, numRows, numColumns)
        .getValues();
  }
  if (!userId) {
    return JSON.stringify(ordersObj);
  }
  ordersObj.users = ss.getSheetByName('Users')
      .getDataRange()
      .getValues();
  // may need to uncomment if getting script errors
  //Utilities.sleep(1000);
  return JSON.stringify(ordersObj);
}


/**
 * Get one order from current Order Sheet
 * @param {number} row
 * @return {string}
 */
function getOneOrder(row) {
  'use strict';
  var date = new Date();
  var ordersSheet =
      SpreadsheetApp.openById(ScriptProperties.getProperty('orderSsId'))
          .getSheetByName(date.getYear());
  var column = 1;
  var numRows = 1;
  var numColumns = 11;
  var orderArr =
      ordersSheet.getRange(row + 1, column, numRows, numColumns).getValues();
  var orderObj = {
    'order': orderArr
  };
  return JSON.stringify(orderObj);
}


/**
 * @param {object} ss
 * @param {string} userId
 * @param {number} price
 */
function updateRunningTotal(ss, userId, price) {
  'use strict';
  var sheet = ss.getSheetByName('Users');
  var userArr = sheet.getDataRange().getValues();
  var i = 0;
  var row = 0;
  var column = 2;
  var oldVal = 0;
  var range = {};
  for (i = 0; i < userArr.length; i += 1) {
    if (userId === userArr[i][0]) {
      row = i + 1;
      range = sheet.getRange(row, column);
      oldVal = Number(range.getValue());
      range.setValue(oldVal + price);
      return;
    }
  }
  if (i === userArr.length) {
    sheet.appendRow([userId, price]);
    sheet.sort(1);
  }
}


/**
 * Append active order to current Orders sheet
 * @param {Object} formObject
 */
function fileOrderToSpreadsheet(formObject) {
  'use strict';
  var date = new Date();
  var ss = SpreadsheetApp.openById(
      ScriptProperties.getProperty('orderSsId')
      );
  var orderSheet = ss.getSheetByName(date.getYear());
  var lastRow = orderSheet.getLastRow();
  var rowContents =
      [date,
        formObject.userId,
        formObject.restaurant,
        formObject.userName,
       formObject.selection || '',
       formObject.price || 0,
       formObject.pickup || '',
       formObject.cleanup || '',
       'Active',
       lastRow];
  orderSheet.appendRow(rowContents);
  updateRunningTotal(ss, formObject.userId, Number(formObject.price));
}


/**
 * Append active order to current Orders sheet
 * @param {Object} formObject
 */
function fileOrderEditToSpreadsheet(formObject) {
  'use strict';
  var date = new Date();
  var ss = SpreadsheetApp.openById(
      ScriptProperties.getProperty('orderSsId')
      );
  var orderSheet = ss.getSheetByName(date.getYear());
  var row = Number(formObject.rowNum);
  orderSheet.getRange(row + 1, 3, 1, 6).setValues(
      [[formObject.restaurant,
        formObject.userName,
        formObject.selection || '',
        formObject.price || 0,
        formObject.pickup || '',
        formObject.cleanup || '']]);
  updateRunningTotal(ss, formObject.userId, Number(formObject.oldPrice) * -1);
  updateRunningTotal(ss, formObject.userId, Number(formObject.price));
}


/**
 * @param {string} jsonStr
 */
function deleteOrderFromSpreadsheet(jsonStr) {
  'use strict';
  var jsonObj = JSON.parse(jsonStr);
  var date = new Date();
  var year = date.getYear();
  var ss = SpreadsheetApp.openById(
      PropertiesService.getScriptProperties()
      .getProperty('orderSsId')
      );
  var sheet = ss.getSheetByName(year);
  var rowNum = Number(jsonObj.rowNum);
  var userId = sheet.getRange(rowNum, 2).getValue();
  var price = Number(jsonObj.price);
  sheet.getRange(rowNum + 1, 9).setValue('Deleted');
  updateRunningTotal(ss, userId, price * -1);
}


/**
 * @param {object} sheet
 * @return {object}
 */
function restrArr_(sheet) {
  'use strict';
  var row = 1;
  var column = 3;
  var numRows = sheet.getLastRow();
  var numColumns = 2;
  return sheet.getRange(row, column, numRows, numColumns)
      .getValues();
}


/**
 * @param {object} frmObj
 * @return {object}
 */
function fileRestrToSpreadsheet(frmObj) {
  'use strict';
  var sheet = SpreadsheetApp.openById(
      ScriptProperties.getProperty('restaurantSsId')
      )
      .getSheetByName('Active');
  var date = new Date();
  var rowContents = [];
  var columnPosition = 3;
  rowContents = [
    date,
    frmObj.userId,
    frmObj.restrName.toUpperCase(),
    frmObj.restrUrl
  ];
  sheet.appendRow(rowContents);
  sheet.sort(columnPosition);
  return restrArr_(sheet);
}


/**
 * @return {object}
 */
function getRestrArr() {
  'use strict';
  var sheet = SpreadsheetApp
      .openById(
      ScriptProperties.getProperty('restaurantSsId')
      ).getSheetByName('Active');
  return restrArr_(sheet);
}


/**
 *
 * @param {number} index
 * @return {object}
 */
function deleteRestrFromSpreadsheet(index) {
  'use strict';
  var delRow = index + 1;
  var sheet = SpreadsheetApp
      .openById(
      ScriptProperties.getProperty('restaurantSsId')
      )
      .getSheetByName('Active');
  sheet.deleteRow(delRow);
  return restrArr_(sheet);
}


/************************* Main Function **************************************/


/**
 * @return {object}
 */
function doGet() {
  'use strict';
  var tmpl = HtmlService.createTemplateFromFile('index');
  tmpl.userObj = AdminDirectory.Users.get(
      Session.getActiveUser().getEmail(),
      {
        projection: 'basic',
        viewType: 'domain_public'
      }
      );
  return tmpl.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('Takeout Orders');
}
