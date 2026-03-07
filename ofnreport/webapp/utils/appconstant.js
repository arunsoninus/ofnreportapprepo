sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"./configuration"
], function (JSONModel, Device, Config) {
	"use strict";

	return {
		"claimAuthorizations": [],
		"sClaimaintListUluFdlu": "",
		"lkSelection": {},
		"processNode": {
			"nodes": [],
			"lanes": []
		},
		"errorMessage": [],
		"token": null,
		"loggedInUserId": null,
		"loggedInUserInfo": {},
		"visibility": {
			"ClaimTypeDialog": {
				"claimTypeDialogStaffId": false
					// "proceedButton" : false,
					// "massuploadButton" : false
			},
			"ClaimDetailView": {
				"Date": true,
				"StartDate": false,
				"EndDate": false,
				"StartTime": true,
				"EndTime": true,
				"SelectDates": false,
				"UluFdluSelection": false
			}
		},
		"userRole": null,
		"staffList": [],
		"claimsList": [],
		"otherAssignments": [],
		"months": {
			"JANUARY": "01",
			"FEBRUARY": "02",
			"MARCH": "03",
			"APRIL": "04",
			"MAY": "05",
			"JUNE": "06",
			"JULY": "07",
			"AUGUST": "08",
			"SEPTEMBER": "09",
			"OCTOBER": "10",
			"NOVEMBER": "11",
			"DECEMBER": "12"
		},
		"monthNames": ["January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		],
		"days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
		"sortingLookupData": [{
			"key": "STAFF_ID",
			"selectedStatus": false,
			"text": "Staff ID"
		}, {
			"key": "FULL_NM",
			"selectedStatus": false,
			"text": "Staff Name"
		}, {
			"key": "ENG_ULU_T",
			"selectedStatus": false,
			"text": "Engaging ULU"
		}, {
			"key": "ENG_FDLU_T",
			"selectedStatus": false,
			"text": "Engaging FDLU"
		}, {
			"key": "SUBMITTED_BY_NID",
			"selectedStatus": false,
			"text": "Submitted By"
		}],
		"groupLookupData": [{
			"key": "STAFF_ID",
			"selectedStatus": false,
			"text": "Staff ID"
		}, {
			"key": "FULL_NM",
			"selectedStatus": false,
			"text": "Staff Name"
		}, {
			"key": "ENG_ULU_T",
			"selectedStatus": false,
			"text": "Engaging ULU"
		}, {
			"key": "ENG_FDLU_T",
			"selectedStatus": false,
			"text": "Engaging FDLU"
		}, {
			"key": "SUBMITTED_BY_NID",
			"selectedStatus": false,
			"text": "Submitted By"
		}]
	};
});