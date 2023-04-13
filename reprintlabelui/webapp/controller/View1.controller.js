sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageToast',
    'sap/m/MessageBox',
    'sap/ui/core/BusyIndicator',
    "sap/ui/core/routing/History"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageToast, MessageBox, BusyIndicator, History) {
        "use strict";

        return Controller.extend("uk.co.brakes.rf.reprintlabelui.controller.View1", {
            onInit: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                this.appModulePath = jQuery.sap.getModulePath(appPath);

                this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
            },

            onAfterRendering: function () {
                BusyIndicator.show(500);
                this.byId("warehouseCombobox").getBinding("items").attachEvent("dataReceived", this.setDefaultWarehouse.bind(this));

                var eanToModel = new JSONModel();
                sap.ui.getCore().setModel(eanToModel, "eanToModel");

                var materialToModel = new JSONModel();
                sap.ui.getCore().setModel(materialToModel, "materialToModel");

                var useridToModel = new JSONModel();
                sap.ui.getCore().setModel(useridToModel, "useridToModel");

                var whToModel = new JSONModel();
                sap.ui.getCore().setModel(whToModel, "whToModel");
            },

            _onRouteMatched: function (oEvent) {
                this.searchEan = "",
                    this.searchMat = "",
                    this.searchUser = "";

                this.getView().byId("searchSegmentedBtn").setSelectedKey("ean");

                var oSearchFld = this.getView().byId("searchToFld");
                oSearchFld.setPlaceholder("Scan EAN");
                oSearchFld.setValue("");
                jQuery.sap.delayedCall(400, this, function () {
                    oSearchFld.focus();
                });
            },

            /** this function is for setting the default Warehouse for a user 
             * based on the default maintained in the BE
             * @param {*} oEvent
             */
            setDefaultWarehouse: function (oEvent) {
                BusyIndicator.hide();
                var oData = oEvent.getParameters("data").data.results;
                if (oData.length > 0) {
                    for (var i = 0; i < oData.length; i++) {
                        if (oData[i].Default == 'X') {
                            this.getView().byId("warehouseCombobox").setSelectedKey(oData[i].WarehouseNo);
                            break;
                        } else {
                            this.getView().byId("warehouseCombobox").setSelectedKey(oData[0].WarehouseNo);
                        }
                    }
                    var oSearchFld = this.getView().byId("searchToFld");
                    jQuery.sap.delayedCall(400, this, function () {
                        oSearchFld.focus();
                    });
                } else {
                    MessageBox.error("Failed to load the Warehouses.");

                    var oWHFilter = this.getView().byId("warehouseCombobox");
                    jQuery.sap.delayedCall(300, this, function () {
                        oWHFilter.focus();
                    });
                }
            },

            onSelectWarehouse: function (oEvent) {

            },

            onSelectSegmentedBtn: function (oEvent) {
                var oSearchFld = this.getView().byId("searchToFld");
                oSearchFld.setValue("");

                jQuery.sap.delayedCall(400, this, function () {
                    oSearchFld.focus();
                });

                var sKey = oEvent.getSource().getSelectedKey();
                switch (sKey) {
                    case "ean":
                        this.getView().byId("searchToFld").setPlaceholder("Scan EAN");
                        break;
                    case "material":
                        this.getView().byId("searchToFld").setPlaceholder("Enter Material");
                        break;
                    case "userid":
                        this.getView().byId("searchToFld").setPlaceholder("Enter User ID");
                        break;
                    default:
                        this.getView().byId("searchToFld").setPlaceholder("Scan EAN");
                        break;
                }
            },

            onSearchSubmit: function (oEvent) {
                var sKey = this.getView().byId("searchSegmentedBtn").getSelectedKey();
                var searchVal = this.getView().byId("searchToFld").getValue();

                if(sKey === "ean" && searchVal !== ""){
                    this.onSearchTo();
                }
            },

            onSearchTo: function (oEvent) {
                var that = this;

                var sKey = this.getView().byId("searchSegmentedBtn").getSelectedKey();
                var searchVal = this.getView().byId("searchToFld").getValue();
                this.searchEan = "",
                this.searchMat = "",
                this.searchUser = "";

                switch (sKey) {
                    case "ean":
                        if (searchVal) {
                            this.searchEan = searchVal;
                        }
                        break;
                    case "material":
                        if (searchVal) {
                            this.searchMat = searchVal;
                        }
                        break;
                    case "userid":
                        if (searchVal) {
                            this.searchUser = searchVal.toUpperCase();
                        }
                        break;
                    default:
                        if (searchVal) {
                            this.searchEan = searchVal;
                        }
                        break;
                }

                var sWarehouse = this.getView().byId("warehouseCombobox").getSelectedKey();
                if (this.searchEan) {
                    //trigger ajax call for ean search
                    var url = this.appModulePath + "/sap/opu/odata/sap/ZRF_REPRINT_LABEL_SRV/TOListSet?$filter=Warehouse eq '" + sWarehouse + "' and EAN eq '" + this.searchEan + "'";
                    BusyIndicator.show(500);
                    $.ajax({
                        url: url,
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        success: function (oData, response) {
                            BusyIndicator.hide();
                            var aOpenToItems = oData.d.results;
                            if (aOpenToItems.length > 0) {
                                sap.ui.getCore().getModel("eanToModel").setData(aOpenToItems);

                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                that.getOwnerComponent().getRouter().navTo("ToList");
                            } else {
                                sap.ui.getCore().getModel("eanToModel").setData("");
                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                MessageToast.show("There are no open Transfer Order items for your selection");

                            }

                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            BusyIndicator.hide();
                            var err = textStatus;
                            MessageBox.error("An error occurred while fetching the data.")
                        }
                    }, this);
                } else if (this.searchMat) {
                    //trigger ajax call for material search
                    var url = this.appModulePath + "/sap/opu/odata/sap/ZRF_REPRINT_LABEL_SRV/TOListSet?$filter=Warehouse eq '" + sWarehouse + "' and MaterialNo eq '" + this.searchMat + "'";
                    BusyIndicator.show(500);
                    $.ajax({
                        url: url,
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        success: function (oData, response) {
                            BusyIndicator.hide();
                            var aOpenToItems = oData.d.results;

                            if (aOpenToItems.length > 0) {
                                sap.ui.getCore().getModel("materialToModel").setData(aOpenToItems);

                                sap.ui.getCore().getModel("eanToModel").setData("");
                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                that.getOwnerComponent().getRouter().navTo("ToList");
                            } else {
                                sap.ui.getCore().getModel("eanToModel").setData("");
                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                MessageToast.show("There are no open Transfer Order items for your selection");

                            }

                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            BusyIndicator.hide();
                            var err = textStatus;
                            MessageBox.error("An error occurred while fetching the data.")
                        }
                    }, this);
                } else if (this.searchUser) {
                    //trigger ajax call for user id search
                    var url = this.appModulePath + "/sap/opu/odata/sap/ZRF_REPRINT_LABEL_SRV/TOListSet?$filter=Warehouse eq '" + sWarehouse + "' and UserID eq '" + this.searchUser + "'";
                    BusyIndicator.show(500);
                    $.ajax({
                        url: url,
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        success: function (oData, response) {
                            BusyIndicator.hide();
                            var aOpenToItems = oData.d.results;
                            if (aOpenToItems.length > 0) {
                                sap.ui.getCore().getModel("useridToModel").setData(aOpenToItems);

                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("eanToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                that.getOwnerComponent().getRouter().navTo("ToList");

                            } else {
                                sap.ui.getCore().getModel("eanToModel").setData("");
                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                MessageToast.show("There are no open Transfer Order items for your selection");
                            }

                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            BusyIndicator.hide();
                            var err = textStatus;
                            MessageBox.error("An error occurred while fetching the data.")
                        }
                    }, this);
                } else {
                    //trigger ajax call for user id search
                    var url = this.appModulePath + "/sap/opu/odata/sap/ZRF_REPRINT_LABEL_SRV/TOListSet?$filter=Warehouse eq '" + sWarehouse + "'";
                    BusyIndicator.show(500);
                    $.ajax({
                        url: url,
                        type: "GET",
                        contentType: "application/json",
                        dataType: "json",
                        success: function (oData, response) {
                            BusyIndicator.hide();
                            var aOpenToItems = oData.d.results;
                            if (aOpenToItems.length > 0) {
                                sap.ui.getCore().getModel("whToModel").setData(aOpenToItems);

                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("eanToModel").setData("");

                                that.getOwnerComponent().getRouter().navTo("ToList");
                            } else {
                                sap.ui.getCore().getModel("eanToModel").setData("");
                                sap.ui.getCore().getModel("materialToModel").setData("");
                                sap.ui.getCore().getModel("useridToModel").setData("");
                                sap.ui.getCore().getModel("whToModel").setData("");

                                MessageToast.show("There are no open Transfer Order items for your selection");
                            }

                        },
                        error: function (jqXHR, textStatus, errorThrown) {
                            BusyIndicator.hide();
                            var err = textStatus;
                            MessageBox.error("An error occurred while fetching the data.")
                        }
                    }, this);
                }
            }


        });
    });
