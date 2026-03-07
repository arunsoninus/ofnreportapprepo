/*global QUnit*/

sap.ui.define([
	"nus/edu/sg/ofnreport/controller/OfnReportHome.controller"
], function (Controller) {
	"use strict";

	QUnit.module("OfnReportHome Controller");

	QUnit.test("I should test the OfnReportHome controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
