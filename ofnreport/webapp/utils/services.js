sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"./configuration", "./headerHelper"
], function (JSONModel, Config, HeaderHelper) {
	"use strict";

	return {

		getUserInfoDetails: function (component, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			let sUrl = Config.dbOperations.userDetails;
			var oHeaders = HeaderHelper._headerToken() || null;

			this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response)
				}.bind(this),
				oHeaders,
				{}
			);
		},

		fetchUserPhoto: function (component, callBackFx) {
			var sUrl = Config.dbOperations.photoApi;
			var staffId = component.OverviewDashboardModel.getProperty("/staffInfo/STAFF_ID");
			component.OverviewDashboardModel.setProperty("/loggedInUserStfNumber", staffId);

			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var oHeaders = HeaderHelper._headerToken();
			let oParameter = {
				userId: staffId
			};

			this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response?.results[0] || {});
				}.bind(component),
				oHeaders,
				oParameter
			);

		},
		// fetchLoggedUserToken: function (sThis, callBackFx) {
		// 	var that = this;
		// 	var userModel = new sap.ui.model.json.JSONModel();
		// 	userModel.loadData("/services/userapi/currentUser", null, false);
		// 	sap.ui.getCore().setModel(userModel, "userapi");
		// 	userModel.dataLoaded().then(function () {
		// 		var sUserName = sap.ui.getCore().getModel("userapi").getData().name;
		// 		// sUserName="<user for debug>";
		// 		sThis.AppModel.setProperty("/loggedInUserId", sUserName);
		// 		that._getUserDetails(sThis, that, sUserName, callBackFx);
		// 	}.bind(sThis));
		// },

		// _getUserDetails: function (sThis, that, sUserName, callBackFx) {
		// 	var oHeaders = {
		// 		"Content-Type": "application/json"
		// 	};
		// 	var Payload = {
		// 		"userName": sUserName
		// 	};

		// 	var authModel = new JSONModel();
		// 	authModel.loadData(Config.dbOperations.authorizeTokenNew, JSON.stringify(Payload), null, "POST", null, null, oHeaders);
		// 	authModel.attachRequestCompleted(function (oResponse) {
		// 		if (oResponse.getParameters().success) {
		// 			var tokenDetails = oResponse.getSource().getData();
		// 			var userDetails = this.getUserInfoDetails(tokenDetails.token);
		// 			Object.assign(userDetails, tokenDetails);
		// 			callBackFx(userDetails);
		// 		} else {
		// 			if (oResponse.getParameters()['errorobject'].statusCode === 503) {
		// 				this.AppModel.setProperty("/ErrorPageDescription", oResponse.getParameters()['errorobject'].responseText);
		// 				this.AppModel.setProperty("/ErrorPageTitle", "Service Maintenance");
		// 				this.AppModel.setProperty("/ErrorPageText", "Please reach out to the admin team if not started working in next 10 minutes.");
		// 				this.oRouter.navTo("NotFound", true);
		// 				return;
		// 			}
		// 		}
		// 	}, this);
		// },

		// getUserInfoDetails: function (userToken) {
		// 	var userInfoModel = new JSONModel();
		// 	var oHeaders = {
		// 		"Accept": "application/json",
		// 		"Authorization": "Bearer" + " " + userToken,
		// 		"AccessPoint": "A",
		// 		"Content-Type": "application/json"
		// 	};
		// 	userInfoModel.loadData(Config.dbOperations.userDetails, null, false, "GET", false, false, oHeaders);
		// 	return userInfoModel.getData();
		// },

		// fetchLoggeInUserImage: function (sThis, callBackFx) {
		// 	var oPhotoModel = new JSONModel();
		// 	var sUrl = Config.dbOperations.fetchPhotoUser;
		// 	var staffId = sThis.AppModel.getProperty("/loggedInUserStfNumber");
		// 	sUrl = sUrl + "?userId=" + staffId;
		// 	// sUrl = sUrl + "?userId=CHELUK";
		// 	//sUrl = sUrl + "?userId=10000027";
		// 	var token = sThis.AppModel.getProperty("/token");
		// 	var oHeaders = {
		// 		"Accept": "application/json",
		// 		"Authorization": "Bearer" + " " + token,
		// 		"AccessPoint": "A",
		// 		"Content-Type": "application/json"
		// 	};
		// 	oPhotoModel.loadData(sUrl, null, null, "GET", null, null, oHeaders);
		// 	oPhotoModel.attachRequestCompleted(function (oResponse) {
		// 		var aPhoto = !oResponse.getSource().getData().d ? [] : oPhotoModel.getData().d.results;
		// 		if (aPhoto.length) {
		// 			callBackFx(oResponse.getSource().getData().d.results[0]);
		// 		} else {
		// 			callBackFx({});
		// 		}
		// 	}.bind(sThis));

		// },

		// fetchUserImageAsync: function (sThis, staffId) {
		// 	var oPhotoModel = new JSONModel();
		// 	var sUrl = Config.dbOperations.fetchPhotoUser;
		// 	sUrl = sUrl + "?userId=" + staffId;
		// 	var token = sThis.AppModel.getProperty("/token");
		// 	var oHeaders = {
		// 		"Accept": "application/json",
		// 		"Authorization": "Bearer" + " " + token,
		// 		"AccessPoint": "A",
		// 		"Content-Type": "application/json"
		// 	};
		// 	oPhotoModel.loadData(sUrl, null, false, "GET", null, null, oHeaders);
		// 	return !oPhotoModel.getData().d ? [] : oPhotoModel.getData().d.results;
		// },

		fetchTaskProcessDetails: async function (component, selectedReq, callBackFx) {
			var UtilitySrvModel = component.getComponentModel("UtilitySrvModel");
			var sUrl = Config.dbOperations.taskProcessHistoryNew;
			var oHeaders = HeaderHelper._headerToken();
			let oParameter = {
				draftId: selectedReq.REQ_UNIQUE_ID,
				requestId: selectedReq.REQUEST_ID,
				processCode: selectedReq.PROCESS_CODE
			};
			await this._readDataUsingOdataModel(
				sUrl,
				UtilitySrvModel,
				component,
				[],
				function (response) {
					callBackFx(response.getProcessTrackerForNewNChangeRequests);
				}.bind(component),
				oHeaders,
				oParameter
			);
		},
		fetchTaskType: function (sThis, callBackFx) {
			var oDataModel = sThis.getOwnerComponent().getModel("CWRunReportSrvModel");
			oDataModel.read("/EclaimsDatas/$count", {
				filters: [],
				success: function (oData) {
					if (oData) {
						// that.getView().byId("itfProcess").setCount(oData);
					}
				},
				error: function (oError) { }
			});
		},

		readLookups: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel = oDataModel ? oDataModel : component.getComponentModel("CWRunReportSrvModel");
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);
					}
				}.bind(component),
				error: function (oError) { }
			});
		},
		_readDataUsingOdataModel: async function (
			serviceUrl,
			oDataModel,
			component,
			aFilter,
			callBackFx,
			headers,
			urlParameter = {}
		) {
			if (!urlParameter) {
				urlParameter = {};
			}
			if (!headers) {
				headers = HeaderHelper._headerToken();
			}
			var p = new Promise(function (resolve, reject) {

				oDataModel.read(serviceUrl, {
					headers: headers,
					urlParameters: urlParameter,
					filters: aFilter,
					success: function (oData) {
						resolve(oData);
					}.bind(component),
					error: function (oError) {
						reject(oError);
					}
				});
			});
			if (typeof callBackFx === "function") {
				p.then(callBackFx).catch(callBackFx);
			}
			return p;
		},

		_loadDataUsingJsonModel: function (serviceUrl, oPayload, httpMethod, headers, callBackFx) {
			var oModel = new JSONModel();
			var sPayload = null;
			if (oPayload) {
				if (httpMethod === "GET") {
					sPayload = oPayload;
				} else {
					sPayload = JSON.stringify(oPayload);
				}
			}
			oModel.loadData(serviceUrl, sPayload, null, httpMethod, null, null, headers);
			oModel.attachRequestCompleted(function (oResponse) {
				callBackFx(oResponse);
			});
		},

		getRequestViewCount: function (serviceUrl, oDataModel, component, aFilter, callBackFx) {
			oDataModel.read(serviceUrl, {
				filters: aFilter,
				success: function (oData) {
					if (oData) {
						callBackFx(oData);
					}
				}.bind(component),
				error: function (oError) { }
			});
		},

	};
});