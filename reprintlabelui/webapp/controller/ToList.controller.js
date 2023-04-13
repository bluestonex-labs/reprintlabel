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

        return Controller.extend("uk.co.brakes.rf.reprintlabelui.controller.ToList", {
            onInit: function () {
                var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
                var appPath = appId.replaceAll(".", "/");
                this.appModulePath = jQuery.sap.getModulePath(appPath);

                this.getOwnerComponent().getRouter().getRoute("ToList").attachPatternMatched(this._onPatternMatched, this);
            },

            _onPatternMatched: function (oEvent) {
                /*set models */
                var sToByEanModel = sap.ui.getCore().getModel("eanToModel");
                if(sToByEanModel.getData().length > 0){
                    this.getView().setModel(sToByEanModel, "openToModel");
                }

                var sToByMaterialModel = sap.ui.getCore().getModel("materialToModel");
                if(sToByMaterialModel.getData().length > 0){
                    this.getView().setModel(sToByMaterialModel, "openToModel");
                }

                var sToByUserIdModel = sap.ui.getCore().getModel("useridToModel");
                if(sToByUserIdModel.getData().length > 0){
                    this.getView().setModel(sToByUserIdModel, "openToModel");
                }

                var sWhToModel = sap.ui.getCore().getModel("whToModel");
                if(sWhToModel.getData().length > 0){
                    this.getView().setModel(sWhToModel, "openToModel");
                }

                /*clear print fields */
                this.clearPrintFields();

                /*scroll to top of the list on all navigations */
                this.getView().byId("openToList").scrollToIndex(0);

                this.showConnectedPrinter();
                var printerFld = this.getView().byId("scanPrinter");
                var printerId = printerFld.getValue();
                if(!printerId){
                    this.blockUnblockToList("BLOCK");
                    jQuery.sap.delayedCall(400, this, function () {
                        printerFld.focus();
                    });
                }else{
                    this.blockUnblockToList("UNBLOCK");
                }
            },

            blockUnblockToList: function(state){
                var toList = this.getView().byId("openToList");
                if(state === "BLOCK"){
                    for(var i = 0 ; i < toList.getItems().length; i++){
                        toList.getItems()[i].setBlocked(true);
                    }
                }else if(state === "UNBLOCK"){
                    for(var i = 0 ; i < toList.getItems().length; i++){
                        toList.getItems()[i].setBlocked(false);
                    }
                }
            },
            
            showConnectedPrinter: function () {
                var printerModel = sap.ui.getCore().getModel("printerModel");
                if (printerModel !== undefined) {
                    var macAddress = printerModel.getProperty("/macAddress");
                    macAddress = this.deFormatIpAddress(macAddress);
                    if(macAddress !== ""){
                        this.getView().byId("scanPrinter").setValue(macAddress);
                    }else{
                        this.getView().byId("scanPrinter").setValue("");
                    }
                }
            },

            onScanPrinter: function(oEvent){
                /*var printerModel = new sap.ui.model.json.JSONModel({
                    macAddress: ""
                });
                sap.ui.getCore().setModel(printerModel, 'printerModel'); */

                var label, scannedDevice, macAddress, printerModel;
                //macAddress, description, barcode, date, pickLoc, po, item, units, expiry, tiHi, ucn;
                this.btDevices = [];
                var that = this;
                if (top.cordova && top.cordova.plugins && top.ble) {
                    var sScannedValue = oEvent.getSource().getValue();
                    macAddress = this.formatIpAddress(sScannedValue);
                    this.bDeviceConnected = false;

                    printerModel = sap.ui.getCore().getModel("printerModel");
                    if (printerModel !== undefined) {
                        printerModel.setProperty("/macAddress", macAddress);
                        sap.ui.getCore().getModel("printerModel").refresh(true);
                    }else{
                        printerModel = new sap.ui.model.json.JSONModel({
                            macAddress: ""
                        });
                        sap.ui.getCore().setModel(printerModel, 'printerModel'); 
                        printerModel.setProperty("/macAddress", macAddress);
                        sap.ui.getCore().getModel("printerModel").refresh(true);
                    }

                    if (macAddress !== "") {
                        BusyIndicator.show(500);
                        top.ble.connect(macAddress, function (message) {
                            that.blockUnblockToList("BLOCK");
                            top.ble.isConnected(macAddress,
                                function () {
                                    BusyIndicator.hide();
                                    MessageToast.show("Printer is connected");

                                    that.bDeviceConnected = true;

                                    that.blockUnblockToList("UNBLOCK");

                                },

                                function (oError) {
                                    BusyIndicator.hide();
                                    MessageToast.show("Entered Printer not connected.");

                                    that.blockUnblockToList("BLOCK");
                                }
                            );
                        },
                            function (oErr) {
                                BusyIndicator.hide();
                                if (!that.bDeviceConnected) {
                                    MessageToast.show("Entered Printer not connected.");
                                    
                                    that.blockUnblockToList("BLOCK");
                                }
                            });
                    } else {
                        BusyIndicator.hide();
                        MessageToast.show("Bluetooth pairing failed.");
                        that.blockUnblockToList("BLOCK");
                    }
                } else {
                    MessageToast.show("Cordova not defined.");
                    that.blockUnblockToList("BLOCK");
                } 
            },

            formatIpAddress: function(sValue){
                /*123456 -> 12:34:56 */
                var sAddress = sValue.replace(/.(?=(..)+$)/g, '$&:');
                return sAddress;
            },

            deFormatIpAddress: function(sValue){
                /*12:34:56 -> 123456*/
                var sAddress = sValue.replace(/[:]/g, "");
                return sAddress;
            },

            onPressTo: function (oEvent) {
                var that = this;
                var sPath = oEvent.getSource().oBindingContexts.openToModel.getPath();
                var oToItem = this.getView().getModel("openToModel").getProperty(sPath);
                var sLgnum = oToItem.Warehouse;
                var sTanum = oToItem.TONumber;
                var sTapos = oToItem.TOItem;
                var oPrinter = this.getView().byId("scanPrinter").getValue();
                if (oPrinter !== "" && oPrinter !== undefined && oPrinter !== null) {
                    MessageBox.confirm("Proceed with the reprinting of the label?", {
                        onClose: function (sAction) {
                            if (sAction === "OK") {
                                BusyIndicator.show(500);
                                that.fetchPrintData(sTanum, sTapos, sLgnum);
                                //MessageToast.show("The label has been reprinted");
                            } else if (sAction === "CANCEL") {
                                MessageToast.show("The reprinting of the label has been cancelled");
                            }
                        }
                    });
                } else {
                    MessageBox.error("The printer is not connected. Please connect to a printer before proceeding.");
                }
            },

            fetchPrintData:function(sTanum, sTapos, sLgnum){
                var that = this;
                var url = this.appModulePath + "/sap/opu/odata/sap/ZRF_REPRINT_LABEL_SRV/GRNLabelSet(Tanum='" + sTanum + "',Tapos='" + sTapos + "',Lgnum='" + sLgnum + "')";
                BusyIndicator.show(500);
                $.ajax({
                    url: url,
                    type: "GET",
                    contentType: "application/json",
                    dataType: "json",
                    success: function (oData, response) {
                        //BusyIndicator.hide();
                        that.mapPrintFields(oData.d);
                        that.printLabel();
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        BusyIndicator.hide();
                        var err = textStatus;
                        MessageBox.error("An error occurred while fetching the label data.")
                    }
                }, this);
            },

            mapPrintFields: function (oData) {
                console.log(oData);
                //this.barcode = oData.Nlenr;
                this.barcode = oData.Lgnum + "-" + oData.Tanum + "-" + oData.Tapos;
                
                this.matDesc = oData.Maktx;
                var creationDate = new Date();
                this.date = creationDate.getDate().toString() + "/" + (creationDate.getMonth() + 1).toString() + "/" + creationDate.getFullYear().toString();
                this.pickLoc = oData.Lgpla;
                this.po = oData.Ebeln;

                //this.po = this.getView().byId("poPanel").getHeaderText();
                this.item = oData.Matnr;
                this.unitsCase = parseInt(oData.Vdifm) + " UN =  1 CS";

                var dateString = oData.Vfdat;
                
                var year = dateString.substring(0, 4);
                var month = dateString.substring(4, 6);
                var day = dateString.substring(6, 8);

                this.expiry = day + "/" + month + "/" + year;

                this.destStoreBin = oData.Nlpla;
                this.qty = (parseInt(oData.Vsolm).toFixed()).toString();

                //Nlenr = SU / barcode

            },

            printLabel: function () {
                var scannedDevice, destBin, actualQty, destUnit, macAddress, description, barcode, date, pickLoc, po, item, units, expiry;
                description = this.matDesc;
                barcode = this.barcode;
                // destUnit = "LP:8460277";
                date = this.date;
                pickLoc = this.pickLoc;
                po = this.po;
                item = this.item;
                units = this.unitsCase;
                destBin = this.destStoreBin;
                actualQty = this.qty;
                expiry = this.expiry;
                //    this.btDevices = [];
                
var label = ' CT~~CD,~CC^~CT~\
^XA\
^PMN\
^CI27\
^XZ\
^XA\
^FO0,372^GFA,673,4704,16,:Z64:eJztVkGOwyAMNFGROCZSuaN9SVba3FPJ/CfHPHudXsoMLajqsRn1QqYTGzM2ETlx4tugtN63cjW6PAM9DKj2eS3XQTbQr9EBn+6/gvcC/BbsFQ+4NSIvGN7ejxsgvbCe42dFPuwC+ccV86fw4mc/0yPQWwGlBZfpwY7LmFFP5Ze4UP4Bee3s/+P6+2b9Kz3HV+84/61cZ+IHKkDM6M+wo3+Nx4R/Eq6zjvIabnUYn6Hiyf8B4mdzECowfvyl/DY0gF9ITvXn9mT/VP5KtObdgX98NhT/GAasP/NWfah/PNCqbxdumlBP5+8zzZ/6/Nl/AL3GGfToP8fzq/L/9b3+SXX/vdU/df/Nzflr87vpv9pAYADb\
/CQtNO0j9e1C0eXa0ccbzT/ic+f8mX8bvP2q/2iHOzZgNX8Ime6PQPeHSnv+rHQEm5B/pOM/OqKenqHEc/6xmn8l7vNjLtQ8Pzrz56Kq3fP9aP50we1DsPnXol3Hn9PN0Hr9UaB2+FYCR/iW3h3he+fXDD/a+H59AHfv+7+X/CQmn8oWxPa7WgKihYEDtt9o9XGlPqUfeMGR/lLED3X7uvIC4s+PnPXSiG/1VbjAUkrEr36ZHw9oeh18qX/29aP60Nfpq2uUz2pv1X9dfnly/xJg90/QkZ848TX4B9etbcA=:DFBD\
^BY2,3,160^FT244,775^BCB,,Y,N\
^FH\^FD' + barcode + '^FS\
^FO306,58^GB134,922,8^FS\
^FT400,1029^A0B,79,79^FB1029,1,20,C^FH\^CI28^FD' + destBin + '^FS^CI27\
^FO434,58^GB115,922,8^FS\
^FT466,968^A0B,25,25^FH\^CI28^FDDate: ' + date + '^FS^CI27\
^FT296,1037^A0B,25,25^FB1037,1,6,C^FH\^CI28^FD' + description + '^FS^CI27\
^FT499,966^A0B,25,25^FH\^CI28^FDPick Loc: ' + pickLoc + '^FS^CI27\
^FT532,966^A0B,25,25^FH\^CI28^FDSN / PO: ' + po + '^FS^CI27\
^FT465,511^A0B,25,25^FH\^CI28^FDItem: ' + item + '^FS^CI27\
^FT498,509^A0B,25,25^FH\^CI28^FDUnits / Case: ' + units + '^FS^CI27\
^FT531,509^A0B,25,25^FH\^CI28^FDExpiry: ' + expiry + "           " + actualQty +  '^FS^CI27\
^FO436,515^GB109,0,8^FS\
^PQ1,,,Y\
^XZ';

                var that = this;
                var printerModel = sap.ui.getCore().getModel("printerModel");
                if (printerModel !== undefined) {
                    var macAddress = printerModel.getProperty("/macAddress");

                    top.cordova.plugins.zbtprinter.print(macAddress, label,
                        function (success) {
                            BusyIndicator.hide();
                            MessageToast.show("Print success: " + success);
                        }, function (fail) {
                            BusyIndicator.hide();
                            MessageToast.show("Print fail:" + fail);
                        });
                       //history.go(-1);
                }else{
                    BusyIndicator.hide();
                    MessageBox.warning("Failed to load printer configuration, please reconnect printer and try again!");
                }
            },

            clearPrintFields: function () {
                this.matDesc = "";
                this.date = "";
                this.pickLoc = "";
                this.po = "";
                this.item = "";
                this.unitsCase = "";
                this.expiry = "";
                this.destStoreBin = "";
                this.qty = "";
            },

            /* formatters */
            removeDecimal: function (sValue) {
                if (sValue !== "") {
                    var sNewValue = parseInt(sValue);
                    return sNewValue;
                } else {
                    return "";
                }
            },

            formatTime: function (sTime) {
                if (sTime !== "" && sTime !== undefined) {
                    sTime = sTime.slice(0, -2);
                    var time = sTime.replace(/.(?=(..)+$)/g, '$&:');
                    var sLoadTime = time;
                    return sLoadTime;
                } else {
                    return "";
                }
            },

            formatDate: function (sDate) {
                if (sDate !== "" && sDate !== undefined) {
                    var dateString = sDate;
                    var year = dateString.substring(0, 4);
                    var month = dateString.substring(4, 6);
                    var day = dateString.substring(6, 8);

                    var date = day + "-" + month + "-" + year;
                    var sBookingDate = date;
                    return sBookingDate;
                } else {
                    return "";
                }
            }

        });
    });