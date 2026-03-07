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
				//	eclaimAuthToken: "/authorize?username=",
				eclaimAuthToken: "/tokenauthorize?username=",
				userDetails: "/rest/utils/getUserDetails",
				//	fetchPhotoUser: "/rest/eclaims/photo/api",
				fetchPhotoUser: "/rest/photo/api",
				fetchFilterLookup: "/rest/eclaims/filter",
				taskProcessHistory: "/rest/inbox/getProcessTrackerDetails?draftId=",
				taskProcessHistoryNew: "/rest/inbox/getProcessTrackerForNewNChangeRequests?draftId=",
				metadataClaims: "/odata/eclaims",
				eclaimRequestViewCount: "/EclaimRequestViews/$count",
				statusConfig: "/StatusConfigs",
				chrsJobInfo: "/ChrsJobInfos",
				fetchClaimType: "/rest/eclaims/fetchClaimTypes?staffId=",
				caStaffLookUp: "/rest/eclaims/caStaffLookup",
				fetchDraftClaim: "/rest/eclaims/draftEclaimData",
				postClaim: "/rest/eclaims/singleRequest",
				requestLock: "/rest/eclaims/requestLock",
				checkWbs: "/rest/eclaims/ecpwbsvalidate",
				authorizeTokenNew: "/tokenauthorize",
				cwsAppConfigs: "/CwsAppConfigs",
				paymentDetails:"/rest/opwn/retrieveMassPaymentList"
			}

		};
	});