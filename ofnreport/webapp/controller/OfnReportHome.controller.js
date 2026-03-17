sap.ui.define([
	"../controller/BaseController", "../extensions/extendedvaluehelp", "sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"../utils/dataformatter", "sap/m/MessageToast", "sap/m/MessageBox", "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"../utils/services",
	"../utils/appconstant",
	"../model/models",
	"../utils/utility",
	"../utils/headerHelper",
	"../utils/configuration",
	"sap/ui/export/Spreadsheet",
	"sap/ui/export/library",
	"sap/m/Token"

], function (BaseController, ExtendedValueHelp, Fragment, JSONModel, Formatter, MessageToast, MessageBox, Filter,
	FilterOperator, Sorter, Services, AppConstant, models, Utility, HeaderHelper, Config, Spreadsheet, exportLibrary,
	Token) {
	"use strict";
	var EdmType = exportLibrary.EdmType;
	return BaseController.extend("nus.edu.sg.ofnreport.controller.OfnReportHome", {
		formatter: Formatter,
		isUpdateNeeded: true,

		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
			this._bDescendingSort = false;
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			this.initializeModel();

			var ofnCwNedTable = this.getView().byId("OfnCwNedRequestsTableId");
			this.oTemplate = ofnCwNedTable.getBindingInfo("items").template;
			ofnCwNedTable.unbindAggregation("items");

			var ofnOpwnTable = this.getView().byId("OfnOpwnRequestsTableId");
			this.oTemplateopwn = ofnOpwnTable.getBindingInfo("items").template;
			ofnOpwnTable.unbindAggregation("items");
		},

		initializeModel: function () {
			var oAppModel = this.setComponentModel("AppModel");
			oAppModel.setData(AppConstant);
			this.AppModel = oAppModel;
			this.getUserDetails();
		},
		getUserDetails: async function () {
			await Services.getUserInfoDetails(
				this,
				async function (userData) {
					var oRetData = userData.getUserDetails;
					if (oRetData && oRetData.staffInfo && oRetData.staffInfo.primaryAssignment && oRetData.staffInfo.primaryAssignment.STF_NUMBER) {
						// this.AppModel.setProperty("/token", oRetData.token);
						this.AppModel.setProperty("/loggedInUserInfo/userName", oRetData.staffInfo.primaryAssignment.STF_NUMBER);
						this.AppModel.setProperty("/oPrimaryData", oRetData);

						var aMatrixOfnAdmin = this.provisionOfnAdmins(oRetData.staffInfo.approverMatrix);
						this.AppModel.setProperty("/iscwofnvisible", Boolean(aMatrixOfnAdmin.find(oItem => oItem.PROCESS_CODE === "200" || oItem.PROCESS_CODE ===
							"201" || oItem.PROCESS_CODE === "202")));
						this.AppModel.setProperty("/isopwnofnvisible", Boolean(aMatrixOfnAdmin.find(oItem =>
							oItem.PROCESS_CODE === "203")));
						this.AppModel.setProperty("/oTabKey", Boolean(aMatrixOfnAdmin.find(oItem =>
							oItem.PROCESS_CODE === "203")) ? "opwn" : Boolean(aMatrixOfnAdmin.find(oItem => oItem.PROCESS_CODE === "200" || oItem.PROCESS_CODE ===
								"201" || oItem.PROCESS_CODE === "202")) ? "cw" : "");
						this.AppModel.setProperty("/OfnAdminProcessCode", aMatrixOfnAdmin);
						// this._fnLoadMetaData();
					}
					await this.retrieveAllLookups();
				}.bind(this)
			);
		},
		retrieveAllLookups: async function () {
			Utility.retrieveLocations(this);
			Utility.retrieveWorkTypes(this);
			Utility.retrieveUnitType(this);
			Utility.retrieveLevyDetails(this);
			Utility.retrieveRemunerationType(this);
			Utility.retrieveWaivers(this);
			Utility.retrieveSubmission(this);
			Utility.retrieveStatus(this);
			Utility.retrievePaymentType(this);
			this.handleValueHelpUlu(null, function () {
				this.fnCuttoffDate();
			}.bind(this));
			this.AppModel.setProperty("/oPMonth", false);

		},
		// _fnLoadMetaData: function () {
		// 	var serviceName = config.dbOperations.metadataClaims;
		// 	var token = this.AppModel.getProperty("/token");
		// 	var oHeaders = {
		// 		"Accept": "application/json",
		// 		"Authorization": "Bearer" + " " + token
		// 	};

		// 	var oDataModel = new ODataModel({
		// 		serviceUrl: serviceName,
		// 		headers: oHeaders
		// 	});
		// 	var that = this;
		// 	oDataModel.setUseBatch(false);
		// 	oDataModel.metadataLoaded().then(function () {
		// 		this.getOwnerComponent().setModel(oDataModel, "OfnReportSrvModel");
		// 		this.onClear();

		// 		Utility.retrieveLocations(this);
		// 		Utility.retrieveWorkTypes(this);
		// 		Utility.retrieveUnitType(this);
		// 		Utility.retrieveLevyDetails(this);
		// 		Utility.retrieveRemunerationType(this);
		// 		Utility.retrieveWaivers(this);
		// 		Utility.retrieveSubmission(this);
		// 		Utility.retrieveStatus(this);
		// 		Utility.retrievePaymentType(this);
		// 		this.handleValueHelpUlu(null, function () {
		// 			that.fnCuttoffDate();
		// 		});
		// 		// if (this.AppModel.getProperty("/oRState")) {
		// 		// this.fnCuttoffDate();
		// 		this.AppModel.setProperty("/oPMonth", false);
		// 		// this.AppModel.setProperty("/iscwofnvisible", true);
		// 		// this.AppModel.setProperty("/isopwnofnvisible", true);
		// 		// }
		// 	}.bind(this));
		// },

		fnCuttoffDate: function () {
			var CatalogSrvModel = this.getComponentModel("CatalogSrvModel");
			this.getUIControl("inpPaymentMonthOfn").removeAllTokens();
			var aFilters = [];
			aFilters.push([new Filter("CONFIG_KEY", FilterOperator.EQ, "CUTOFFDAY"),
			new Filter("PROCESS_CODE", FilterOperator.EQ, "203")
			]);
			CatalogSrvModel.read(Config.dbOperations.appConfigs, {
				filters: aFilters,
				success: function (oData) {
					if (oData && oData.results) {
						var cuttoffday = oData.results[0].CONFIG_VALUE;
						var oDate = new Date();
						var oDay = oDate.getDate();
						if (oDay > parseInt(cuttoffday)) {
							var month = oDate.getMonth() + 1;
							var formattedMonth = (month < 10) ? '0' + month : month;
							var oValue = formattedMonth + "/" + oDate.getFullYear();
						} else {
							var month = oDate.getMonth();
							month = month === 0 ? "12" : month;
							var formattedMonth = (month < 10) ? '0' + month : month;
							var oValue = formattedMonth + "/" + oDate.getFullYear();
						}
						this.getUIControl("inpPaymentMonthOfn").addToken(new Token({
							text: this.formatDate(oValue),
							key: oValue
						}));
						this.onPressGoRetrieveRequests();
					}
				}.bind(this),
				error: function (oError) { }
			});
		},

		generateMonthArray: function () {
			var currentDate = new Date();
			var currentDay = currentDate.getDate();
			var currentMonth = currentDate.getMonth() + 1; // Note: Months are zero-indexed in JavaScript
			var currentYear = currentDate.getFullYear();

			// If the current day is above the 5th, include the current month
			var startMonth = currentDay > 5 ? currentMonth : currentMonth - 1;
			var result = [];

			// Generate the array with the selected months
			for (var i = 0; i < 6; i++) {
				var month = (startMonth + i - 1) % 12 + 1; // Ensure the month is in the range 1-12

				// Handle the case when month goes below 1
				month = month <= 0 ? month + 12 : month;

				var yearOffset = Math.floor((startMonth + i - 1) / 12);

				var formattedMonth = month < 10 ? "0" + month : "" + month;
				var formattedYear = currentYear - yearOffset;

				result.push({
					"Month": formattedMonth + "/" + formattedYear
				});
			}
			return result.reverse();
		},

		// generateTokenForLoggedInUser: function () {
		// 	Services.fetchLoggedUserToken(this, function (oRetData) {
		// 		this.AppModel.setProperty("/token", oRetData.token);
		// 		this.AppModel.setProperty("/loggedInUserInfo/userName", oRetData.staffInfo.primaryAssignment.STF_NUMBER);
		// 		this.AppModel.setProperty("/oPrimaryData", oRetData);

		// 		var aMatrixOfnAdmin = this.provisionOfnAdmins(oRetData.staffInfo.approverMatrix);
		// 		this.AppModel.setProperty("/iscwofnvisible", Boolean(aMatrixOfnAdmin.find(oItem => oItem.PROCESS_CODE === "200" || oItem.PROCESS_CODE ===
		// 			"201" || oItem.PROCESS_CODE === "202")));
		// 		this.AppModel.setProperty("/isopwnofnvisible", Boolean(aMatrixOfnAdmin.find(oItem =>
		// 			oItem.PROCESS_CODE === "203")));
		// 		this.AppModel.setProperty("/oTabKey", Boolean(aMatrixOfnAdmin.find(oItem =>
		// 			oItem.PROCESS_CODE === "203")) ? "opwn" : Boolean(aMatrixOfnAdmin.find(oItem => oItem.PROCESS_CODE === "200" || oItem.PROCESS_CODE ===
		// 				"201" || oItem.PROCESS_CODE === "202")) ? "cw" : "");
		// 		this.AppModel.setProperty("/OfnAdminProcessCode", aMatrixOfnAdmin);
		// 		this._fnLoadMetaData();
		// 	}.bind(this));
		// },
		provisionOfnAdmins: function (assignList) {
			const aMatrixOfnAdmin = [];
			assignList.forEach(item => {
				if (item.STAFF_USER_GRP === 'OFN_ADMIN' &&
					!aMatrixOfnAdmin.some(existing => existing.PROCESS_CODE === item.PROCESS_CODE)) {
					aMatrixOfnAdmin.push(item);
				}
			});
			return aMatrixOfnAdmin;
		},

		/* Filter 1 - Request Type */
		handleRequestTypeValueHelp: function (oEvt) {
			this.AppModel.setProperty("/iscwofnvisible", false);
			this.AppModel.setProperty("/isopwnofnvisible", false);
			var oDataModel = this.getComponentModel("CatalogSrvModel");
			// var oCont = this.AppModel.getProperty("/oSelectedProf");
			var aFilters = [],
				that = this,
				OfnAdminProcessCode = this.AppModel.getProperty("/OfnAdminProcessCode");
			aFilters.push(new Filter("REFERENCE_KEY", FilterOperator.EQ, "EXT"),
				new Filter("REFERENCE_KEY", FilterOperator.EQ, "INT")
			);
			OfnAdminProcessCode.forEach(function (oItem) {
				aFilters.push(new Filter("REFERENCE_VALUE", FilterOperator.EQ, oItem.PROCESS_CODE));
			}.bind(this));
			oDataModel.read(Config.dbOperations.cwsAppConfigs, {
				filters: aFilters,
				success: function (oData) {
					if (oData) {
						// that.AppModel.setProperty("/claimRequest/claimTypeList", oData.results);

						var filteredArray = oData.results;
						$.each(filteredArray, function (i, value) {
							filteredArray[i].Selected = false;
						});
						var oClaims = that.getUIControl("inpRqstTypeValueHelp").getTokens();
						// that.handleSearch(that.getUIControl("idClaimTypeSelectionDialog"), 'CONFIG_KEY', 'CONFIG_VALUE', 'N');
						if (oClaims && oClaims.length > 0) {
							filteredArray.forEach(function (item1) {
								var matchingItem = oClaims.find(function (item2) {
									return item1.CONFIG_KEY === item2.getProperty("key")
								});

								if (matchingItem) {
									item1.Selected = true;
								}
							});
						}
						that.AppModel.setProperty("/lkSelection/requestTypeList", filteredArray);
						if (oEvt) {
							var oView = that.getView();
							if (!that._oDialogAddClaimType) {
								that._oDialogAddClaimType = Fragment.load({
									id: oView.getId(),
									name: "nus.edu.sg.ofnreport.view.subview.RequestTypeValueHelpDialog",
									controller: that
								}).then(function (oDialog) {
									oView.addDependent(oDialog);
									return oDialog;
								});
							}
							that._oDialogAddClaimType.then(function (oDialog) {
								oDialog.setRememberSelections(false);
								oDialog.open();
							}.bind(this));
						}
					}
				},
				error: function (oError) {

				}
			});
		},

		handleConfirmClaimType: function (oEvent) {
			this.getUIControl("inpRqstTypeValueHelp").removeAllTokens();
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				this.AppModel.setProperty("/isopwnofnvisible", false);
				this.AppModel.setProperty("/iscwofnvisible", false);
				this.AppModel.setProperty("/oPMonth", false);
				for (var i = 0; i < aContexts.length; i++) {
					var sPath = aContexts[i].getPath();
					var obj = this.AppModel.getProperty(sPath);
					if (obj.CONFIG_KEY === "OPWN") {
						this.AppModel.setProperty("/oTabKey", "opwn");
						this.AppModel.setProperty("/isopwnofnvisible", true);
					}

					if (obj.CONFIG_KEY !== "OPWN") {
						this.AppModel.setProperty("/oTabKey", "cw");
						this.AppModel.setProperty("/iscwofnvisible", true);
					}

					if (this.AppModel.getProperty("/isopwnofnvisible") && aContexts.length === 1) {
						this.AppModel.setProperty("/oPMonth", true);
					}

					// if (!this.AppModel.getProperty("/isopwnofnvisible")) {
					// 	this.getUIControl("inpPaymentMonthOfn").removeAllTokens();
					//}
					var newToken = new Token({
						text: obj.CONFIG_VALUE,
						key: obj.CONFIG_KEY,
						customData: {
							key: "REFERENCE_VALUE",
							value: obj.REFERENCE_VALUE
						}
					});

					this.getUIControl("inpRqstTypeValueHelp").addToken(newToken);
					this.getUIControl("inpUluValueHelp").removeAllTokens();
				}
			}
		},

		/* Filter 5 - Utilization Year */
		handleUtilizationYr: function () {
			var currentDate = new Date();
			var months = [];
			for (var i = 17; i >= 1; i--) {
				var lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
				var formattedLastMonth = new Intl.DateTimeFormat('en-US', {
					year: 'numeric',
					month: '2-digit'
				}).format(lastMonth);
				months.push({
					"Month": formattedLastMonth,
					"Selected": false
				});
			}

			var currentMonth = new Intl.DateTimeFormat('en-US', {
				year: 'numeric',
				month: '2-digit'
			}).format(currentDate);
			months.push({
				"Month": currentMonth
			});

			var oMonth = this.getUIControl("inpPaymentMonthOfn").getTokens();
			// that.handleSearch(that.getUIControl("idClaimTypeSelectionDialog"), 'CONFIG_KEY', 'CONFIG_VALUE', 'N');
			if (oMonth && oMonth.length > 0) {
				months.forEach(function (item1) {
					var matchingItem = oMonth.find(function (item2) {
						return item1.Month === item2.getProperty("key")
					});

					if (matchingItem) {
						item1.Selected = true;
					}
				});
			}

			this.AppModel.setProperty("/lkSelection/MonthList", months.reverse());
			var oView = this.getView();

			if (!this._oDialogUtilization) {
				this._oDialogUtilization = Fragment.load({
					id: oView.getId(),
					name: "nus.edu.sg.ofnreport.view.subview.UtilizationYear",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._oDialogUtilization.then(function (oDialog) {
				oDialog.setRememberSelections(true);
				oDialog.open();
			});
		},

		onTokenUpdateYear: function (oEvent) {
			this.getUIControl("inpPaymentMonthOfn").removeAllTokens();
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				for (var i = 0; i < aContexts.length; i++) {
					var sPath = aContexts[i].getPath();
					var objYear = this.AppModel.getProperty(sPath);
					this.getUIControl("inpPaymentMonthOfn").addToken(new Token({
						text: this.formatDate(objYear.Month),
						key: objYear.Month
					}));
				}
			}
		},

		formatDate: function (inputDate) {
			var parts = inputDate.split('/');
			var month = parseInt(parts[0], 10);
			var year = parseInt(parts[1], 10);

			// Create a Date object to get the month name
			var date = new Date(year, month - 1, 1);
			var monthName = date.toLocaleString('en-us', {
				month: 'short'
			});
			var formattedDate = monthName + ', ' + year;

			return formattedDate;
		},

		handleUtyear: function (oEvent) {
			var aFilters = [];
			var sQuery = oEvent.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
				var filter = new Filter("staffId", FilterOperator.Contains, sQuery),
					filter1 = new Filter("fullName", FilterOperator.Contains, sQuery),
					filter2 = new Filter("year", FilterOperator.Contains, sQuery);
				var oFilters = new Filter({
					filters: [
						filter,
						filter1,
						filter2
					],
					and: false
				});
			}
			// UPDATE LIST BINDING 
			var list = this.getView().byId('staffList');
			var binding = list.getBinding("items");
			binding.filter(oFilters);
		},

		/* Filter 6 - ULU */
		handleValueHelpUlu: function (oEvent, initialCallBack) {
			//changed the logic of ULU and FDLU search help 
			var oDataModel = this.getComponentModel("CatalogSrvModel");
			var oLogData = this.AppModel.getProperty("/oPrimaryData/staffInfo");

			var oSelectedReqTypes = this.getUIControl("inpRqstTypeValueHelp").getTokens();
			var aFilters = [],
				dynamicFilters = [],
				orFilters = [];
			aFilters.push(new Filter("STAFF_ID", FilterOperator.EQ, oLogData.STAFF_ID));
			aFilters.push(new Filter("STAFF_USER_GRP", FilterOperator.EQ, "OFN_ADMIN"));

			if (oSelectedReqTypes && oSelectedReqTypes.length > 0) {
				for (var i = 0; i < oSelectedReqTypes.length; i++) {
					orFilters.push(new Filter("CLAIM_TYPE", FilterOperator.EQ, oSelectedReqTypes[i].data("REFERENCE_VALUE")));
				}
				dynamicFilters.push(new Filter(orFilters, false));
			}
			dynamicFilters.push(new Filter(aFilters, true));
			var that = this;
			oDataModel.read(Config.dbOperations.approverMatrixView, {
				filters: [dynamicFilters],
				success: function (oData) {
					if (oData) {
						//to remove ULU duplicates					
						var uluList = [];
						var isUluRepeated;
						for (var i = 0; i < oData.results.length; i++) {
							var item = oData.results[i];
							var uluListItem = {};
							if (item.ULU === '') {
								continue;
							}
							uluListItem.ULU_C = item.ULU;
							uluListItem.ULU_T = item.ULU_T;
							isUluRepeated = '';
							if (i > 0) {
								for (var j = 0; j < uluList.length; j++) {
									if (item.ULU === uluList[j].ULU_C) {
										isUluRepeated = 'Y';
										break;
									}
								}
								if (isUluRepeated !== 'Y') {
									uluList.push(uluListItem);
								}
							} else {
								uluList.push(uluListItem);
							}
						}

						$.each(uluList, function (i, value) {
							uluList[i].Selected = false;
						});
						var oULU = that.getUIControl("inpUluValueHelp").getTokens();
						// that.handleSearch(that.getUIControl("idClaimTypeSelectionDialog"), 'CONFIG_KEY', 'CONFIG_VALUE', 'N');
						if (oULU && oULU.length > 0) {
							uluList.forEach(function (item1) {
								var matchingItem = oULU.find(function (item2) {
									return item1.ULU_C === item2.getProperty("key")
								});

								if (matchingItem) {
									item1.Selected = true;
								}
							});
						}

						that.AppModel.setProperty("/lkSelection/UluList", uluList);
						var oView = that.getView();
						if (oEvent) {
							if (!that._oDialogAddUlu) {
								that._oDialogAddUlu = Fragment.load({
									id: oView.getId(),
									name: "nus.edu.sg.ofnreport.view.subview.UluValueHelpDialog",
									controller: that
								}).then(function (oDialog) {
									oView.addDependent(oDialog);
									return oDialog;
								});
							}

							that._oDialogAddUlu.then(function (oDialog) {
								oDialog.setRememberSelections(false);
								oDialog.open();
							}.bind(this));
						}

						//Called Upon Initial Loading of OFN Report Application
						initialCallBack();
					}
				},
				error: function (oError) {

				}
			});
		},

		handleConfirmUlu: function (oEvent) {
			this.getUIControl("inpUluValueHelp").removeAllTokens();
			var aContexts = oEvent.getParameter("selectedContexts");
			if (aContexts && aContexts.length) {
				for (var i = 0; i < aContexts.length; i++) {
					var sPath = aContexts[i].getPath();
					var objSelectedUlu = this.AppModel.getProperty(sPath);
					this.getUIControl("inpUluValueHelp").addToken(new Token({
						text: objSelectedUlu.ULU_C === "ALL" ? "ALL" : objSelectedUlu.ULU_T,
						key: objSelectedUlu.ULU_C
					}));
				}
			}
		},

		handleSearch: function (oEvent, key1, key2, val) {
			var oBinding = "";
			if (oEvent && val == "X") {
				var sValue = oEvent.getParameter("value");
				var oFilter = [];
				oBinding = oEvent.getSource().getBinding("items");
			} else {
				val = "";
				oBinding = oEvent;
			}
			if (!!sValue && sValue !== "") {
				var oFilter1 = new Filter(key1, FilterOperator.Contains, sValue),
					oFilter2 = new Filter(key2, FilterOperator.Contains, sValue),
					oFilter = new Filter([oFilter1, oFilter2], false);
			} else {
				oFilter = "";
			}
			oBinding.filter([oFilter]);
		},

		handleSearch1: function (oEvent, key) {
			var sValue = oEvent.getParameter("value");
			var oFilter = new Filter(key, FilterOperator.Contains, sValue);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter([oFilter]);
		},

		/* Filter Search with GO btn */

		onSelectIconFilters: function (oEvent) {
			var key = oEvent ? oEvent.getSource().getSelectedKey() : this.AppModel.getProperty("/oTabKey");
			if (key === "opwn") {
				var oFilter = new Filter("REQUEST_TYPE", FilterOperator.EQ, "OPWN");
				var oBinding = this.getUIControl("OfnOpwnRequestsTableId").getBinding("items");
				oBinding.filter([oFilter]);
			} else {
				var oFilter1 = new Filter("REQUEST_TYPE", FilterOperator.EQ, "CWS"),
					oFilter2 = new Filter("REQUEST_TYPE", FilterOperator.EQ, "NED"),
					oFilter3 = new Filter("REQUEST_TYPE", FilterOperator.EQ, "INT_CWS"),
					oFilter = new Filter([oFilter1, oFilter2, oFilter3], false);
				var oBinding = this.getUIControl("OfnCwNedRequestsTableId").getBinding("items");
				oBinding.filter([oFilter]);
			}
		},

		onUpdateFinished: function (oEvent) {
			var oBinding = oEvent.getSource().getBinding("items");
			var iTotalCount = oBinding.getLength();
			this.AppModel.setProperty("/CWNED_Count", iTotalCount);
		},

		onUpdateFinishedopwn: function (oEvent) {
			var oBinding = oEvent.getSource().getBinding("items");
			var iTotalCount = oBinding.getLength();
			this.AppModel.setProperty("/OPWN_Count", iTotalCount);
		},

		onPressGoRetrieveRequests: function (oEvent) {
			this.AppModel.setProperty("/iscwofnvisible", false);
			this.AppModel.setProperty("/isopwnofnvisible", false);
			this.AppModel.setProperty("/aSearchFilter", []); //Added on 13 March to avoid showing results without any filters
			this.searchFilter();
			var aFilter = this.AppModel.getProperty("/aSearchFilter");
			var oMonthYear = this.getUIControl("inpPaymentMonthOfn").getTokens();

			if (oEvent) {
				this._fnSaveState();
				var tabKey = this.AppModel.getProperty("/oTabKey");
				this.AppModel.setProperty("/oSelectedSection", tabKey);

				if (oMonthYear.length === 0) {
					MessageBox.error("Please select Payment Month.");
					return;
				}
			}

			// var sFilter = new Filter([
			// 	new Filter("TO_DISPLAY", FilterOperator.EQ, "Y")
			// ], true);

			var oFilters = new Filter({
				filters: [
					new Filter("REQUEST_STATUS", FilterOperator.EQ, "38"),
					new Filter("REQUEST_STATUS", FilterOperator.EQ, "48")
				],
				and: false
			});
			aFilter.push(new Filter(oFilters, true));
			// aFilter.push(new Filter(sFilter, true));
			this.fnLoadTable(aFilter);

		},

		fnLoadTable: function (aFilter) {
			var orFilter, opwnAndFilter = aFilter,
				sFilter = aFilter;
			if (this.AppModel.getProperty("/isopwnofnvisible")) {
				this.getView().setBusy(true);
				orFilter = [new Filter("REQUEST_TYPE", FilterOperator.EQ, "OPWN"),
				new Filter("MIGRATED", FilterOperator.EQ, "")
				];
				if (opwnAndFilter.aFilters) {
					aFilter.aFilters.push(new Filter(orFilter, true));
				} else {
					opwnAndFilter.push(new Filter(orFilter, true));
				}

				// //Amend ULU Filters on Staff ULU for OPWN Request
				// var gatherFilterUlus = this.AppModel.getProperty("/gatherFilterUlus");
				// if (gatherFilterUlus instanceof Array && gatherFilterUlus.length > 0) {
				// 	 orFilter = [];
				// 	jQuery.sap.each(gatherFilterUlus, function (i, uluElement) {
				// 		orFilter.push(new Filter("FACULTY_C", FilterOperator.EQ, uluElement));
				// 	});
				// 	opwnAndFilter.push(new Filter(orFilter, false));
				// }

				var orFilter = [],
					rMonthYearTokens = [];
				var oMonthYear = this.getUIControl("inpPaymentMonthOfn").getTokens();
				if (oMonthYear && oMonthYear.length > 0) {
					for (var i = 0; i < oMonthYear.length; i++) {
						var oKey = (oMonthYear[i].getProperty("key")).split("/");
						var filter = new Filter("CwsPaymentsDetails/MONTH", FilterOperator.EQ, oKey[0]),
							filter1 = new Filter("CwsPaymentsDetails/YEAR", FilterOperator.EQ, oKey[1]),
							filter2 = new Filter("CwsPaymentsDetails/PAYMENT_REQ_STATUS", FilterOperator.EQ, "54"),
							filter3 = new Filter("CwsPaymentsDetails/IS_DELETED", FilterOperator.EQ, "N");
						var oFilters = new Filter({
							filters: [
								filter,
								filter1,
								filter2,
								filter3
							],
							and: true
						});
					}
					orFilter.push(oFilters);
					opwnAndFilter.push(new Filter(orFilter, false));
				}

				var oOfnOpwnReqTable = this.getView().byId("OfnOpwnRequestsTableId");
				oOfnOpwnReqTable.bindItems({
					path: "OfnReportSrvModel>" + Config.dbOperations.cwsRequestViewApi,
					template: this.oTemplateopwn,
					sorter: new Sorter({
						path: "REQUEST_ID",
						descending: true
					}),
					filters: opwnAndFilter,
					parameters: {
						"expand": "CwsPaymentsDetails"
					},
					events: {
						dataReceived: function (oEvent) {
							this.getView().setBusy(false);
							this.fnLoadCW(sFilter);
						}.bind(this)
					}
				});
				// this.AppModel.setProperty("/oTabKey", "opwn");
				oOfnOpwnReqTable.setVisible(true);
				opwnAndFilter = [];
			} else {
				this.fnLoadCW(sFilter);
			}

		},

		fnLoadCW: function (sFilter) {
			if (this.AppModel.getProperty("/iscwofnvisible")) {
				this.getView().setBusy(true);
				var orFilter = [new Filter("REQUEST_TYPE", FilterOperator.NE, "OPWN")];
				if (sFilter.aFilters) {
					if (this.AppModel.getProperty("/isopwnofnvisible")) {
						sFilter.aFilters.splice(sFilter.aFilters.length - 1, 1);
						sFilter.aFilters.splice(sFilter.aFilters.length - 1, 1);
					}
					sFilter.aFilters.push(new Filter(orFilter, true));
				} else {
					if (this.AppModel.getProperty("/isopwnofnvisible")) {
						sFilter.splice(sFilter.length - 1, 1);
						sFilter.splice(sFilter.length - 1, 1);
					}
					sFilter.push(new Filter(orFilter, true));
				}
				var oMonthYear = this.getUIControl("inpPaymentMonthOfn").getTokens();

				if (oMonthYear && oMonthYear.length > 0) {
					var orFilter = [],
						rMonthYearTokens = [];
					for (var i = 0; i < oMonthYear.length; i++) {
						var oKey = (oMonthYear[i].getProperty("key")).split("/");
						var oFirstDay = new Date(Date.UTC(oKey[1], Number(oKey[0] - 1), 1, 0, 0, 0));
						var oLastDay = new Date(Date.UTC(oKey[1], Number(oKey[0]), 0, 23, 59, 59));
						var pFilter = new Filter("CwsPaymentsDetails/PAYMENT_TYPE", FilterOperator.EQ, "R"),
							filter = new Filter("CwsPaymentsDetails/MODIFIED_ON", FilterOperator.GE, oFirstDay),
							filter1 = new Filter("CwsPaymentsDetails/MODIFIED_ON", FilterOperator.LE, oLastDay),
							filter2 = new Filter("CwsPaymentsDetails/IS_DELETED", FilterOperator.EQ, "N");

						var oFilters = new Filter({
							filters: [
								pFilter,
								filter,
								filter1,
								filter2
							],
							and: true
						});
						orFilter.push(oFilters);
					}
					sFilter.push(new Filter(orFilter, false));
				}

				var oOfnCwNedReqTable = this.getView().byId("OfnCwNedRequestsTableId");
				oOfnCwNedReqTable.bindItems({
					path: "OfnReportSrvModel>" + Config.dbOperations.cwsRequestViewApi,
					template: this.oTemplate,
					sorter: new Sorter({
						path: "REQUEST_ID",
						descending: true
					}),
					filters: sFilter,
					parameters: {
						"expand": "CwsPaymentsDetails"
					},
					events: {
						dataReceived: function (oEvent) {
							this.getView().setBusy(false);
						}.bind(this)
					}
				});
				// this.AppModel.setProperty("/oTabKey", "cw");

				oOfnCwNedReqTable.setVisible(true);
				sFilter = [];
			}
		},
		getPayMonthInReadableFormat: function () {
			var payMonthStr = "";
			var oMonthYear = this.getUIControl("inpPaymentMonthOfn").getTokens();
			if (oMonthYear && oMonthYear.length > 0) {
				for (var i = 0; i < oMonthYear.length; i++) {
					var oKey = (oMonthYear[i].getProperty("key")).split("/");
					payMonthStr += Utility.displayMonthPayment(oKey[0] + "," + oKey[1]);
				}
			}
			return payMonthStr;
		},

		// format ofn work report

		framePayMonth: function (modelObj, paymentData, bindingProp) {
			var oDataModel = this.getComponentModel("OfnReportSrvModel");
			var that = this,
				tempMap = {};
			var cnt = 0;

			var aFilter, workDetails = "";
			var oMonthYear = this.getUIControl("inpPaymentMonthOfn").getTokens();
			if (oMonthYear && oMonthYear.length > 0) {
				for (var i = 0; i < oMonthYear.length; i++) {
					var oKey = (oMonthYear[i].getProperty("key")).split("/");
					workDetails += Utility.displayMonthPayment(oKey[0] + "," + oKey[1]);

					//Filter Logic for OData Service Trigger
					// var filter = new Filter("MONTH", FilterOperator.EQ, oKey[0]),
					// 	filter1 = new Filter("YEAR", FilterOperator.EQ, oKey[1]),
					// 	filter2 = new Filter("PAYMENT_REQ_STATUS", FilterOperator.EQ, "54"),
					// 	filter3 = new Filter("IS_DELETED", FilterOperator.EQ, "N");
					// aFilter = new Filter({
					// 	filters: [
					// 		filter,
					// 		filter1,
					// 		filter2,
					// 		filter3
					// 	],
					// 	and: true
					// });
				}
			}
			modelObj[bindingProp] = workDetails;

			// var paymentLength = paymentData.length;
			// Payment Logic to retrieve from OData Service
			// jQuery.sap.each(paymentData, function (i, value) {
			// 	oDataModel.read("/" + value, {
			// 		filters : [aFilter],
			// 		urlParameters: {
			// 			"$select": "MONTH,YEAR"
			// 		},
			// 		success: function (oData) {
			// 			cnt++;
			// 			tempMap[oData.MONTH] = oData.YEAR;
			// 			if (cnt === paymentLength) {
			// 				that.extractWorkDetails(modelObj, bindingProp, tempMap);
			// 			}
			// 		}
			// 	})
			// });

		},
		// extractWorkDetails: function (modelObj, bindingProp, monthMap) {
		// 	var workDetails = "";
		// 	var that = this;
		// 	jQuery.sap.each(monthMap, function (tK, tV) {
		// 		workDetails += that.displayMonthPayment(tK + "," + tV) + ";";
		// 	});
		// 	workDetails = workDetails.substring(0, workDetails.length - 1);
		// 	modelObj[bindingProp] = workDetails;
		// },

		empSearchFilter: function () {
			var userRoleGrp = this.AppModel.getProperty("/oSelectedProf"); //Super Admin
			var staffId = this.AppModel.getProperty("/loggedInUserInfo/userName");
			var oClaimType = this.AppModel.getProperty("/claimRequest/claimTypeList");
			var aFilter = [],
				andFilter = [];

			var sFilter = new Filter([
				new Filter("TO_DISPLAY", FilterOperator.EQ, "Y"),
				new Filter("REQUEST_STATUS", FilterOperator.NE, "31")
			], true);

			aFilter.push(new Filter(sFilter, true));
			return aFilter;
		},

		searchFilter: function (oEvent) {
			var aMatrixOfnAdmin = this.provisionOfnAdmins(this.AppModel.getProperty("/oPrimaryData/staffInfo/approverMatrix"));
			var staffId = this.AppModel.getProperty("/loggedInUserInfo/userName");
			var selectedItemsUlu = this.getUIControl("inpUluValueHelp").getTokens();
			var oClaimType = this.AppModel.getProperty("/claimRequest/claimTypeList");

			var claimTypeCode = this.getUIControl("inpRqstTypeValueHelp").getTokens();
			var claimType = this.AppModel.getProperty("/claimType");
			var oMonthYear = this.getUIControl("inpPaymentMonthOfn").getTokens();
			var ulu = this.AppModel.getProperty("/uluSelectedCode");
			var uluName = this.AppModel.getProperty("/uluSelected");

			var submittedBy = this.AppModel.getProperty("/submittedById");
			var submittedByName = this.AppModel.getProperty("/submittedByName");

			var aFilter = [];
			var andFilter = [];
			//02,03,04,05,06,08
			if (!!claimTypeCode && claimTypeCode.length > 0) {
				this.AppModel.setProperty("/iscwofnvisible", false);
				this.AppModel.setProperty("/isopwnofnvisible", false);
				var orFilter = [],
					rClaimCode = [];
				for (var i = 0; i < claimTypeCode.length; i++) {
					if (claimTypeCode[i].getProperty("key") === "OPWN") {
						this.AppModel.setProperty("/oTabKey", "opwn");
						this.AppModel.setProperty("/isopwnofnvisible", true);
					} else {
						this.AppModel.setProperty("/oTabKey", "cw");
						this.AppModel.setProperty("/iscwofnvisible", true);
					}
					rClaimCode.push({
						"CONFIG_KEY": claimTypeCode[i].getProperty("key"),
						"CONFIG_VALUE": claimTypeCode[i].getProperty("text")
					});
					orFilter.push(new Filter("REQUEST_TYPE", FilterOperator.EQ, claimTypeCode[i].getProperty("key")));
				}
				this.AppModel.setProperty("/rClaimType", rClaimCode);
				andFilter.push(new Filter(orFilter, false));
			} else {
				this.AppModel.setProperty("/iscwofnvisible", Boolean(aMatrixOfnAdmin.find(oItem => oItem.PROCESS_CODE === "200" || oItem.PROCESS_CODE ===
					"201" || oItem.PROCESS_CODE === "202")));
				this.AppModel.setProperty("/isopwnofnvisible", Boolean(aMatrixOfnAdmin.find(oItem =>
					oItem.PROCESS_CODE === "203")));
				this.AppModel.setProperty("/oTabKey", Boolean(aMatrixOfnAdmin.find(oItem =>
					oItem.PROCESS_CODE === "203")) ? "opwn" : Boolean(aMatrixOfnAdmin.find(oItem => oItem.PROCESS_CODE === "200" || oItem.PROCESS_CODE ===
						"201" || oItem.PROCESS_CODE === "202")) ? "cw" : "");
				this.AppModel.setProperty("/rClaimType", []);
			}
			if (!!selectedItemsUlu && selectedItemsUlu.length > 0) {
				var orFilter = [],
					key = "",
					ruluTokens = [],
					isAllValue = false;
				for (var i = 0; i < selectedItemsUlu.length; i++) {
					// orFilter.push(new Filter("ULU", FilterOperator.EQ, selectedItemsUlu[i].getProperty("key")));
					orFilter.push(new Filter("ULU_C", FilterOperator.EQ, selectedItemsUlu[i].getProperty("key")));
					orFilter.push(new Filter("FACULTY_C", FilterOperator.EQ, selectedItemsUlu[i].getProperty("key")));
					orFilter.push(new Filter("ULU", FilterOperator.EQ, selectedItemsUlu[i].getProperty("key")));

					ruluTokens.push({
						"ULU_C": selectedItemsUlu[i].getProperty("key"),
						"ULU_T": selectedItemsUlu[i].getProperty("text")
					});

					// gatherFilterUlus.push(selectedItemsUlu[i].getProperty("key"));

					if (selectedItemsUlu[i].getProperty("key") === "ALL") {
						isAllValue = true;
					}

				}
				if (!isAllValue) {
					this.AppModel.setProperty("/rulus", ruluTokens);
					andFilter.push(new Filter(orFilter, false));

				}
			} else {
				var oULU = this.AppModel.getProperty("/lkSelection/UluList");
				var orFilter = [],
					key = "",
					ruluTokens = [],
					isAllValue = false;
				if (oULU) {
					for (var i = 0; i < oULU.length; i++) {
						orFilter.push(new Filter("ULU_C", FilterOperator.EQ, oULU[i].ULU_C));
						orFilter.push(new Filter("FACULTY_C", FilterOperator.EQ, oULU[i].ULU_C));
						orFilter.push((new Filter("ULU", FilterOperator.EQ, oULU[i].ULU_C)));

						ruluTokens.push({
							"ULU_C": oULU[i].ULU_C,
							"ULU_T": oULU[i].ULU_T
						});
						if (oULU[i].ULU_C === "ALL") {
							isAllValue = true;
						}

						// gatherFilterUlus.push(oULU[i].ULU_C);
					}
					if (!isAllValue) {
						this.AppModel.setProperty("/rulus", ruluTokens);
						andFilter.push(new Filter(orFilter, false));

					}
				}
			}

			if (!!oMonthYear && oMonthYear.length > 0) {
				var orFilter = [],
					rMonthYearTokens = [];
				for (var i = 0; i < oMonthYear.length; i++) {
					rMonthYearTokens.push({
						"Month": oMonthYear[i].getProperty("key")
					});
				}
				this.AppModel.setProperty("/rMonthYear", rMonthYearTokens);
			} else {
				this.AppModel.setProperty("/rMonthYear", []);
			}

			if (andFilter.length > 0) {
				aFilter.push(new Filter(andFilter, true));
			}

			this.AppModel.setProperty("/aSearchFilter", aFilter);
		},

		generateMonthYearArray: function (sdate, edate) {
			var startMonth = new Date(sdate).getMonth();
			var startYear = new Date(sdate).getFullYear();
			var endMonth = new Date(edate).getMonth();
			var endYear = new Date(edate).getFullYear();

			var result = [];
			var currentYear = parseInt(startYear, 10);

			while (!(startMonth === endMonth && currentYear === parseInt(endYear, 10))) {
				result.push(`${String(startMonth + 1).padStart(2, '0')}-${currentYear}`);
				startMonth++;
				if (startMonth === 12) {
					startMonth = 0;
					currentYear++;
				}
			}
			result.push(`${String(startMonth + 1).padStart(2, '0')}-${currentYear}`);

			return result;
		},

		onPressProcessInstance: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("OfnReportSrvModel").getPath();
			var objData = this.getComponentModel("OfnReportSrvModel").getProperty(sPath);
			if (!this._oProcessInstanceNode) {
				this._oProcessInstanceNode = sap.ui.xmlfragment(this.createId("fragProcessInstanceNodeTest"),
					"nus.edu.sg.ofnreport.view.subview.TaskApprovalProcessFlow", this);
				this.getView().addDependent(this._oProcessInstanceNode);
				this._oProcessInstanceNode.setEscapeHandler(function () {
					return;
				});
			}
			this.AppModel.setProperty("/processFlowRequestID", objData.REQUEST_ID);
			this._fnFrameProcessData(objData);
			this._oProcessInstanceNode.open();
		},

		_fnFrameProcessData: function (objData) {
			this.AppModel.setProperty("/processFlowRequestID", objData.REQUEST_ID);
			Services.fetchTaskProcessDetails(this, objData, function (oResponse) {
				var oFlowProcess = Object.keys(oResponse.changeHistoryMap).map(function (key) {
					var aNodes = [];
					var aLanes = [];
					var taskUserList = [];
					var aData = oResponse.requestMap[key];
					this.AppModel.setProperty("/processNode/mapData", aData);
					var taskHistoryList = oResponse.changeHistoryMap[key];

					// code to populate aNodes and aLanes arrays
					for (var t = 0; t < taskHistoryList.length; t++) {
						var objNodes = {};
						objNodes.id = "N00" + taskHistoryList[t].TASK_POSITION;
						objNodes.lane = ("L00" + taskHistoryList[t].TASK_POSITION).toString();
						objNodes.COMPLETED_BY_FULL_NAME = taskHistoryList[t].TASK_USER_FULLNAME ? taskHistoryList[t].TASK_USER_FULLNAME :
							"";
						if (!objNodes.TASK_ACTUAL_DOC) {
							var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
								pattern: "d MMM, yyyy HH:mm"
							});
							var taskActualCompletionDate = oDateFormat.format(new Date(taskHistoryList[t].TASK_ACTUAL_DOC));
							objNodes.nodeText = objNodes.COMPLETED_BY_FULL_NAME + "(" + taskActualCompletionDate + ")";
							objNodes.taskActualCompletionFormatted = taskActualCompletionDate;
						} else {
							objNodes.nodeText = objNodes.COMPLETED_BY_FULL_NAME;
						}
						objNodes.texts = taskHistoryList[t].TASK_ASSGN_GRP;
						objNodes.focused = false;
						if (taskHistoryList[t].TASK_POSITION === taskHistoryList.length) {
							objNodes.children = [];
						} else {
							objNodes.children = ["N00" + (taskHistoryList[t].TASK_POSITION + 1)];
						}

						var objLanes = {
							"id": objNodes.lane,
							"position": taskHistoryList[t].TASK_POSITION - 1,
							"icon": taskHistoryList[t].TASK_ICON_TYPE ? taskHistoryList[t].TASK_ICON_TYPE : "sap-icon://pending",
							"text": taskHistoryList[t].TASK_NAME ? taskHistoryList[t].TASK_NAME : ""
						};
						objLanes.text = taskHistoryList[t].TASK_ALIAS_NAME;

						if (taskHistoryList[t].TASK_STATUS === "Active") {
							objLanes.state = [{
								"state": "Critical",
								"value": 100
							}];
							objNodes.state = "Critical";
						} else if (taskHistoryList[t].TASK_STATUS === "Completed") {
							if (taskHistoryList[t].ACTION_CODE === 'REJECT') {
								objLanes.state = [{
									"state": "Negative",
									"value": 100
								}];
								objNodes.state = "Negative";
							} else {
								objLanes.state = [{
									"state": "Positive",
									"value": 100
								}];
								objNodes.state = "Positive";
							}

						} else if (taskHistoryList[t].TASK_STATUS === "Rejected") {
							objLanes.state = [{
								"state": "Negative",
								"value": 100
							}];
							objNodes.state = "Negative";
						}
						if (taskHistoryList[t].TASK_NAME === "CW_ESS") {
							objLanes.state = [{
								"state": "Positive",
								"value": 100
							}];
							objNodes.state = "Positive";
						}

						// fetch image
						if (taskHistoryList[t].TASK_USER_STAFF_ID && taskHistoryList[t].TASK_USER_STAFF_ID !== "ALL") {
							var photoResponse = Services.fetchUserImageAsync(this, taskHistoryList[t].TASK_USER_STAFF_ID);
							if (photoResponse.length) {
								objNodes.src = "data:image/png;base64," + photoResponse[0].photo;
							} else {
								objNodes.src = jQuery.sap.getModulePath("nus.edu.sg.ofnreport") + "/Image/Empty.png";
							}
						} else {
							objNodes.src = jQuery.sap.getModulePath("nus.edu.sg.ofnreport") + "/Image/Empty.png";
						}

						if (taskHistoryList[t].taskUserList) {
							taskUserList.push(taskHistoryList[t].taskUserList);
						}

						aLanes.push(objLanes);
						aNodes.push(objNodes);

					}
					return {
						nodes: aNodes,
						lanes: aLanes,
						mapData: aData,
						userList: taskUserList[0]
					};
				}.bind(this));

				this.AppModel.setProperty("/oFlowProcess", oFlowProcess);

			}.bind(this));

		},
		onPressCloseProcessNode: function () {
			this._oProcessInstanceNode.close();
			this._oProcessInstanceNode.destroy();
			this._oProcessInstanceNode = null;
			this._oProcessInstanceNode = undefined;
		},

		onPressRequestItem: function (oEvent) {
			var sPath = oEvent.getParameter("listItem").getBindingContext("OfnReportSrvModel").getPath();
			var objData = this.getComponentModel("OfnReportSrvModel").getProperty(sPath);
			var tabKey = this.AppModel.getProperty("/oTabKey");
			var project = "cwsRequestViews('" + objData.REQ_UNIQUE_ID + "')";
			var layout = "MidColumnFullScreen";
			var oStateToSave = this.AppModel.getProperty("/aSearchFilter");
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			var displayDetailHash = "&/displayofn/" + project + "/" + layout;
			var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
				target: {
					semanticObject: tabKey === "opwn" ? "opwrequest" : "cwsnedrequestscreen",
					action: tabKey === "opwn" ? "Display" : "display"
				}
			})) || "";
			this._fnSaveState();
			hash = hash + displayDetailHash;
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: hash
				}
			});

		},

		// 8. Event for saving the info before navigating to other app
		_fnSaveState: function () {
			if (sap.ushell && sap.ushell.Container) {
				// var that = this;
				sap.ushell.Container.getServiceAsync("Personalization")
					.then(function (oPersonalizationService) {
						return oPersonalizationService.getContainer("ofnreport", {
							validity: 0
						});
					}.bind(this))
					.then(function (oContainer) {
						this.oStateContainer = oContainer;
						// Clear previous personalization
						this.oStateContainer.clear();
						var oFilterValue = that.AppModel.getData();
						this.oStateContainer.setItemValue("persData", oFilterValue);
						return this.oStateContainer.save();
					}.bind(this))
					.catch(function (oError) {
						console.error("Error saving personalization:", oError);
					});
				// sap.ushell.Container.getService("Personalization").getContainer("ofnreport", {
				// 	validity: 0
				// }).fail(function () {
				// 	//Error Handling
				// }).done(jQuery.proxy(function (oParam) {
				// 	that.oStateContainer = oParam;
				// 	that.oStateContainer.clear();
				// 	var oFiltervalue = that.AppModel.getData();
				// 	that.oStateContainer.setItemValue("persData", oFiltervalue);
				// 	that.oStateContainer.save();
				// }, that));
			}
		},
		// 9. Event to restore the values from back navigation
		_fnRestoreState: function () {
			if (sap.ushell && sap.ushell.Container) {
				var that = this;
				that.AppModel.setProperty("/oRState", true);
				sap.ushell.Container.getServiceAsync("Personalization")
					.then(function (oPersonalizationService) {
						return oPersonalizationService.getContainer("ofnreport", {
							validity: 0
						});
					}.bind(this))
					.then(function () {
						this.oStateContainer = oContainer;
						var oFilterValue = oParams.getItemValue("persData");
						if (oFilterValue !== undefined) {
							this.onPressGoRetrieveRequests();
						}
					}.bind(this))
					.catch(function (oError) {
						console.error("Error saving personalization:", oError);
					});



				// sap.ushell.Container.getService("Personalization").getContainer("ofnreport", {
				// 	validity: 0
				// }).fail(function () {
				// 	// Error Handler
				// }).done(jQuery.proxy(function (oParams) {
				// 	that.oStateContainer = oParams;
				// 	var oFilterValue = oParams.getItemValue("persData");
				// 	if (oFilterValue !== undefined) {
				// 		// that.AppModel.setData(oFilterValue);
				// 		// that.AppModel.setProperty("/oRState", false);
				// 		// that.AppModel.setProperty("/iscwofnvisible", that.AppModel.getProperty("/iscwofnvisible"));
				// 		// that.AppModel.setProperty("/isopwnofnvisible", that.AppModel.getProperty("/isopwnofnvisible"));
				// 		// that.fnLoadFilters();
				// 		that.onPressGoRetrieveRequests();
				// 		// that.AppModel.setProperty("/oTabKey", that.AppModel.getProperty("/oSelectedSection"));
				// 	}
				// }, that));
			}
		},

		fnLoadFilters: function () {
			var aToken = this.AppModel.getProperty("/rClaimType");
			if (aToken) {
				for (var i = 0; i < aToken.length; i++) {
					var obj = aToken[i];

					if (obj.CONFIG_KEY === "OPWN") {
						this.AppModel.setProperty("/oTabKey", "opwn");
						this.AppModel.setProperty("/isopwnofnvisible", true);
					} else {
						this.AppModel.setProperty("/oTabKey", "cw");
						this.AppModel.setProperty("/iscwofnvisible", true);
					}

					this.getUIControl("inpRqstTypeValueHelp").addToken(new Token({
						text: obj.CONFIG_VALUE,
						key: obj.CONFIG_KEY
					}));
				}
			}

			var oRequestID = this.AppModel.getProperty("/rRequestid");
			if (oRequestID) {
				for (var i = 0; i < oRequestID.length; i++) {
					var obj = oRequestID[i];
					this.getUIControl("inpClaimNoValueHelp").addToken(new Token({
						text: obj.REQUEST_ID,
						key: obj.REQUEST_ID
					}));
				}
			}

			var oULUs = this.AppModel.getProperty("/rulus");
			if (oULUs) {
				for (var i = 0; i < oULUs.length; i++) {
					var obj = oULUs[i];
					this.getUIControl("inpUluValueHelp").addToken(new Token({
						text: obj.ULU_T,
						key: obj.ULU_C
					}));
				}
			}

			var oFDLUs = this.AppModel.getProperty("/rfdlus");
			if (oFDLUs) {
				for (var i = 0; i < oFDLUs.length; i++) {
					var obj = oFDLUs[i];
					this.getUIControl("inpFdluValueHelp").addToken(new Token({
						text: obj.FDLU_T,
						key: obj.FDLU_C
					}));
				}
			}

			if (this.AppModel.getProperty("/rSubmissionsDate")) {
				var oSdate = this.AppModel.getProperty("/rSubmissionsDate");
				var oEdate = this.AppModel.getProperty("/rSubmissioneDate");
				this.AppModel.setProperty("/osubStart", new Date(oSdate));
				this.AppModel.setProperty("/osubEnd", new Date(oEdate));
			}

			if (this.AppModel.getProperty("/rPeriodsDate")) {
				var oPsdate = this.AppModel.getProperty("/rPeriodsDate");
				var oPedate = this.AppModel.getProperty("/rPeriodeDate");
				this.AppModel.setProperty("/oPeriodStart", new Date(oPsdate));
				this.AppModel.setProperty("/oPeriodEnd", new Date(oPedate));
			}

			var oStatus = this.AppModel.getProperty("/rStatus");
			if (oStatus) {
				for (var i = 0; i < oStatus.length; i++) {
					var obj = oStatus[i];
					this.getUIControl("inpClaimStatus").addToken(new Token({
						text: obj.STATUS_ALIAS,
						key: obj.STATUS_CODE
					}));
				}
			}

			var oStafflist = this.AppModel.getProperty("/rStafflist");
			if (oStafflist) {
				for (var i = 0; i < oStafflist.length; i++) {
					var obj = oStafflist[i];
					this.getUIControl("inpStaffValueHelp").addToken(new Token({
						text: obj.FULL_NM,
						key: obj.STF_NUMBER
					}));
				}
			}

			if (this.AppModel.getProperty("/rMonthsDate")) {
				var oSDate = this.AppModel.getProperty("/rMonthsDate");
				var oEDate = this.AppModel.getProperty("/rMontheDate");
				this.AppModel.setProperty("/sMonthYear", new Date(oSDate));
				this.AppModel.setProperty("/eMonthYear", new Date(oEDate));

			}
			var oMonthYr = this.AppModel.getProperty("/rMonthYear");
			if (oMonthYr) {
				this.AppModel.setProperty("/oPMonth", true);
				for (var i = 0; i < oMonthYr.length; i++) {
					var obj = oMonthYr[i];
					this.getUIControl("inpPaymentMonthOfn").addToken(new Token({
						text: this.formatDate(obj.Month),
						key: obj.Month
					}));
				}
			}

		},

		onPressFilterButton: function () {
			var visibleSearchField = this.AppModel.getProperty("/showSearchField");
			if (visibleSearchField) {
				this.AppModel.setProperty("/showSearchField", false);
			} else {
				this.AppModel.setProperty("/showSearchField", true);
			}
		},

		onPressGroupRequest: function (oEvent) {
			var sDialogTab = "group";
			var tableSource = oEvent.getSource().getParent().getParent();
			this.grpSortOnTable = (tableSource.getId().includes('OfnOpwnRequestsTableId')) ? "OfnOpwnRequestsTableId" :
				"OfnCwNedRequestsTableId";
			// load asynchronous XML fragment
			if (!this._pViewSettingsDialog) {
				this._pViewSettingsDialog = Fragment.load({
					id: this.getView().getId(),
					name: "nus.edu.sg.ofnreport.view.subview.ViewSettingsDialog",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					return oDialog;
				}.bind(this));
			}
			this._pViewSettingsDialog.then(function (oDialog) {
				oDialog.open(sDialogTab);
			});
		},

		handleConfirm: function (oEvent) {
			if (this.grpSortOnTable) {
				var oTable = this.getUIControl(this.grpSortOnTable);
				var sValue = this.getUIControl("srchFldClaimRequest").getValue();
				var oSelectedSort = oEvent.getParameter("sortItem");
				var sortingMethod = oEvent.getParameter("sortDescending");
				var oSelectedGroup = oEvent.getParameter("groupItem");
				var groupMethod = oEvent.getParameter("groupDescending");
				var mParams = oEvent.getParameters(),
					oBinding = oTable.getBinding("items"),
					sPath,
					bDescending,
					aSorters = [],
					vGroup,
					aGroups = [];

				if (oSelectedSort) {
					sPath = mParams.sortItem.getKey();
					bDescending = mParams.sortDescending;
					aSorters.push(new Sorter(sPath, bDescending));
					oBinding.sort(aSorters);
				}

				if (oSelectedGroup) {
					sPath = mParams.groupItem.getKey();
					bDescending = mParams.groupDescending;
					aGroups.push(new Sorter(sPath, bDescending, true));
					oBinding.sort(aGroups);
				}
			}

		},

		onPressSortRequest: function (oEvent) {
			var sDialogTab = "sort";
			var tableSource = oEvent.getSource().getParent().getParent();
			this.grpSortOnTable = (tableSource.getId().includes('OfnOpwnRequestsTableId')) ? "OfnOpwnRequestsTableId" :
				"OfnCwNedRequestsTableId";
			// load asynchronous XML fragment
			var fragmentName = "nus.edu.sg.ofnreport.view.subview.ViewSettingsDialog";
			var fragId = this.getView().getId();
			Utility._handleOpenFragment(this, fragmentName, fragId, sDialogTab);
		},

		onPressSearchClaimRequest: function (oEvent) {
			var sValue = this.getView().byId("srchFldClaimRequest").getValue();
			var sPath = "OfnReportSrvModel>/CwsRequestViews";
			var oSorter = new Sorter({
				path: "REQ_UNIQUE_ID",
				descending: true
			});
			var aFilter = Utility._onPressSearchClaimRequest(sValue, this);
			Utility._bindItems(this, "OfnCwNedRequestsTableId", sPath, oSorter, this.oTemplate, aFilter);
		},

		onPressRetract: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("OfnReportSrvModel").getPath();
			var objData = this.getComponentModel("OfnReportSrvModel").getProperty(sPath);
			this.confirmPopUpToRetract(objData.REQ_UNIQUE_ID);
		},

		confirmPopUpToRetract: function (draftId) {
			var that = this;
			this.draftId = draftId;
			MessageBox.confirm("Do you want to Retract the Claim?", {
				title: "Confirmation",
				actions: [sap.m.MessageBox.Action.YES,
				sap.m.MessageBox.Action.NO
				],
				emphasizedAction: sap.m.MessageBox.Action.OK,
				onClose: function (oAction) {
					if (oAction === "YES") {
						//make a backend call to Retract the Claim
						that.retractClaim(that.draftId);
					} else {
						//do nothing
					}
				}
			});
		},

		retractClaim: function (draftId) {
			var url = "/rest/reports/taskactions/superadmin/retract";
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token
			};
			var oParameter = [{
				ACTION_CODE: "RETRACT",
				DRAFT_ID: draftId
			}];

			var saveClaimModel = new JSONModel();
			saveClaimModel.loadData(url, JSON.stringify(oParameter), true, "POST", null, null, oHeaders);
			saveClaimModel.attachRequestCompleted(function (oResponse) {
				if (oResponse.getParameter("errorobject") && !oResponse.getParameter("success")) {
					//	MessageBox.error(JSON.parse(oResponse.getParameter("errorobject").responseText).message);
					MessageBox.error(JSON.parse(oResponse.getParameter("errorobject").responseText)[0].message);
				} else if (oResponse.getSource().getData()[0].STATUS === 'E') {
					MessageBox.error(oResponse.getSource().getData()[0].message);
				} else {
					MessageToast.show(oResponse.getSource().getData()[0].message);
					this.onPressGoRetrieveRequests();
				}
			}, this);
		},

		onSelectRequestItem: function (oEvent) {
			var sPath = oEvent.getSource().getSelectedContextPaths()[0];
			this.AppModel.setProperty("/spathForSelectedRequest", sPath);
		},

		getIdentity: function (oContext) {
			return oContext.getProperty('IDENTITY');
		},

		getGroupHeader: function (oGroup) {
			return new sap.m.GroupHeaderListItem({
				title: oGroup.key
			});
		},

		onPressUnlock: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("OfnReportSrvModel").getPath();
			var objData = this.getComponentModel("OfnReportSrvModel").getProperty(sPath);

			var oModel = new JSONModel();
			var sUrl = "/rest/utils/releaseLockedRequests?draftId=" + objData.REQ_UNIQUE_ID;
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + this.AppModel.getProperty("/token"),
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			oModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
			oModel.attachRequestCompleted(function (oResponse) {
				var oData = oResponse.getSource().getData();
				MessageToast.show(oData.message);
			}.bind(this));

		},

		onPressAuditLog: function (oEvent) {
			//making rest call to get Audit Log data
			var sPath = oEvent.getSource().getBindingContext("OfnReportSrvModel").getPath();
			var objData = this.getComponentModel("OfnReportSrvModel").getProperty(sPath);
			this.AppModel.setProperty("/claimRequestType", objData.CLAIM_REQUEST_TYPE);

			var oDataModel = this.getComponentModel("OfnReportSrvModel");
			this.AppModel.setProperty("/claimRequest/draftId", objData.REQ_UNIQUE_ID);
			var url = "/rest/utils/getAuditLogData?referenceId=" + objData.REQUEST_ID + '&processCode=' + objData.PROCESS_CODE;
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Content-Type": "application/json",
				"Authorization": "Bearer" + " " + token
			};

			var AuditLogModel = new JSONModel();
			AuditLogModel.loadData(url, null, false, "GET", null, null, oHeaders);
			this.AppModel.setProperty("/claimRequest/auditLogs", AuditLogModel.getProperty("/"));
			var AuditLogs = AuditLogModel.getProperty("/");

			if (AuditLogs && AuditLogs.auditLog) {
				for (var i = 0; i < AuditLogs.auditLog.length; i++) {
					if (AuditLogs.auditLog[i].tabName === 'EClaims Items') {
						for (var j = 0; j < AuditLogs.auditLog[i].data.length; j++) {

							var dates = AuditLogs.auditLog[i].data[j].IDENTITY.split(" ");
							var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
								pattern: "d MMM, yyyy"
							});
							if (dates[0] && dates[1] && dates[2]) {
								dates[0] = oDateFormat.format(new Date(dates[0]));
								dates[2] = oDateFormat.format(new Date(dates[2]));
								dates = dates[0] + ' ' + 'to' + ' ' + dates[2];
								AuditLogs.auditLog[i].data[j].IDENTITY = dates;
							} else if (dates[0]) {
								dates[0] = oDateFormat.format(new Date(dates[0]));
								AuditLogs.auditLog[i].data[j].IDENTITY = dates[0];
							}
						}
					}
				}
			}
			this.AppModel.setProperty("/AudLogs", AuditLogs);
			if (!this._oDialogAddAuditLogs) {
				this._oDialogAddAuditLogs = sap.ui.xmlfragment(this.createId("fragAuditLog"),
					"nus.edu.sg.ofnreport.view.subview.AuditLogDataView", this);
				this.getView().addDependent(this._oDialogAddAuditLogs);
				this._oDialogAddAuditLogs.setEscapeHandler(function () {
					return;
				});
				this._oDialogAddAuditLogs.open();
			}
		},

		onCancelAuditLog: function (oEvent) {
			this._oDialogAddAuditLogs.close();
			this._oDialogAddAuditLogs.destroy();
			this._oDialogAddAuditLogs = undefined;
			this._oDialogAddAuditLogs = null;
		},

		onReferenceItemsForAuditLogs: function (oEvent) {
			var draftId = this.AppModel.getProperty("/claimRequest/draftId");
			var oDataModel = this.AppModel.getProperty("/claimRequest/oDataModel");
			this.oButton = oEvent.getSource();
			var aFilters = [];

			aFilters.push(new Filter("REQ_UNIQUE_ID", FilterOperator.EQ, draftId));
			var that = this;
			oDataModel.read("/EclaimsItemDatas", {
				filters: aFilters,
				success: function (oData) {
					if (oData) {
						that.AppModel.setProperty("/claimRequest/claimItemsDataOfAuditLogRequest", oData.results);
						var oView = that.getView();
						// create popover
						if (!that._pPopover) {
							that._pPopover = Fragment.load({
								id: oView.getId(),
								name: "nus.edu.sg.ofnreport.view.subview.ReferenceItemDataView",
								controller: that
							}).then(function (oPopover) {
								oView.addDependent(oPopover);
								return oPopover;
							});
						}
						that._pPopover.then(function (oPopover) {
							oPopover.openBy(that.oButton);
						});
					}
				},
				error: function (oError) {

				}
			});
		},

		onCancelReferenceItems: function (oEvent) {
			this._oDialogAddReferenceItems.close();
			this._oDialogAddReferenceItems.destroy();
			this._oDialogAddReferenceItems = undefined;
			this._oDialogAddReferenceItems = null;
		},

		onClear: function (oEvent) {
			// this.getUIControl("OfnCwNedRequestsTableId").setVisible(false);
			// this.getUIControl("OfnOpwnRequestsTableId").setVisible(false);
			this.getUIControl("inpRqstTypeValueHelp").removeAllTokens();
			this.getUIControl("inpUluValueHelp").removeAllTokens();
			this.getUIControl("inpPaymentMonthOfn").removeAllTokens();
			this.AppModel.setProperty("/claimType", '');
			this.AppModel.setProperty("/claimTypeCode", '');
			this.AppModel.setProperty("/claimRequest/selectedItemsClaimStatus", []);

			this.AppModel.setProperty("/CWNED_Count", "");
			this.AppModel.setProperty("/OPWN_Count", "");
			this.AppModel.setProperty("/requestId", '');
			this.AppModel.setProperty("/uluSelected", '');
			this.AppModel.setProperty("/uluSelectedCode", '');
			this.AppModel.setProperty("/submittedByName", '');
			this.AppModel.setProperty("/submittedById", '');

			this.AppModel.setProperty("/rClaimType", "");
			this.AppModel.setProperty("/rRequestid", "");
			this.AppModel.setProperty("/rulus", "");
			this.AppModel.setProperty("/rMonthYear", "");
			this.AppModel.setProperty("/oPMonth", false);
			this.AppModel.setProperty("/rMonthsDate", "");
			this.AppModel.setProperty("/rMontheDate", "");
			// if (oEvent)
			// 	this.onReportProceed();
		},

		generateData: function (inputArray) {
			var oData = [];
			for (var i = 0; i < inputArray.length; i++) {
				oData.push({
					"REQ_UNIQUE_ID": inputArray[i].REQ_UNIQUE_ID,
					"REQUEST_ID": inputArray[i].REQUEST_ID,
					"ROLE": inputArray[i].ROLE,
					"START_DATE": inputArray[i].START_DATE,
					"END_DATE": inputArray[i].END_DATE,
					"AMOUNT": inputArray[i].AMOUNT,
					"NOOFMONTHS": inputArray[i].NOOFMONTHS
				});
			}
			return oData;
		},

		onPressExportData: function (oEvent) {
			this.showBusyIndicator();
			var oKey = this.AppModel.getProperty("/oTabKey");
			var oTable = (oKey === "opwn") ? this.getUIControl("OfnOpwnRequestsTableId") : this.getUIControl("OfnCwNedRequestsTableId");
			var aFilters = decodeURIComponent(oTable.getBinding("items").sFilterParams);
			aFilters = aFilters.split("=");
			var oDataModel = this.getComponentModel("OfnReportSrvModel");
			oDataModel.read(Config.dbOperations.cwsRequestViewApi, {
				urlParameters: {
					"$filter": aFilters[1],
					"$expand": "CwsPaymentsDetails"
				},
				success: function (oData) {
					this._fnDataDescription(oData.results, oKey);
				}.bind(this)
			});
		},

		_fnDataDescription: function (oData, oKey) {
			var isPaidRecords = this.AppModel.getProperty("/oPaidMonthstate"),
				isPaidAmountdata = [],
				data = [],
				dataValid = [];
			var oLocation = this.AppModel.getProperty("/locations");
			var oWorkTypes = this.AppModel.getProperty("/workTypes");
			var oLevy = this.AppModel.getProperty("/levyList");
			var oRemuneration = this.AppModel.getProperty("/remunerationList");
			var owaiver = this.AppModel.getProperty("/waiverList");
			var osubmission = this.AppModel.getProperty("/submission");
			var oStatus = this.AppModel.getProperty("/opwnStatus");
			var oPayment = this.AppModel.getProperty("/paymentType");

			if (oData && oKey === "opwn") {
				data = oData;
				var oSubDesc = osubmission.reduce((map, obj) => {
					map[obj.CONFIG_KEY] = obj.CONFIG_VALUE;
					return map;
				}, {});
				data.forEach(obj => {
					if (oSubDesc.hasOwnProperty(obj.SUBMISSION_TYPE)) {
						obj.SUBMISSION_TYPE = oSubDesc[obj.SUBMISSION_TYPE];
					}
				});

				// Levy List
				var oLevyDesc = oLevy.reduce((map, obj) => {
					map[obj.CONFIG_KEY] = obj.REFERENCE_VALUE + "," + obj.CONFIG_VALUE;
					return map;
				}, {});
				data.forEach(obj => {
					if (oLevyDesc.hasOwnProperty(obj.PROPERTY_USAGE)) {
						var oValue = oLevyDesc[obj.PROPERTY_USAGE].split(",");
						obj.PROPERTY_USAGE = oValue[1];
						obj.PROPERTY_PERCENT = oValue[0];
					} else {
						var okey = obj.EMP_CAT_C === "46" ? "LVY05" : "LVY04";
						var oValue = oLevyDesc[okey].split(",");
						obj.PROPERTY_USAGE = oValue[1];
						obj.PROPERTY_PERCENT = oValue[0];
					}
				});
				data = data.map((element) => {
					var updatedCwsPaymentsDetails = (element.CwsPaymentsDetails.results).map((payment) => {
						if (payment.IS_DELETED !== "Y") {
							payment.VALUE = payment.ALLOTMENT_VAL;
						}
						return payment;
					});

					return {
						...element,
						CwsPaymentsDetails: updatedCwsPaymentsDetails.filter((subElement) => (subElement.IS_DELETED !== "Y" && subElement.PAYMENT_REQ_STATUS))
					};
				});
				for (var k = 0; k < data.length; k++) {
					var totalReqAmount = data[k].AMOUNT;
					var payments = data[k].CwsPaymentsDetails;

					var OPWNstatus = oStatus.reduce((map, obj) => {
						map[obj.STATUS_CODE] = obj.STATUS_ALIAS;
						return map;
					}, {});

					var oPaymentDesc = oPayment.reduce((map, obj) => {
						map[obj.CONFIG_KEY] = obj.CONFIG_VALUE;
						return map;
					}, {});

					var payMap = {};
					payments.forEach(payment => {
						if (payment.PAYMENT_REQ_STATUS === '54') {
							if (!payMap[payment.YEAR + "_" + payment.MONTH + "_" + payment.PAYMENT_TYPE]) {
								payMap[payment.YEAR + "_" + payment.MONTH + "_" + payment.PAYMENT_TYPE] = {
									"AMOUNT": 0.00,
									"PAYMENT_TYPE": payment.PAYMENT_TYPE,
									"MONTH": payment.MONTH,
									"YEAR": payment.YEAR,
									"PAYMENT_REQ_STATUS_ALIAS": payment.PAYMENT_REQ_STATUS_ALIAS,
									"PAYMENT_TYPE_ALIAS": payment.PAYMENT_TYPE_ALIAS
								};
							}
							payMap[payment.YEAR + "_" + payment.MONTH + "_" + payment.PAYMENT_TYPE].AMOUNT += parseFloat(payment.AMOUNT);
						}
					});

					var paidPaymentList = [];
					jQuery.sap.each(payMap, function (pK, pV) {
						pV.PAID_AMOUNT = pV.AMOUNT;
						pV.BALANCE_AMOUNT = totalReqAmount - pV.PAID_AMOUNT;
						totalReqAmount = pV.BALANCE_AMOUNT;
						paidPaymentList.push(pV);
					});
					data[k].paymentList = paidPaymentList;
				}

				this._fnHandleDataToExport(data, 'isPaid');

			} else {

				data = oData;
				//Levy list
				var oLevyDesc = oLevy.reduce((map, obj) => {
					map[obj.CONFIG_KEY] = obj.REFERENCE_VALUE + "," + obj.CONFIG_VALUE;
					return map;
				}, {});
				data.forEach(obj => {
					if (oLevyDesc.hasOwnProperty(obj.PROPERTY_USAGE)) {
						var oValue = oLevyDesc[obj.PROPERTY_USAGE].split(",");
						obj.PROPERTY_USAGE = oValue[1];
						obj.PROPERTY_PERCENT = oValue[0];
					}
				});

				// submission type
				var oSubDesc = osubmission.reduce((map, obj) => {
					map[obj.CONFIG_KEY] = obj.CONFIG_VALUE;
					return map;
				}, {});
				data.forEach(obj => {
					if (oSubDesc.hasOwnProperty(obj.SUBMISSION_TYPE)) {
						obj.SUBMISSION_TYPE = oSubDesc[obj.SUBMISSION_TYPE];
					}
				});
				this._fnHandleDataToExport(data);
			}

		},

		_fnHandleDataToExport: function (aData, key) {
			var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
				pattern: "yyyyMMddhhmmss"
			});
			var date = oDateFormat.format(new Date());
			var aCols, aProducts, oSettings, oSheet;
			var oTabkey = this.AppModel.getProperty("/oTabKey");
			var oName = (oTabkey === "opwn") ? "OFN_OPWN_REPORT" : "OFN_CW_NED_REPORT";
			aCols = (oTabkey === "opwn") ? this.createColumnConfigOPWN() : this.createColumnConfig();
			var oDataSource = (oTabkey === "opwn") ? this.generateLineItemOPWN(aData, key) : this.generateLineItem(aData);

			var sortedArray = oDataSource.sort((a, b) => {
				if (a.STAFF_ID !== b.STAFF_ID) {
					return a.STAFF_ID - b.STAFF_ID;
				} else if (a.REQUEST_ID !== b.REQUEST_ID) {
					return a.REQUEST_ID - b.REQUEST_ID;
				} else {
					return a.SUBMITTED_ON_TS - b.SUBMITTED_ON_TS;
				}
			});

			oSettings = {
				workbook: {
					columns: aCols,
					context: {
						sheetName: oName + "Details"
					}
				},
				dataSource: sortedArray,
				fileName: oName + "_" + date + ".xlsx"
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					this.hideBusyIndicator();
					MessageToast.show(oName + ' exported successfully.');
				}.bind(this))
				.finally(function () {
					oSheet.destroy();
				});
		},

		generateLineItem: function (dataArray) {
			var oView = this;
			dataArray = dataArray.map((element) => {
				return {
					...element,
					CwsPaymentsDetails: (element.CwsPaymentsDetails.results).filter((subElement) => subElement.IS_DELETED !== "Y")
				}
			});
			var ocurrency = "",
				oTotalAmount = 0,
				oBizAmount = 0;

			var AdminFee, PaymentSum, BizAmnt, propPercent;
			var spreadsheetData = dataArray.flatMap(data => {
				PaymentSum = (data.CwsPaymentsDetails).reduce(function (totalAmount, value) {
					if (value.PAYMENT_TYPE === "R" && value.IS_WAIVED === "N")
						totalAmount += parseFloat(value.AMOUNT) || 0;
					return totalAmount;
				}, 0);

				BizAmnt = (data.CwsPaymentsDetails).reduce(function (totalAmount, value) {
					ocurrency = value.CURRENCY;
					if (value.PAYMENT_TYPE === "R" && value.IS_WAIVED === "N")
						totalAmount += parseFloat(value.BIZ_EXP_AMT) || 0;
					return totalAmount;
				}, 0);

				propPercent = !isNaN(data.PROPERTY_PERCENT) ? Number(data.PROPERTY_PERCENT) : 0;
				AdminFee = 0.00;
				if (PaymentSum && (!data.IS_WAIVED || (data.IS_WAIVED && data.IS_WAIVED !== this.getI18n("ofnreport.waiver.yes")))) {
					AdminFee = (PaymentSum - BizAmnt) * (propPercent / 100);
					AdminFee = AdminFee.toFixed(2);
				}
				const baseData = {
					"STAFF_ID": data.STAFF_ID,
					"FULL_NM": data.FULL_NM,
					"SUBMISSION_TYPE": data.SUBMISSION_TYPE,
					"REQUEST_TYPE": data.REQUEST_TYPE,
					"REQUEST_ID": data.REQUEST_ID,
					"SUB_TYPE_T": data.SUB_TYPE_T,
					"PROCESS_TITLE": data.PROCESS_TITLE,
					"EMP_CAT_T": data.EMP_CAT_T,
					"EMP_GP_T": data.EMP_GP_T,
					"ULU_T": data.ULU_T,
					"FDLU_T": data.FDLU_T,
					"START_DATE": data.START_DATE,
					"END_DATE": data.END_DATE,
					"CLIENT_NAME": data.CLIENT_NAME,
					"WORK_DETAILS": data.WORK_DETAILS,
					"PROPERTY_USAGE": data.PROPERTY_USAGE,
					"ENG_FDLU_T": data.ENG_FDLU_T,
					"ENG_ULU_T": data.ENG_ULU_T,
					"EXTRACTION_DATE": Formatter.formatDateAsString(new Date(), "dd/MM/yyyy hh:MM:ss"),
					"SUBMITTED_BY_FULLNAME": data.SUBMITTED_BY_FULLNAME,
					"STATUS_ALIAS": data.STATUS_ALIAS,
					"OFFLINE_APPROVAL": data.OFFLINE_APPROVAL,
					"MODIFIED_ON": (data.MIGRATED) ? oView.formatTimestamp(data.SUBMITTED_ON_TS) : (data.REQUEST_STATUS === "38" || data.REQUEST_STATUS ===
						"48") ? oView.formatTimestamp(data.MODIFIED_ON) : "",
					"MODIFIED_BY": (data.MIGRATED) ? data.SUBMITTED_BY_FULLNAME : (data.REQUEST_STATUS === "38" || data.REQUEST_STATUS === "48") ?
						data.MODIFIED_BY_FULLNAME : "",
					"ADMIN_AMOUNT": PaymentSum.toFixed(2),
					"LE_AMOUNT": AdminFee,
					"BIZ_EXP_AMT": BizAmnt.toFixed(2),
					"CURRENCY": ocurrency,
					"STATUS": data.REQUEST_STATUS === "48" ? "Y" : "N",
					"PAY_MONTH": oView.getPayMonthInReadableFormat()
				};

				baseData.ADMIN_AMOUNT = 0;

				jQuery.sap.each(data.CwsPaymentsDetails, function (pK, pV) {
					if (pV.PAYMENT_TYPE === "R") {
						baseData.ADMIN_AMOUNT += parseFloat(pV.AMOUNT);
					}
				});
				baseData.ADMIN_AMOUNT = (baseData.ADMIN_AMOUNT).toFixed(2);
				return [baseData];
			});

			return spreadsheetData.flat();
		},

		generateLineItemOPWN: function (dataArray, key) {
			var oView = this;
			var total, oMonth, PaymentSum, AdminFee, MonthArray, propPercent;
			var spreadsheetData = dataArray.flatMap(data => {
				total = 0;
				oMonth = this.getUIControl("inpPaymentMonthOfn").getTokens();
				MonthArray = [];
				for (var k = 0; k < oMonth.length; k++) {
					MonthArray.push(oMonth[k].getKey());
				}

				var filterMonthData = this.fnFilterPaymentMonth(data.CwsPaymentsDetails, MonthArray);
				PaymentSum = (filterMonthData).reduce(function (totalAmount, value) {
					totalAmount += parseFloat(value.AMOUNT) || 0;
					return totalAmount;
				}, 0);
				AdminFee = 0.00;
				propPercent = !isNaN(data.PROPERTY_PERCENT) ? Number(data.PROPERTY_PERCENT) : 0;
				if (propPercent) {
					var ratio = 10 - (propPercent / 10);
					if (PaymentSum && (!data.IS_WAIVED || (data.IS_WAIVED && data.IS_WAIVED !== this.getI18n("ofnreport.waiver.yes")))) {
						AdminFee = PaymentSum / ratio;
						AdminFee = AdminFee.toFixed(2);
					}
				}

				var postingDate = "";
				(data.CwsPaymentsDetails).map(function (value) {
					postingDate = value.MODIFIED_ON;
				});
				postingDate = (postingDate) ? Formatter.formatDateAsString(postingDate, "dd/MM/yyyy hh:MM:ss") : "";

				const baseData = {
					"STAFF_ID": data.STAFF_ID,
					"REQUEST_ID": data.REQUEST_ID,
					"FULL_NM": data.FULL_NM,
					"SUBMISSION_TYPE": data.SUBMISSION_TYPE,
					"AMOUNT_S": data.AMOUNT,
					"EMP_CAT_T": data.EMP_CAT_T,
					"EMP_GP_T": data.EMP_GP_T,
					"ULU_T": data.ULU_T,
					"FDLU_T": data.FDLU_T,
					"START_DATE": data.START_DATE,
					"END_DATE": data.END_DATE,
					"CLIENT_NAME": data.CLIENT_NAME,
					"WORK_DETAILS": data.WORK_DETAILS,
					"ENG_FDLU_T": data.ENG_FDLU_T,
					"ENG_ULU_T": data.ENG_ULU_T,
					"LOCATION": data.LOCATION,
					"PROGRAM_NAME": data.PROGRAM_NAME,
					"EXTRACTION_DATE": Formatter.formatDateAsString(new Date(), "dd/MM/yyyy hh:MM:ss"),
					"SUBMITTED_BY_FULLNAME": data.SUBMITTED_BY_FULLNAME,
					"SUB_TYPE_T": data.SUB_TYPE_T,
					"STATUS_ALIAS": data.STATUS_ALIAS,
					"WBS": "",
					"VALUE": "",
					"ADMIN_AMOUNT": PaymentSum.toFixed(2),
					"LE_AMOUNT": AdminFee,
					"STATUS": data.REQUEST_STATUS === "48" ? "Y" : "N",
					"POSTED_DATE": postingDate
				};

				baseData.AMOUNT = 0;

				var wbsMap = {};
				var oMonthMap = {};
				jQuery.sap.each(filterMonthData, function (pK, pV) {
					wbsMap[pV.WBS] = pV.ALLOTMENT_VAL;
					baseData.AMOUNT += parseFloat(pV.AMOUNT) || 0;
					oMonthMap[pV.MONTH + "," + pV.YEAR] = pV.MONTH + "," + pV.YEAR;
				});

				baseData.AMOUNT = (baseData.AMOUNT).toFixed(2) || 0;
				baseData.PAY_MONTH = oView.getPayMonthInReadableFormat();

				jQuery.sap.each(wbsMap, function (mK, mV) {
					baseData.WBS += mK + ";";
					baseData.VALUE += parseFloat(mV) + "%" + ";";
				});
				baseData.WBS = baseData.WBS.substring(0, baseData.WBS.length - 1);
				baseData.VALUE = baseData.VALUE.substring(0, baseData.VALUE.length - 1);

				return [baseData];
			});

			return spreadsheetData.flat();
		},

		createColumnConfig: function () {
			return [{
				label: "Employee No.",
				property: 'STAFF_ID',
			}, {
				label: 'Employee Name',
				width: "40%",
				property: 'FULL_NM'
			}, {
				label: "Request Type",
				property: 'PROCESS_TITLE',
				type: EdmType.String
			}, {
				label: "Sub Type",
				property: 'SUB_TYPE_T',
				type: EdmType.String
			}, {
				label: "Request ID",
				property: 'REQUEST_ID',
				type: EdmType.String
			}, {
				label: "Payment Month",
				property: 'PAY_MONTH',
				type: EdmType.String
			}, {
				label: 'Employee Category',
				property: 'EMP_CAT_T'
			}, {
				label: "Employee Group",
				property: 'EMP_GP_T',
				type: EdmType.String
			}, {
				label: 'Employee ULU',
				property: 'ULU_T'
			}, {
				label: "Employee FDLU",
				property: 'FDLU_T',
				type: EdmType.String
			}, {
				label: "Start Date",
				property: 'START_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: "End Date",
				property: 'END_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: "Details of Work",
				type: EdmType.String,
				property: 'WORK_DETAILS'
			}, {
				label: "Usage of NUS Property and/or Services",
				type: EdmType.String,
				width: "50%",
				property: 'PROPERTY_USAGE'
			}, {
				label: "Amount",
				type: EdmType.String,
				property: 'ADMIN_AMOUNT'
			}, {
				label: "Levy Amount",
				type: EdmType.String,
				property: 'LE_AMOUNT'
			},
			/*{
				label: "Engaging Faculty/Client Name",
				property: 'ENG_FDLU_T'
			}, {
				label: "Engaging Dept",
				property: 'ENG_ULU_T'
			},*/
			{
				label: "Client Name",
				property: 'CLIENT_NAME'
			}, {
				label: "Business Expense Amount",
				property: 'BIZ_EXP_AMT'
			}, {
				label: "Currency",
				property: 'CURRENCY'
			}, {
				label: "Status",
				property: 'STATUS',
				width: "20%",
				type: EdmType.String
			}, {
				label: "Submitted By",
				property: 'SUBMITTED_BY_FULLNAME',
				type: EdmType.String
			}, {
				label: "Extraction Date",
				property: 'EXTRACTION_DATE',
				width: "20%"
			}
			];
		},

		createColumnConfigOPWN: function () {

			return [{
				label: "Employee No.",
				property: 'STAFF_ID',
			}, {
				label: 'Employee Name',
				width: "40%",
				property: 'FULL_NM'
			}, {
				label: "Sub Type of OPWN",
				property: 'SUB_TYPE_T',
				type: EdmType.String
			}, {
				label: "Request ID",
				property: 'REQUEST_ID',
				type: EdmType.String
			}, {
				label: "Payment Month",
				property: 'PAY_MONTH',
				type: EdmType.String
			}, {
				label: 'Employee Category',
				property: 'EMP_CAT_T'
			}, {
				label: "Employee Group",
				property: 'EMP_GP_T',
				type: EdmType.String
			}, {
				label: 'Employee ULU',
				property: 'ULU_T'
			}, {
				label: "Employee FDLU",
				property: 'FDLU_T',
				type: EdmType.String
			}, {
				label: "Start Date",
				property: 'START_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: "End Date",
				property: 'END_DATE',
				type: EdmType.Date,
				format: 'dd mmm, yyyy'
			}, {
				label: "Details of Work",
				type: EdmType.String,
				property: 'WORK_DETAILS'
			}, {
				label: "Amount",
				type: EdmType.String,
				property: 'AMOUNT'
			}, {
				label: "Admin Amount",
				type: EdmType.String,
				property: 'LE_AMOUNT'
			}, {
				label: "Engaging Faculty/Client Name",
				property: 'ENG_FDLU_T'
			}, {
				label: "Engaging Dept",
				property: 'ENG_ULU_T'
			}, {
				label: "WBS Element-Engaging dept",
				property: 'WBS'
			}, {
				label: "WBS Element-Engaging dept %",
				property: 'VALUE'
			}, {
				label: "Program Name",
				property: 'PROGRAM_NAME'
			}, {
				label: "Status",
				property: 'STATUS',
				width: "20%",
				type: EdmType.String
			}, {
				label: "Submitted By",
				property: 'SUBMITTED_BY_FULLNAME',
				type: EdmType.String
			}, {
				label: "Extraction Date",
				property: 'EXTRACTION_DATE',
				width: "20%"
			}, {
				label: "Posting Date",
				property: 'POSTED_DATE',
				width: "20%"
			}];

		},

		formatTimestamp: function (timestamp) {

			var jsDate = new Date(timestamp); // Extract timestamp
			var day = jsDate.getDate().toString().padStart(2, '0');
			var month = jsDate.toLocaleString('default', {
				month: 'short'
			});
			var year = jsDate.getFullYear();
			var hours = jsDate.getHours().toString().padStart(2, '0');
			var minutes = jsDate.getMinutes().toString().padStart(2, '0');
			var seconds = jsDate.getSeconds().toString().padStart(2, '0');

			return `${day} ${month}, ${year} ${hours}:${minutes}:${seconds}`;
		},

		_fnClaimpopOpen: function (oData) {
			this.AppModel.setProperty("/oVisFilter", false);
			this.AppModel.setProperty("/oSelectedProf", "");
			this.AppModel.setProperty("/oSelectedProfText", "");
			if (!this._oDialogReport) {
				this._oDialogReport = sap.ui.xmlfragment(
					"ReportDialog",
					"nus.edu.sg.ofnreport.view.ReportSelection",
					this
				);
				this.getView().addDependent(this._oDialogReport);
			}
			this._oDialogReport.open();
		},

		fnOpenHrpStaff: function () {
			if (!this._oDialogHRPstaff) {
				this._oDialogHRPstaff = sap.ui.xmlfragment(
					"HRPstaff",
					"nus.edu.sg.ofnreport.view.subview.HRPStaffDialog",
					this
				);
				this.getView().addDependent(this._oDialogHRPstaff);
			}
			this._oDialogHRPstaff.open();
		},

		onSelectType: function (oEvent) {
			this.AppModel.setProperty("/claimType", oEvent.getSource().getValue());
			this.AppModel.setProperty("/claimTypeCode", oEvent.getSource().getSelectedKey());
		},

		onSelectProf: function (oEvent) {
			var oCont = oEvent.getSource().getSelectedButton().getCustomData()[0].getKey();
			this.AppModel.setProperty("/oSelectedProf", oCont);
			this.AppModel.setProperty("/oSelectedProfText", "--  " + oEvent.getSource().getSelectedButton().getText());
			this.AppModel.setProperty("/oPeriodLabel", true);
			var oReqType = this.AppModel.getProperty("/claimRequest/claimTypeList");

			if (oCont === "CW_PROGRAM_ADMIN" || oCont === "CW_APPLICATION_ADMIN" || oCont === "CW_PROGRAM_MANAGER") {
				this.AppModel.setProperty("/oPeriodLabel", false);
			}

			if (oCont === "CW_HRP") {
				this._fnHRPstaff();
			}
		},

		onReportProceed: function (oEvent) {
			var oData = this.AppModel.getProperty("/oSelectedProf");
			var oControl = this.getUIControl("errStrip", "ReportDialog");
			if (!oData) {
				oControl.setText("Please select atleast one profile.");
				oControl.setVisible(true);
			} else {
				if (!oData || (oData === "CW_ESS" || oData === "CW_HRP" || oData === "CW_REPORTING_MGR" || oData === "CW_MANAGERS_MGR" || oData ===
					"CW_PROGRAM_ADMIN" || oData === "CW_APPLICATION_ADMIN")) {
					this.AppModel.setProperty("/oVisFilter", false);
				} else {
					this.AppModel.setProperty("/oVisFilter", true);
				}
				this.handleValueHelpClaimType();
				this.onCancel();
			}
		},
		onCancel: function (oEvent) {
			if (this._oDialogReport) {
				this._oDialogReport.destroy();
				this._oDialogReport = null;
				this._oDialogReport = undefined;
			}
			/*if (oEvent) {
				this.onNavDashBoard();
			}*/
			if (oEvent) {
				this.AppModel.setProperty("/oSelectedProfText", "--  Employee");
				this.AppModel.setProperty("/oSelectedProf", "CW_ESS");
			}
		},

		onNavDashBoard: function () {
			// var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
			// var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
			// 	target: {
			// 		semanticObject: "cwdashboard",
			// 		action: "Display"
			// 	},
			// 	params: {}
			// })) || "";
			// oCrossAppNavigator.toExternal({
			// 	target: {
			// 		shellHash: hash
			// 	}
			// });

			sap.ushell.Container.getServiceAsync("Navigation")
				.then(function (oNavigation) {
					oNavigation.navigate({
						target: {
							semanticObject: "cwdashboard",
							action: "Display"
						},
						params: {}
					});
				})
				.catch(function (err) {
					console.error("Dashboard App Navigation failed", err);
				});
		},

		onReset: function () {
			this.onClear();
			var oModel = new JSONModel();
			var sUrl = "/rest/cw/userRoles";
			var staffId = this.AppModel.getProperty("/loggedInUserInfo/userName");
			sUrl = sUrl + "?staffId=" + staffId;
			var token = this.AppModel.getProperty("/token");
			var oHeaders = {
				"Accept": "application/json",
				"Authorization": "Bearer" + " " + token,
				"AccessPoint": "A",
				"Content-Type": "application/json"
			};
			oModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
			oModel.attachRequestCompleted(function (oResponse) {

			}.bind(this));
		},

		onNodePress: function (oEvent) {
			var oState = oEvent.getParameters().getState();
			var oData = this.AppModel.getProperty("/oFlowProcess/0/userList");
			if (oState === "Critical" && oData.length > 0) {
				if (!this._oDialoguserList) {
					this._oDialoguserList = sap.ui.xmlfragment(this.createId("userList"),
						"nus.edu.sg.ofnreport.view.ManagerFlow", this);
					this.getView().addDependent(this._oDialoguserList);
					this._oDialoguserList.open();
				}
			}
		},
		handleCloseList: function (oEvent) {
			this._oDialoguserList.close();
			this._oDialoguserList.destroy();
			this._oDialoguserList = undefined;
		}

	});
});