sap.ui.define([],
	function () {

		return {
			getRandomNumber: function () {
				return Math.floor(Math.random() * Math.floor(5));
			},
			taskOperations: {},
			gwTaskOperations: {},
			sfOperations: {},
			processOperations: {},
			dbOperations: {
				userDetails: "/getUserDetails()",
				photoApi: "/getPhoto",
				//	fetchPhotoUser: "/rest/eclaims/photo/api",
				// fetchFilterLookup: "/rest/eclaims/filter",
				cwsRequestViewApi : "/cwsRequestViews",
				taskProcessHistory: "/rest/inbox/getProcessTrackerDetails?draftId=",
				taskProcessHistoryNew: "/getProcessTrackerForNewNChangeRequests",
				// metadataClaims: "/odata/eclaims",
				statusConfig: "/statusconfig_data",
				chrsJobInfo: "/v_active_inactive_user_lookup",
				// fetchClaimType: "/rest/eclaims/fetchClaimTypes?staffId=",
				// caStaffLookUp: "/rest/eclaims/caStaffLookup",
				// fetchDraftClaim: "/rest/eclaims/draftEclaimData",
				checkWbs: "/ecpwbsvalidate",
				cwsAppConfigs: "/cwsappconfig_data",
				paymentDetails:"/retrieveMassPaymentList"
			}

		};
	});