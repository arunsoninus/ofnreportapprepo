sap.ui.define([
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/model/json/JSONModel",
	"nus/edu/sg/ofnreport/utils/services",
	"nus/edu/sg/ofnreport/utils/appconstant",
	"nus/edu/sg/ofnreport/utils/configuration",
	"nus/edu/sg/ofnreport/utils/dataformatter",
	"sap/m/Dialog",
	"sap/m/Text"
], function (Filter, FilterOperator, FilterType, Fragment, Sorter, JSONModel, Services, AppConstant, Config, Formatter, Dialog, Text) {
	"use strict";
	var utility = ("nus.edu.sg.ofnreport.utils.utility", {
		_fnAppModelGetProperty: function (component, sPath) {
			return component.AppModel.getProperty(sPath) ? component.AppModel.getProperty(sPath) : "";
		},
		_fnAppModelSetProperty: function (component, sPath, sValue) {
			return component.AppModel.setProperty(sPath, sValue);
		},
		_fnFilterCreation: function (component) {
			component._mFilters = {
				"Draft": [new Filter("REQUEST_STATUS", FilterOperator.EQ, '01')],
				"RejReq": [],
				"Process": [],
				"Post": [],
				"All": []
			};
			var aRejectedList = component.AppModel.getProperty("/statusConfigDetails");
			if (aRejectedList instanceof Array) {
				aRejectedList.forEach(function (oValue) {
					if (oValue.STATUS_ALIAS.indexOf("Reject") !== -1) {
						component._mFilters.RejReq.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}

					if (oValue.STATUS_ALIAS.indexOf("Pending") !== -1 || oValue.STATUS_ALIAS.indexOf("Completed") !== -1 || oValue.STATUS_ALIAS.indexOf(
							"Transferred") !== -1 || oValue.STATUS_ALIAS.indexOf("In Progress") !== -1 || oValue.STATUS_ALIAS.indexOf("Cancelled") !== -1 ||
						oValue.STATUS_ALIAS.indexOf("Suspended") !== -1 || oValue.STATUS_ALIAS.indexOf("Completed") !== -1 || oValue.STATUS_ALIAS.indexOf(
							"Completed") !== -1) {
						component._mFilters.Process.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}
					if (oValue.STATUS_ALIAS.indexOf("Posted") !== -1) {
						component._mFilters.Post.push(new Filter(
							"REQUEST_STATUS", FilterOperator.EQ, oValue.STATUS_CODE));
					}

				});

			}
		},
		_assignTokenAndUserInfo: function (oRetData, component) {
			component.AppModel.setProperty("/token", oRetData.token);
			component.AppModel.setProperty("/loggedInUserInfo", oRetData.userDetails[0]);
			component.AppModel.setProperty("/loggedInUserStfNumber", oRetData.staffInfo.primaryAssignment.STF_NUMBER);
			component.AppModel.setProperty("/loggedInUserSfStfNumber", oRetData.staffInfo.primaryAssignment.SF_STF_NUMBER);
			//to incorporate primary and secondary assignments(concurrent case ULU and FDLUs)	
			component.AppModel.setProperty("/primaryAssigment", oRetData.staffInfo.primaryAssignment);
			component.AppModel.setProperty("/otherAssignments", oRetData.staffInfo.otherAssignments);
			component.AppModel.setProperty("/claimAuthorizations", oRetData.staffInfo.claimAuthorizations);
			component.AppModel.setProperty("/staffInfo", oRetData.staffInfo);
			var sListUluFdluQuickView = oRetData.staffInfo.primaryAssignment.ULU_T.concat("(", oRetData.staffInfo.primaryAssignment.ULU_C).concat(
				") / ", oRetData.staffInfo.primaryAssignment.FDLU_T).concat("(", oRetData.staffInfo.primaryAssignment.FDLU_C).concat(")", "");
			for (var t = 0; t < oRetData.staffInfo.otherAssignments.length; t++) {
				var oOtherAssign = oRetData.staffInfo.otherAssignments[t];
				sListUluFdluQuickView = sListUluFdluQuickView.concat("\n\n", oOtherAssign.ULU_T).concat("(", oOtherAssign.ULU_C).concat(") / ",
					oOtherAssign.FDLU_T).concat("(", oOtherAssign.FDLU_C).concat(")", "");
			}
			component.AppModel.setProperty("/sClaimaintListUluFdlu", sListUluFdluQuickView);

			// for (var i = 0; i < oRetData.userDetails[0].groups.length; i++) {
			// 	var oGroups = oRetData.userDetails[0].groups[i];
			// 	if (oGroups.value === component.getI18n("ClaimAssistant.User.Group")) {
			// 		component.AppModel.setProperty("/userRole", "CA"); //claim assistant
			// 	} else if (oGroups.value === "NUS_CHRS_ECLAIMS_ESS") {
			// 		component.AppModel.setProperty("/userRole", "ESS"); // employee 
			// 	} else if (oGroups.value === "NUS_CHRS_ECLAIMS_VERIFIER") {
			// 		component.AppModel.setProperty("/userRole", "VERIFIER"); // Verifier 
			// 	} else if (oGroups.value === "NUS_CHRS_ECLAIMS_APPROVER") {
			// 		component.AppModel.setProperty("/userRole", "APPROVER"); // Verifier 
			// 	}
			// }
			var oComponentData = component.getOwnerComponent().getComponentData();
			if (oComponentData && oComponentData.startupParameters && oComponentData.startupParameters.role && oComponentData.startupParameters
				.role.length > 0) {
				component._startUpParameterRole = oComponentData.startupParameters.role[0];
			}
			if (component._startUpParameterRole === "CLMNT") {
				component.AppModel.setProperty("/userRole", "ESS");
			} else if (component._startUpParameterRole === "CMASST") {
				component.AppModel.setProperty("/userRole", "CA");
			}

			if (component.viaInbox === true) {
				component.AppModel.setProperty("/userRole", component.taskName);
			}
		},
		_headerToken: function (component) {
			var token = component.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"Content-Type": "application/json"
			};
			return oHeaders;
		},

		_generateFilter: function (sValueToFilter, aFilterValues, sOperator) {
			sOperator = sOperator || FilterOperator.EQ;
			var aFilterArray = aFilterValues.map(function (sFilterValue) {
				return new Filter(sValueToFilter, sOperator, sFilterValue);
			});
			return aFilterArray;
		},
		_bindItems: function (component, controlId, sPath, oSorter, oTemplate, aFilter) {
			var oControl = component.getUIControl(controlId);
			oControl.bindItems({
				path: sPath,
				sorter: oSorter,
				template: oTemplate,
				filters: aFilter //filters //oFilter//filters
			});
		},
		_handleOpenFragment: function (component, fragmentName, fragId, sDialogTab) {
			component._oDialog = null;
			component._oDialog = undefined;
			if (!component._oDialog) {
				component._oDialog = sap.ui.xmlfragment(fragId,
					fragmentName, component);
				component.getView().addDependent(component._oDialog);
			}
			if (sDialogTab) {
				component._oDialog.open(sDialogTab);
			} else {
				component._oDialog.open();
			}

		},
		_handleCloseOpenedFragment: function (component) {
			component._oDialog.destroy();
			component._oDialog = null;
			component._oDialog = undefined;
		},

		_handleOpenPopOver: function (oEvent, component, _pQuickView, fragmentName, fragId) {
			var oButton = oEvent.getSource(),
				oView = component.getView();

			if (!component._pQuickView) {
				component._pQuickView = Fragment.load({
					id: fragId,
					name: fragmentName,
					controller: component
				}).then(function (oQuickView) {
					oView.addDependent(oQuickView);
					return oQuickView;
				});
			}
			component._pQuickView.then(function (oQuickView) {
				oQuickView.openBy(oButton);
			});
		},
		_filterSortingRequestTable: function (component, oTable, sValue, oSelectedSort, sortingMethod, oSelectedGroup, groupMethod) {
			// var filterNusNetId = new Filter("STAFF_NUSNET_ID", FilterOperator.Contains, sValue);
			// var filterFdluCode = new Filter("FDLU", FilterOperator.Contains, sValue);
			// var filterFdluText = new Filter("FDLU_T", FilterOperator.Contains, sValue);
			var filterFullName = new Filter("FULL_NM", FilterOperator.Contains, sValue);
			// var filterSfStfNumber = new Filter("SF_STF_NUMBER", FilterOperator.Contains, sValue);
			// var filterStfNumber = new Filter("STAFF_ID", FilterOperator.Contains, sValue);
			// var filterUluCode = new Filter("ULU", FilterOperator.Contains, sValue);
			// var filterUluText = new Filter("ULU_T", FilterOperator.Contains, sValue);
			// var filterClaimMonth = new Filter("CLAIM_MONTH", FilterOperator.Contains, sValue);
			// var filterClaimYear = new Filter("CLAIM_YEAR", FilterOperator.Contains, sValue);
			var filterSubmittedByNid = new Filter("SUBMITTED_BY_NID", FilterOperator.Contains, sValue);
			var filterClaimTypeText = new Filter("CLAIM_TYPE_T", FilterOperator.Contains, sValue);
			var filterRequestId = new Filter("REQUEST_ID", FilterOperator.Contains, sValue);
			var filterStatusAlias = new Filter("STATUS_ALIAS", FilterOperator.Contains, sValue);
			var filterRqstType = new Filter("PROCESS_TITLE", FilterOperator.Contains, sValue);

			var finalFilterGrp = new Filter({
				filters: [filterFullName, filterSubmittedByNid, filterClaimTypeText, filterRequestId,
					filterStatusAlias, filterRqstType
				],
				and: false
			});
			var oBinding = oTable.getBinding("items");
			oBinding.filter([finalFilterGrp], FilterType.Application); //apply the filter

			var aSorter = [];
			if (oSelectedGroup) {
				var groupColumn = oSelectedGroup.getProperty("key");
				aSorter.push(new Sorter({
					path: groupColumn,
					group: true,
					descending: groupMethod
				}));
			}

			//handling sorting mechanism
			var sortingColumn = oSelectedSort.getProperty("key");
			if (sortingColumn) {
				aSorter.push(new Sorter({
					path: sortingColumn,
					descending: sortingMethod
				}));
			}
			oBinding.sort(aSorter);
		},

		_fnLookupFilter: function (property, value) {
			var aFilter = [];
			aFilter.push(new Filter(property, FilterOperator.EQ, value));
			return aFilter;
		},

		retrieveLocations: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					"LOCATION"),
				function (oData) {
					component.AppModel.setProperty("/locations", oData.results);
				}.bind(this));
		},
		retrieveWorkTypes: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					"WORK_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/workTypes", oData.results);
				}.bind(this));
		},

		retrieveUnitType: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					"UNIT_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/unitTypes", oData.results);
				}.bind(this));
		},

		retrieveLevyDetails: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			var aFilters = [];
			aFilters.push([new Filter("REFERENCE_KEY", FilterOperator.EQ, "EXT_LEVY"),
				new Filter("REFERENCE_KEY", FilterOperator.EQ, "INT_LEVY")
			]);
			oClaimSrvModel.read(Config.dbOperations.cwsAppConfigs, {
				filters: aFilters,
				success: function (oData) {
					if (oData) {
						component.AppModel.setProperty("/levyList", oData.results);
					}
				}.bind(component),
				error: function (oError) {}
			});

		},

		retrieveRemunerationType: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					"REMUNERATION_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/remunerationList", oData.results);
				}.bind(this));
		},

		retrieveWaivers: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY", "WAIVER"),
				function (oData) {
					component.AppModel.setProperty("/waiverList", oData.results);
				}.bind(this));
		},

		retrieveSubmission: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					"SUBMISSION_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/submission", oData.results);
				}.bind(this));
		},

		retrieveStatus: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.statusConfig, oClaimSrvModel, component, this._fnLookupFilter("STATUS_TYPE",
					"OPWN"),
				function (oData) {
					component.AppModel.setProperty("/opwnStatus", oData.results);
				}.bind(this));
		},

		retrievePaymentType: function (component) {
			var oClaimSrvModel = component.getComponentModel("OfnReportSrvModel");
			Services.readLookups(Config.dbOperations.cwsAppConfigs, oClaimSrvModel, component, this._fnLookupFilter("REFERENCE_KEY",
					"PAYMENT_TYPE"),
				function (oData) {
					component.AppModel.setProperty("/paymentType", oData.results);
				}.bind(this));
		},

		_onPressSearchClaimRequest: function (sValue, component) {
			var filterNusNetId = new Filter("STAFF_NUSNET_ID", FilterOperator.Contains, sValue);
			var filterFdluCode = new Filter("FDLU", FilterOperator.Contains, sValue);
			var filterFdluText = new Filter("FDLU_T", FilterOperator.Contains, sValue);
			var filterFullName = new Filter("FULL_NM", FilterOperator.Contains, sValue);
			var filterSfStfNumber = new Filter("SF_STF_NUMBER", FilterOperator.Contains, sValue);
			var filterStfNumber = new Filter("STAFF_ID", FilterOperator.Contains, sValue);
			var filterUluCode = new Filter("ULU", FilterOperator.Contains, sValue);
			var filterUluText = new Filter("ULU_T", FilterOperator.Contains, sValue);
			var filterClaimMonth = new Filter("CLAIM_MONTH", FilterOperator.Contains, sValue);
			var filterClaimYear = new Filter("CLAIM_YEAR", FilterOperator.Contains, sValue);
			var filterSubmittedByNid = new Filter("SUBMITTED_BY_NID", FilterOperator.Contains, sValue);
			var filterClaimTypeText = new Filter("CLAIM_TYPE_T", FilterOperator.Contains, sValue);
			var filterRequestId = new Filter("REQUEST_ID", FilterOperator.Contains, sValue);
			var filterStatusAlias = new Filter("STATUS_ALIAS", FilterOperator.Contains, sValue);
			var isDisplay = new Filter("TO_DISPLAY", FilterOperator.EQ, "Y");

			var finalFilterGrp = new Filter({
				filters: [filterNusNetId, filterFdluCode, filterFdluText, filterFullName,
					filterSfStfNumber, filterStfNumber, filterUluCode,
					filterUluText, filterClaimMonth, filterClaimYear, filterSubmittedByNid, filterClaimTypeText, filterRequestId,
					filterStatusAlias, isDisplay
				],
				and: false
			});
			// var globalFiltersGrp = new Filter({
			// 	filters: component.GlobalFilterForTable,
			// 	and: false
			// });

			// var finalFilterGrp = new Filter({
			// 	filters: [globalFiltersGrp, filtersGrp],
			// 	and: true
			// });
			return [finalFilterGrp];
		},

		_fnOpenQuickViewForCA: function (component, serviceUrl) {
			component.AppModel.setProperty("/employeeInformation/pageId", component.AppModel.getProperty("/loggedInUserStfNumber"));
			component.AppModel.setProperty("/employeeInformation/FULL_NM", component.AppModel.getProperty("/loggedInUserInfo/displayName"));
			component.AppModel.setProperty("/employeeInformation/WORK_TITLE", "Claim Assistant (E-Claims)");
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, null, "GET", oHeaders, function (oData) {
				component.AppModel.setProperty("/employeeInformation/groups", [oData.getSource().getData()]);
			}.bind(component));
		},
		_fnOpenQuickViewForClaimant: function (component, serviceUrl, oDataModel) {
			var aFilter = [];
			aFilter.push(new Filter("NUSNET_ID", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserId").toString()));
			aFilter.push(new Filter("STF_NUMBER", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserStfNumber")));
			aFilter.push(new Filter("SF_STF_NUMBER", FilterOperator.EQ, component.AppModel.getProperty("/loggedInUserStfNumber")));
			var filters = new Filter({
				filters: aFilter,
				and: true
			});
			Services._readDataUsingOdataModel(serviceUrl, oDataModel, component, [filters], function (oData) {
				if (oData.results.length) {
					var isEntered = false;
					var sUluFdlu = "";
					for (var t = 0; t < oData.results.length; t++) {

						var objAssign = oData.results[t];
						if (new Date() >= new Date(objAssign.START_DATE) && new Date() <= new Date(objAssign.END_DATE)) {
							component.AppModel.setProperty("/employeeInformation/pageId", objAssign.STF_NUMBER);
							component.AppModel.setProperty("/employeeInformation/FULL_NM", objAssign.FULL_NM);
							component.AppModel.setProperty("/employeeInformation/WORK_TITLE", objAssign.WORK_TITLE);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/0/value", objAssign.COMPANY_T);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/2/value", objAssign.JOB_GRD_T + "(" + objAssign.JOB_GRD_C +
								")");
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/3/value", objAssign.EMAIL);
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/4/value", objAssign.EMP_CAT_T);

							if (isEntered) {
								sUluFdlu = sUluFdlu.concat("\n\n", objAssign.ULU_T).concat("(", objAssign.ULU_C).concat(") / ",
									objAssign.FDLU_T).concat("(", objAssign.FDLU_C).concat(")", "")
							} else {
								sUluFdlu = sUluFdlu.concat("", objAssign.ULU_T).concat("(", objAssign.ULU_C).concat(") / ",
									objAssign.FDLU_T).concat("(", objAssign.FDLU_C).concat(")", "")
							}
							isEntered = true;
							component.AppModel.setProperty("/employeeInformation/groups/0/elements/1/value", sUluFdlu);
						}
					}

					//	that.AppModel.setProperty("/employeeInformation/groups/0/elements/6/value", oData.results[0].EMP_GP_T);
				}
			}.bind(component));

		},
		_fnHandleStaffId: function (component) {
			var userRole = component.AppModel.getProperty("/userRole");
			if (userRole === "ESS") {
				return component.AppModel.getProperty("/loggedInUserId");
			}
			if (userRole === "CA") {
				// return component.AppModel.getProperty("/claimRequest/createClaimRequest/staffList/0/NUSNET_ID");
				return component.AppModel.getProperty("/loggedInUserId");
			} else {
				return component.AppModel.getProperty("/loggedInUserId");
			}

		},
		/*idleLogout: function (component) {
			var t;
			window.onload = resetTimer;
			window.onmousemove = resetTimer;
			// window.onmousedown = resetTimer; // catches touchscreen presses as well      
			// window.ontouchstart = resetTimer; // catches touchscreen swipes as well      
			// window.ontouchmove = resetTimer; // required by some devices 
			window.onclick = resetTimer; // catches touchpad clicks as well
			window.onkeydown = resetTimer;
			window.addEventListener('scroll',resetTimer , true); // improved; see comments

			function resetTimer() {
				
				clearTimeout(t);
				t = setTimeout(component._handleLogOut(), 30000); // time is in milliseconds
			}
		}*/
		handlingSession: function (component) {
			this.setIdleTimeout(15000, function () {}, function () {});
		},
		_fnSortingEclaimItemData: function (claimItems) {
			claimItems.sort(
				(objA, objB) => Number(new Date(objA.CLAIM_START_DATE)) - Number(new Date(objB.CLAIM_START_DATE)),
			);
			return claimItems;
		},

		setIdleTimeout: function (millis, onIdle, onUnidle) {
			var timeout = 0;
			startTimer();

			function startTimer() {
				timeout = setTimeout(onExpires, millis);
				document.addEventListener("mousemove", onActivity);
				document.addEventListener("keydown", onActivity);
				document.addEventListener("touchstart", onActivity);
			}

			function onExpires() {
				timeout = 0;
				onIdle();
			}

			function onActivity() {
				if (timeout) clearTimeout(timeout);
				else onUnidle();
				//since the mouse is moving, we turn off our event hooks for 1 second
				document.removeEventListener("mousemove", onActivity);
				document.removeEventListener("keydown", onActivity);
				document.removeEventListener("touchstart", onActivity);
				setTimeout(startTimer, 1000);
			}
		},
		_clearModelBeforeNavigationToClaimDetailView: function (component) {
			component.AppModel.setProperty("/claimRequest/createClaimRequest", AppConstant.claimRequest.createClaimRequest); //to clear before navigating to the next screens
			component.AppModel.setProperty("/claimRequest/selectedDates", AppConstant.claimRequest.selectedDates); //to clear before navigating to the next screens
			component.AppModel.setProperty("/claimRequest/disabledDates", AppConstant.claimRequest.disabledDates); //to clear before navigating to the next screens
			component.AppModel.setProperty("/enable/ClaimDetailView", AppConstant.enable.ClaimDetailView); //to clear before navigating to the next screens
			component.AppModel.setProperty("/visibility/ClaimDetailView", AppConstant.visibility.ClaimDetailView); //to clear before navigating to the next screens
		},
		_fnOnChangeofWbs: function (wbs, component) {
			if (wbs) {
				var wbsSet = [];
				var wbsSetItem = {};
				var saveObj = {};
				wbsSetItem.WBS = wbs;
				wbsSet.push(wbsSetItem);
				saveObj.WBSRequest = wbsSet;
				var oHeaders = this._headerToken(component);
				var serviceUrl = Config.dbOperations.checkWbs
				var wbsValidateModel = new json.JSONModel();
				wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);
				var wbsDetails = !wbsValidateModel.getData().EtOutput ? '' : wbsValidateModel.getData().EtOutput;
				return wbsDetails;
			}
			return false;
		},
		_fnSubmitClaim: function (component, callBackFx) {
			var serviceUrl = Config.dbOperations.postClaim;
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, component.aSaveObj, "POST", oHeaders, function (oData) {
				callBackFx(oData);
			}.bind(this));
		},
		_fnValidateClaim: function (component, callBackFx) {
			var serviceUrl = Config.dbOperations.validateClaim;
			var oHeaders = this._headerToken(component);
			Services._loadDataUsingJsonModel(serviceUrl, component.aSaveObj, "POST", oHeaders, function (oData) {
				callBackFx(oData);
			}.bind(this));
		},
		_fnCalculateTimeDifference: function (item) {
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
		},
		_fnCrossAppNavigationToInbox: function () {
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: "inbox",
					action: "Display"
				},
				params: {}
			})) || ""; // generate the Hash to display a Supplier
			// hash = hash + "&/taskdetail/" + project + "/" + objData.TASK_INST_ID + "/" + layout;
			hash = hash + "?navTo=cross"
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			}); // navigate to Supplier application
		},
		_fnSuccessDialog: function (component, sText, callBackFx) {
			if (!component.oSucessDialog) {
				component.oSucessDialog = new Dialog({
					type: "Message",
					title: "Success",
					state: "Success",
					titleAlignment: "Center",
					content: new Text({
						text: sText
					}),
					beginButton: new sap.m.Button({
						type: "Emphasized",
						text: "Ok",
						press: function () {
							component.oSucessDialog.close();
							component.oSucessDialog.destroy();
							component.oSucessDialog = null;
							component.oSucessDialog = undefined;
							return callBackFx();
						}.bind(this)
					})
				});
			}
			component.oSucessDialog.setEscapeHandler(function () {
				return;
			});
			component.oSucessDialog.open();
		},
		_fnGetWbs: function (component) {
			//fetch rate Type and rate Amount
			var stfNumber = component.AppModel.getProperty("/claimRequest/createClaimRequest/STF_NUMBER");
			var selectedDate = component.AppModel.getProperty("/claimRequest/createClaimRequest/minDateMonth");
			var oParameter = {
				staffId: stfNumber,
				claimDate: Formatter.formatDateAsString(selectedDate, "yyyy-MM-dd")
			};
			var that = this;
			var oHeaders = this._headerToken(component);
			var serviceUrl = Config.dbOperations.fetchWbs;
			Services._loadDataUsingJsonModel(serviceUrl, oParameter, "GET", oHeaders, function (oData) {
				component.AppModel.setProperty("/claimRequest/WbsDetail", oData.getSource().getData());
				that._fnGetWbsDesc(component, oData.getSource().getData(), that);
			}.bind(component));
		},

		_fnGetWbsDesc: function (component, aData, that) {
			//call WBS validate API 
			var oHeaders = that._headerToken(component);
			var wbsSet = [];
			var wbsSetItem = {};
			wbsSetItem.WBS = [];
			for (var t = 0; t < aData.length; t++) {

				wbsSetItem.WBS.push(aData[t].WBS);
			}

			var saveObj = {};
			saveObj.WBSRequest = wbsSetItem;
			var serviceUrl = Config.dbOperations.checkWbs;
			var wbsValidateModel = new json.JSONModel();
			wbsValidateModel.loadData(serviceUrl, JSON.stringify(saveObj), false, "POST", null, null, oHeaders);

			var aResponseWBS = [];
			for (var l = 0; l < wbsValidateModel.getData().EtOutput.item.length; l++) {
				var oItem = {};
				oItem.WBS = wbsValidateModel.getData().EtOutput.item[l].EvWbs;
				oItem.WBS_DESC = wbsValidateModel.getData().EtOutput.item[l].EvWbsdesc;
				aResponseWBS.push(oItem);
			}
			component.AppModel.setProperty("/claimRequest/WbsDetail", aResponseWBS);
			/*if (wbsValidateModel.getData().EtOutput.item.EvStatus === 'E') {
			} else {
			}*/
		},

		displayMonthPayment: function (str) {
			var oMonth = str.split(",");
			var month = Number(oMonth[0]);
			var year = oMonth[1];
			var monthNames = [
				"January", "February", "March", "April",
				"May", "June", "July", "August",
				"September", "October", "November", "December"
			];
			var i = Number(month - 1);
			return monthNames[i] + "-" + year;
		}

	});
	return utility;
}, true);