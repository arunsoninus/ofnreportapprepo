sap.ui.define([
		"nus/edu/sg/ofnreport/utils/services",
		"nus/edu/sg/ofnreport/utils/configuration",
		"nus/edu/sg/ofnreport/utils/utility"
	], function (Services, Config, Utility) {
		"use strict";
		var validation = ("nus.edu.sg.ofnreport.utils.validation", {
			firstValidation: function () {
				return "Paks";
			},
			_fnSubmitValidation: function (component) {
				var aValidation = [];
				var userRole = component.AppModel.getProperty("/userRole");
				var claimItems = component.AppModel.getProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails");
				claimItems = Utility._fnSortingEclaimItemData(claimItems);;
				var hasValidationError = false;
				var aResultClaimItems = []
				if (claimItems) {
					var newLineItem = 0;
					var dateOverlapErrorFlag;

					for (var i = 0; i < claimItems.length; i++) {
						var item = claimItems[i];
						var claimDate = item.CLAIM_START_DATE;
						item.havingAnyError = false;
						if (!item.RATE_TYPE) {
							item.valueStateRateType = "Error";
							item.valueStateTextRateType = "Mandatory field";
							!item.havingAnyError ? true : false;
							if (!hasValidationError) {
								hasValidationError = true;
							}
							this._formatMessageList("Error", "Rate Type", component.getI18n("RateTimeRequired"), claimDate);
						} else if (item.RATE_TYPE === '10') {
							if (!item.START_TIME) {
								item.valueStateStartTime = "Error";
								item.valueStateTextStartTime = "Mandatory field";
								!item.havingAnyError ? true : false;
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StarttimeRequired"), claimDate));

							}

							if (!item.END_TIME) {
								item.valueStateEndTime = "Error";
								item.valueStateTextEndTime = "Mandatory field";
								!item.havingAnyError ? true : false;
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "End Time", component.getI18n("EndtimeRequired"), claimDate));
							}
							if (item.valueStateEndTime !== "Error" && item.valueStateStartTime !== "Error") {
								// handling start time
								var claimStartDate = new Date(item.CLAIM_START_DATE);
								var arrStartTime = item.START_TIME.split(":");
								claimStartDate.setHours(parseInt(arrStartTime[0]));
								if (arrStartTime.length === 2) {
									claimStartDate.setMinutes(parseInt(arrStartTime[1]));
								} else {
									claimStartDate.setMinutes(0);
								}
								//handling end time
								var claimEndDate = new Date(item.CLAIM_END_DATE);
								var arrEndTime = item.END_TIME.split(":");
								claimEndDate.setHours(parseInt(arrEndTime[0]));
								if (claimEndDate.length === 2) {
									claimEndDate.setMinutes(parseInt(arrEndTime[1]));
								} else {
									claimEndDate.setMinutes(0);
								}

								//calculate hours between two dates
								var differenceHours = Math.abs(claimEndDate - claimStartDate) / 36e5;
								var calcDifferenceHours = differenceHours;
								if (claimStartDate.getDay() >= 1 && claimStartDate.getDay() <= 4) {
									if (differenceHours >= 8.5) {
										calcDifferenceHours = differenceHours - 1;
									}

								} else if (claimStartDate.getDay() === 5) {
									if (differenceHours >= 8) {
										calcDifferenceHours = differenceHours - 1;
									}
								}

								if (calcDifferenceHours < parseFloat(item.HOURS_UNIT)) {
									item.HOURS_UNIT = calcDifferenceHours;
								}

								item.claimStartDate = claimStartDate;
								item.claimEndDate = claimEndDate;

								if (item.claimStartDate > item.claimEndDate) {
									!item.havingAnyError ? true : false;
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Start Time", component.getI18n("StartTimeGtEndTime"), claimDate));
								}
							}

						}

						if (item.IS_DISCREPENCY) {
							if (!item.DISC_RATETYPE_AMOUNT) {
								item.valueStateDiscAmount = "Error";
								item.valueStateTextDiscAmount = "Mandatory field";
								!item.havingAnyError ? true : false;
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Discrepency Rate Amount", component.getI18n("DiscRateTypeAmountRequired"),
									claimDate));
							}
							if (!item.REMARKS) {
								item.valueStateDiscAmount = "Error";
								item.valueStateTextDiscAmount = "Mandatory field";
								!item.havingAnyError ? true : false;
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "Remarks", component.getI18n("RemarksRequired"), claimDate));

							} else {
								// item.valueStateRemarks = "None";
								// item.valueStateTextRemarks = "";								
							}

						}

						// wbs check
						if (item.WBS) {
							//call WBS validate API 
							var oHeaders = Utility._headerToken(component);
							var wbsSet = [];
							var wbsSetItem = {};
							var saveObj = {};
							wbsSetItem.WBS = item.WBS;
							wbsSet.push(wbsSetItem);
							saveObj.WBSRequest = wbsSet;
							var serviceUrl = Config.dbOperations.checkWbs
							var wbsValidateModel = new sap.ui.model.json.JSONModel();
							wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
							if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
								item.valueStateWbs = "Error";
								item.valueStateTextWbs = wbsValidateModel.getData().EtOutput.item.EvMsg;
								!item.havingAnyError ? true : false;
								if (!hasValidationError) {
									hasValidationError = true;
								}
								aValidation.push(this._formatMessageList("Error", "WBS Element", wbsValidateModel.getData().EtOutput.item.EvMsg, claimDate));
							} else {
								item.WBS = wbsValidateModel.getData().EtOutput.item.EvActwbs;
								item.WBS_DESC = wbsValidateModel.getData().EtOutput.item.EvWbsdesc;
							}
						}

						//future dated records cannot be submitted
						if (new Date(item.CLAIM_END_DATE) > new Date()) {
							!item.havingAnyError ? true : false;
							if (!hasValidationError) {
								hasValidationError = true;
							}
							aValidation.push(this._formatMessageList("Error", "Date", component.getI18n("RestrictingFutureDated"), claimDate));
						}

						//check for max limit for the individate rates

						// handling overlapping check
						for (var c = 0; c < claimItems.length; c++) { //running loop to handle for each date
							var comparingItem = claimItems[c];
							if ((new Date(item.CLAIM_START_DATE) === new Date(comparingItem.CLAIM_START_DATE)) && (c !== i)) {
								//hourly and monthly cannot be possible
								if ((item.RATE_TYPE === '10' && comparingItem.RATE_TYPE === '11') || (comparingItem.RATE_TYPE === '10' && item.RATE_TYPE ===
										'11')) {
									item.valueStateRateType = "Error";
									item.valueStateTextRateType = "Mandatory field";
									!item.havingAnyError ? true : false;
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("RateTypeHourlyMonthlyMismatch"), claimDate));
								}
								//not more than one per script allowed
								//rate code is 14
								if (item.RATE_TYPE === '14' && comparingItem.RATE_TYPE === '14') {
									item.valueStateRateType = "Error";
									item.valueStateTextRateType = "Mandatory field";
									!item.havingAnyError ? true : false;
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("PerScriptMismatch"), claimDate));
								}
								//not more than one per student allowed
								//rate code is 12
								if (item.RATE_TYPE === '12' && comparingItem.RATE_TYPE === '12') {
									item.valueStateRateType = "Error";
									item.valueStateTextRateType = "Mandatory field";
									!item.havingAnyError ? true : false;
									if (!hasValidationError) {
										hasValidationError = true;
									}
									aValidation.push(this._formatMessageList("Error", "Rate Type", component.getI18n("PerStudentMismatch"), claimDate));
								}

							}

						}
						
							aResultClaimItems.push(item);
					}
				
				}
				component.AppModel.setProperty("/claimRequest/createClaimRequest/EclaimsItemDataDetails", aResultClaimItems);
				component.AppModel.setProperty("/claimRequest/createClaimRequest/singleRequestErrorMessages", aValidation);
				return {
					"hasValidationError": hasValidationError
				};
			},
			_formatMessageList: function (type, sColumnName, message, claimDate) {
				var messageObj = {};
				messageObj.type = type;
				messageObj.displayIdx = claimDate;
				messageObj.sTitle = "Claim Date : " + messageObj.displayIdx + "\n Column :" + sColumnName;
				messageObj.title = sColumnName;
				messageObj.state = type;
				messageObj.message = message;
				messageObj.idx = claimDate;
				return messageObj;
			}
		});
		return validation;
	},
	true);