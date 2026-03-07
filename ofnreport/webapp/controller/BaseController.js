sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent", "../utils/dataformatter", "sap/ui/core/Fragment",
	"../utils/services",
	"../utils/configuration"
], function (JSONModel, Controller, UIComponent, Formatter, Fragment, Services, Config) {
	"use strict";

	return Controller.extend("nus.edu.sg.ofnreport.controller.BaseController", {

		getComponentModel: function (modelName) {
			var model = (modelName) ? this.getOwnerComponent().getModel(modelName) : this.getOwnerComponent().getModel();
			return model;
		},
		setComponentModel: function (modelName) {
			var model = (modelName) ? this.getOwnerComponent().setModel(new JSONModel(), modelName) : null;
			return this.getOwnerComponent().getModel(modelName);
		},
		handleRefresh: function () {
			this.getOwnerComponent().getInitialDataForUser();
		},

		// Filter Month and Year from the payment details

		fnFilterPaymentMonth: function (dataArray, targetDates) {
			return dataArray.filter(item => {
				var itemDate = `${item.MONTH}/${item.YEAR}`;
				return targetDates.includes(itemDate);
			});
		},

		getI18n: function (sTextField) {
			var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var i18nTextValue = oResourceBundle.getText(sTextField);
			return i18nTextValue ? i18nTextValue : sTextField;
		},

		/*
		 * Display Message in different Sections
		 */
		showMessagePopOver: function (messageElement) {
			messageElement = JSON.parse(JSON.stringify(messageElement));
			var messageModel = this.modelAssignment("MessagePopOver");
			// var data = messageModel.getData();
			var data = [];
			// data = (data instanceof Array) ? data : [];
			messageElement = (messageElement instanceof Array) ? messageElement : [messageElement];
			for (var i = 0; i < messageElement.length; i++) {
				data.push(messageElement[i]);
			}
			messageModel.setData(data);
			var showButton = this.getUIControl("showMsgeBtnId");
			showButton.firePress();
		},
		/*
		 * Close Message PopOver
		 */
		closeMessagePopOver: function () {
			//Initialize Message PopOver for the first time
			var messageModel = this.modelAssignment("MessagePopOver");
			if (!Formatter.validateDataInModels(messageModel)) {
				messageModel.setData(this.getOwnerComponent().getModel().getProperty("/messagedata"));
			}
			var data = messageModel.getData();
			data = (data.length > 0) ? [data[0]] : [];
			messageModel.setData(data);
		},
		/**
		 * Handle Navigation
		 */
		handleNav: function (target) {
			var navCon = this.getUIControl("claimNav");
			if (target) {
				navCon.to(this.getUIControl(target), "slide");
			}
		},
		/**
		 * Handle Routing
		 */
		handleRouting: function (target, navObj) {
			this.oRouter = this.getOwnerComponent().getRouter();
			if (!navObj) {
				navObj = {};
			}
			if (!navObj.layout) {
				navObj.layout = this.getOwnerComponent().getHelper().getNextUIState(1).layout;
			}
			this.oRouter.navTo(target, navObj);
		},
		_fnULUgeneratefilter: function (param) {
			var oData = this.AppModel.getProperty("/oSelectedProf");
			var oLogData = this.AppModel.getProperty("/oPrimaryData/staffInfo");
			var oClaimType = this.AppModel.getProperty("/claimRequest/claimTypeList");
			var aFilters, dynamicFilters = [],
				key = "",
				ULUkey = "",
				FDLUkey = "";
			if (oClaimType && oClaimType.length > 0) {
				ULUkey = oClaimType[0].CONFIG_KEY === "OPWN" ? "ULU" : "ULU_C";
				FDLUkey = oClaimType[0].CONFIG_KEY === "OPWN" ? "FDLU" : "FDLU_C";
			}
			if (oData === "CW_REPORTING_MGR" || oData === "CW_MANAGERS_MGR" || oData === "CW_HRP") {
				var key = oData === "CW_REPORTING_MGR" ? "RM_STF_N" : oData === "CW_HRP" ? "HRP_STF_N" : "RMM_STF_N";
				dynamicFilters.push(new sap.ui.model.Filter(key, sap.ui.model.FilterOperator.EQ, oLogData.STAFF_ID));
			}
			/*else if (oData === "CW_HRP") {
				var oStaffList = this.AppModel.getProperty("/hrpStaffList");
				if (oStaffList.length <= 50) {
					for (var i = 0; i < oStaffList.length; i++) {
						aFilters = [];
						aFilters.push(new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.EQ, oStaffList[i].STAFF_ID));
						if (aFilters.length > 0)
							dynamicFilters.push(new sap.ui.model.Filter(aFilters, true));
					}
				}
			}*/
			else if (oData === "CW_PROGRAM_ADMIN") {
				aFilters = [];
				aFilters.push(new sap.ui.model.Filter(ULUkey, sap.ui.model.FilterOperator.EQ, oLogData.primaryAssignment.ULU_C));
				aFilters.push(new sap.ui.model.Filter(FDLUkey, sap.ui.model.FilterOperator.EQ, oLogData.primaryAssignment.FDLU_C));
				dynamicFilters.push(new sap.ui.model.Filter(aFilters, true));
			} else {
				for (var i = 0; i < oLogData.inboxApproverMatrix.length; i++) {
					aFilters = [];
					if (oLogData.inboxApproverMatrix[i].ULU_C !== "ALL" && oLogData.inboxApproverMatrix[i].STAFF_USER_GRP === oData) {
						aFilters.push(new sap.ui.model.Filter(ULUkey, sap.ui.model.FilterOperator.EQ, oLogData.inboxApproverMatrix[i].ULU_C)); //testing ULU	
					}

					if (oLogData.inboxApproverMatrix[i].FDLU_C !== "ALL" && oLogData.inboxApproverMatrix[i].STAFF_USER_GRP === oData) {
						aFilters.push(new sap.ui.model.Filter(FDLUkey, sap.ui.model.FilterOperator.EQ, oLogData.inboxApproverMatrix[i].FDLU_C)); //testing FDLU	
					}

					if (aFilters.length > 0)
						dynamicFilters.push(new sap.ui.model.Filter(aFilters, true));
				}

			}
			if (param === "E" && oData !== "CW_OHRSS" && oData !== "CW_HRP") {
				var andFilter = []
				var orFilter = new sap.ui.model.Filter([
					new sap.ui.model.Filter("SUBMITTED_BY", sap.ui.model.FilterOperator.EQ, oLogData.STAFF_ID),
					new sap.ui.model.Filter("STAFF_ID", sap.ui.model.FilterOperator.EQ, oLogData.STAFF_ID)
				], false);
				andFilter.push(new sap.ui.model.Filter(orFilter, false));
				dynamicFilters.push(new sap.ui.model.Filter(andFilter, true));
			}
			return dynamicFilters;
		},

		_fnHRPstaff: function (data) {
			var aFilters = [],
				dynamicFilters = [];
			var oLogData = this.AppModel.getProperty("/oPrimaryData/staffInfo");
			var filterStaffId = new sap.ui.model.Filter("HRP_STF_N", sap.ui.model.FilterOperator.EQ, oLogData.STAFF_ID);
			var oDataModel = this.getOwnerComponent().getModel("OfnReportSrvModel");
			oDataModel.read("/HrpUserLookups", {
				urlParameters: {
					"$select": "FULL_NM,HRP_STF_N,STAFF_ID"
				},
				filters: [filterStaffId],
				success: function (oData) {
					if (oData.results.length > 0) {
						this.AppModel.setProperty("/hrpStaffList", oData.results);
					}
				}.bind(this),
				error: function (oError) {}.bind(this)
			});
		},

		_fnFDLUgeneratefilter: function () {
			var oData = this.AppModel.getProperty("/oSelectedProf");
			var oLogData = this.AppModel.getProperty("/oPrimaryData/staffInfo");
			var aFilters, dynamicFilters = [];
			if (oData === "CW_HRP" || oData === "CW_OHRSS" || oData === "CW_DEPARTMENT_ADMIN" || oData === "CW_PROGRAM_MANAGER") {
				if ((oLogData.approverMatrix).some(obj => obj.FDLU_C !== "ALL")) {
					(oLogData.approverMatrix).forEach(function (value) {
						dynamicFilters.push(new sap.ui.model.Filter("FDLU_C", sap.ui.model.FilterOperator.EQ, value.FDLU_C));
					});
				}
			}
			return dynamicFilters;
		},

		/**
		 * Model Assignment Function
		 */
		modelAssignment: function (modelName, objAssign) {
			var view = this.getView();
			var model = view.getModel(modelName);
			if (!model) {
				if (objAssign) {
					model = new JSONModel(objAssign);
				} else {
					model = new JSONModel();
				}
				view.setModel(model, modelName);
			}
			return model;
		},
		/**
		 * Get Employee Data
		 */
		getEmployeeData: function (employeeId, userList) {
			var employeeData = {};
			for (var i = 0; i < userList.length; i++) {
				if (employeeId === userList[i].userId) {
					employeeData = userList[i];
					break;
				}
			}
			return employeeData;
		},
		/**
		 * Parse Object
		 */
		parseJsonData: function (data) {
			if (data) {
				data = JSON.parse(JSON.stringify(data));
			}
			return data;
		},
		//Util Operation to Validate Date in the Appn
		checkDate: function (oEvent, srcMsgStrip, fragmentId) {
			srcMsgStrip = (srcMsgStrip) ? srcMsgStrip : (this.selectedIconTab === "Contract") ? "contractMsgStrip" : (this.selectedIconTab ===
				"Terminate") ? "terminateMsgStrip" : (this.selectedIconTab === "Ship Change") ? "shipMsgStrip" : "recruitMsgStrip";
			this.closeMessageStrip(srcMsgStrip);
			if (!(Formatter.validateEnteredDate(oEvent.getParameter("id"), oEvent.getParameter("valid")))) {
				this.showMessageStrip(srcMsgStrip, "Please select current or future date", "E", fragmentId);
			}
		},

		/**
		 * Confirmation to submit
		 */
		confirmOnAction: function (submissionCallBack) {
			var dialog = new sap.m.Dialog({
				title: "Confirmation",
				state: "Information",
				type: "Message",
				content: new sap.m.Text({
					text: "Do you want to Submit?"
				}),
				beginButton: new sap.m.Button({
					text: "Yes",
					press: function () {
						dialog.close();
						submissionCallBack();
					}
				}),
				endButton: new sap.m.Button({
					text: 'No',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});
			dialog.open();
		},
		/*
		 * Show Message Strip
		 */
		showMessageStrip: function (stripId, message, mType, fragmentId) {
			var mStrip = this.getUIControl(stripId, fragmentId);
			mStrip.setText(message);
			mStrip.setType((mType === "E") ? "Error" : "None");
			mStrip.setVisible(true);
		},
		/**
		 * Show Message List in a Dialog 
		 */
		showMassUploadErrorDialog: function (errorMessageList) {
			if (this.errorDialog) {
				this.errorDialog.destroy(true);
			}
			this.errorDialog = sap.ui.xmlfragment(
				"com.stengglink.billingrequest.view.fragments.display.MassUploadErrorDialog", this);
			this.getView().addDependent(this.errorDialog);
			this.modelAssignment("ErrorMessageModel").setData(errorMessageList);
			// this.errorDialog.setModel(new JSONModel({
			// 	"errorList": errorMessageList
			// }));
			this.errorDialog.open();
		},
		closeMassErrorDialog: function () {
			if (this.errorDialog) {
				this.errorDialog.destroy(true);
			}
		},

		/*
		 * Set Busy Indicators
		 */
		loadBusyIndicator: function (content, isBusy) {
			var pageContent = this.getView().byId(content);
			pageContent = (pageContent) ? pageContent : sap.ui.getCore().byId(content);
			pageContent.setBusy(isBusy);
		},
		/**
		 * Fetch control
		 */
		getUIControl: function (id, fragmentId) {
			var view = this.getView();
			var control = (fragmentId) ? Fragment.byId(fragmentId, id) : (view.byId(id)) ? view.byId(id) : sap.ui.getCore().byId(id);
			return control;
		},
		formatAmount: function (val) {
			return Formatter.formatRequestAmount(val);

		},
		_convertToUTC: function (o) {
			if (!o) {
				return o;
			}
			var _ = new Date(o.getTime());
			_.setMinutes(_.getMinutes() - o.getTimezoneOffset());
			return _;
		},

		displayMonth: function (month, year) {
			var monthNames = [
				"Jan", "Feb", "Mar", "Apr",
				"May", "Jun", "Jul", "Aug",
				"Sep", "Oct", "Nov", "Dec"
			];
			var i = Number(month - 1);
			return monthNames[i] + "-" + year;
		},

		showBusyIndicator: function (milliseconds) {
			var delay = milliseconds || 0;
			sap.ui.core.BusyIndicator.show(delay);
		},

		hideBusyIndicator: function () {
			sap.ui.core.BusyIndicator.hide();
		}

	});
}, true);