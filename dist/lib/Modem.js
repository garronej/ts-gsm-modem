"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var AtStack_1 = require("./AtStack");
var SystemState_1 = require("./SystemState");
var CardLockFacility_1 = require("./CardLockFacility");
var CardStorage_1 = require("./CardStorage");
var SmsStack_1 = require("./SmsStack");
var ts_events_extended_1 = require("ts-events-extended");
var ts_exec_queue_1 = require("ts-exec-queue");
var _debug = require("debug");
var debug = _debug("_Modem");
require("colors");
var Modem = (function () {
    function Modem(params, callback) {
        var _this = this;
        this.params = params;
        this.callback = callback;
        this.serviceProviderName = undefined;
        this.runCommand = ts_exec_queue_1.execQueue((function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.atStack.runCommand.apply(_this.atStack, inputs);
        }));
        this.terminate = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.atStack.terminate.apply(_this.atStack, inputs);
        };
        this.pin = undefined;
        this.evtMessage = new ts_events_extended_1.SyncEvent();
        this.evtMessageStatusReport = new ts_events_extended_1.SyncEvent();
        this.sendMessage = ts_exec_queue_1.execQueue((function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!!this.systemState.isNetworkReady) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.systemState.evtNetworkReady.waitFor()];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2:
                            this.smsStack.sendMessage.apply(this.smsStack, inputs);
                            return [2 /*return*/];
                    }
                });
            });
        }));
        this.generateSafeContactName = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.generateSafeContactName.apply(_this.cardStorage, inputs);
        };
        this.getContact = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.getContact.apply(_this.cardStorage, inputs);
        };
        this.createContact = ts_exec_queue_1.execQueue(Modem, "WRITE", (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.createContact.apply(_this.cardStorage, inputs);
        }));
        this.updateContact = ts_exec_queue_1.execQueue(Modem, "WRITE", (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.updateContact.apply(_this.cardStorage, inputs);
        }));
        this.deleteContact = ts_exec_queue_1.execQueue(Modem, "WRITE", (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.deleteContact.apply(_this.cardStorage, inputs);
        }));
        this.writeNumber = ts_exec_queue_1.execQueue(Modem, "WRITE", (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.writeNumber.apply(_this.cardStorage, inputs);
        }));
        this.atStack = new AtStack_1.AtStack(params.path);
        this.atStack.runCommand("AT+CGSN\r", function (resp) {
            _this.imei = resp.raw.split("\r\n")[1];
            debug("IMEI: ", _this.imei);
        });
        debug("Init, systemState");
        this.systemState = new SystemState_1.SystemState(this.atStack);
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var hasSim, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.systemState.evtReportSimPresence.waitFor()];
                    case 1:
                        hasSim = _b.sent();
                        if (!hasSim) {
                            callback(null, this, false);
                            return [2 /*return*/];
                        }
                        debug("HAS SIM: TRUE");
                        _a = this;
                        return [4 /*yield*/, this.readIccid()];
                    case 2:
                        _a.iccid = _b.sent();
                        this.iccidAvailableBeforeUnlock = (this.iccid) ? true : false;
                        debug("ICCID before unlock: ", this.iccid);
                        this.initCardLockFacility();
                        return [2 /*return*/];
                }
            });
        }); })();
    }
    Modem.getSafeUnlockCodeProvider = function (unlockCodeProvider) {
        switch (typeof unlockCodeProvider) {
            case "object":
                var explicit = unlockCodeProvider;
                var pins_1 = [explicit.pinFirstTry, explicit.pinSecondTry];
                return function (imei, imsi, pinState, tryLeft, callback) {
                    if (pinState === "SIM PIN") {
                        if (tryLeft === 1)
                            throw new Error("Prevent unlock sim, only one try left!");
                        var pin = pins_1.shift();
                        if (pin) {
                            debug("Unlock " + imei + ", " + imsi + ", " + pinState + ", " + tryLeft + ", " + pin);
                            callback(pin);
                            return;
                        }
                    }
                    throw new Error("No unlock action defined for " + pinState + ", tryLeft: " + tryLeft);
                };
            case "function":
                return unlockCodeProvider;
            default: throw new Error("No action defined for unlock card");
        }
    };
    Modem.create = function (params, callback) {
        return new Promise(function (resolve) {
            var modem = new Modem({
                "path": params.path,
                "unlockCodeProvider": Modem.getSafeUnlockCodeProvider(params.unlockCodeProvider),
                "enableSmsStack": !(params.disableSmsFeatures === true),
                "enableCardStorage": !(params.disableContactsFeatures === true)
            }, function (error, modem, hasSim) {
                modem.evtTerminate.detach();
                if (callback)
                    callback(error, modem, hasSim);
                resolve([error, modem, hasSim]);
            });
            modem.evtTerminate.attachOnce(function (error) {
                error = error || new Error("Modem has disconnected");
                if (callback)
                    callback(error, modem, false);
                resolve([error, modem, false]);
            });
        });
    };
    ;
    Modem.prototype.readIccid = function () {
        return __awaiter(this, void 0, void 0, function () {
            var switchedIccid, _a, resp, final, _b, resp_1, final_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.atStack.runCommand("AT^ICCID?\r", { "recoverable": true })];
                    case 1:
                        _a = _c.sent(), resp = _a[0], final = _a[1];
                        if (!final.isError) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.atStack.runCommand("AT+CRSM=176,12258,0,0,10\r", { "recoverable": true })];
                    case 2:
                        _b = _c.sent(), resp_1 = _b[0], final_1 = _b[1];
                        if (final_1.isError)
                            switchedIccid = undefined;
                        else
                            switchedIccid = resp_1.response;
                        return [3 /*break*/, 4];
                    case 3:
                        switchedIccid = resp.iccid;
                        _c.label = 4;
                    case 4: return [2 /*return*/, (function (switched) {
                            var out = "";
                            if (!switched)
                                return out;
                            for (var i = 0; i < switched.length; i += 2)
                                out += switched[i + 1] + switched[i];
                            if (out[out.length - 1].match(/^[Ff]$/))
                                out = out.slice(0, -1);
                            return out;
                        })(switchedIccid)];
                }
            });
        });
    };
    Object.defineProperty(Modem.prototype, "isTerminated", {
        get: function () {
            return this.atStack.isTerminated;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "evtTerminate", {
        get: function () {
            return this.atStack.evtTerminate;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "evtUnsolicitedAtMessage", {
        get: function () {
            return this.atStack.evtUnsolicitedMessage;
        },
        enumerable: true,
        configurable: true
    });
    Modem.prototype.initCardLockFacility = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var cardLockFacility, cx_SPN_SET, _a, resp;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        debug("Init cardLockFacility");
                        cardLockFacility = new CardLockFacility_1.CardLockFacility(this.atStack);
                        cardLockFacility.evtUnlockCodeRequest.attach(function (_a) {
                            var pinState = _a.pinState, times = _a.times;
                            _this.params.unlockCodeProvider(_this.imei, _this.iccid, pinState, times, function () {
                                var inputs = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    inputs[_i] = arguments[_i];
                                }
                                switch (pinState) {
                                    case "SIM PIN":
                                        _this.pin = inputs[0];
                                        cardLockFacility.enterPin(inputs[0]);
                                        return;
                                    case "SIM PUK":
                                        _this.pin = inputs[1];
                                        cardLockFacility.enterPuk(inputs[0], inputs[1]);
                                        return;
                                    case "SIM PIN2":
                                        cardLockFacility.enterPin2(inputs[0]);
                                        return;
                                    case "SIM PUK2":
                                        cardLockFacility.enterPuk2(inputs[0], inputs[1]);
                                        return;
                                }
                            });
                        });
                        return [4 /*yield*/, cardLockFacility.evtPinStateReady.waitFor()];
                    case 1:
                        _b.sent();
                        debug("SIM unlocked");
                        if (!!this.systemState.isValidSim) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.systemState.evtValidSim.waitFor()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        debug("SIM valid");
                        return [4 /*yield*/, this.atStack.runCommand("AT^SPN=0\r", { "recoverable": true })];
                    case 4:
                        cx_SPN_SET = (_b.sent())[0];
                        if (cx_SPN_SET)
                            this.serviceProviderName = cx_SPN_SET.serviceProviderName;
                        debug("Service Provider name: " + this.serviceProviderName);
                        if (!!this.iccidAvailableBeforeUnlock) return [3 /*break*/, 6];
                        _a = this;
                        return [4 /*yield*/, this.readIccid()];
                    case 5:
                        _a.iccid = _b.sent();
                        debug("ICCID after unlock: ", this.iccid);
                        _b.label = 6;
                    case 6: return [4 /*yield*/, this.atStack.runCommand("AT+CIMI\r")];
                    case 7:
                        resp = (_b.sent())[0];
                        this.imsi = resp.raw.split("\r\n")[1];
                        debug("IMSI: ", this.imsi);
                        if (this.params.enableSmsStack)
                            this.initSmsStack();
                        if (this.params.enableCardStorage)
                            this.initCardStorage();
                        else
                            this.callback(null, this, true);
                        return [2 /*return*/];
                }
            });
        });
    };
    Modem.prototype.initSmsStack = function () {
        var _this = this;
        debug("Init smsStack");
        this.smsStack = new SmsStack_1.SmsStack(this.atStack);
        this.smsStack.evtMessage.attach(function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.evtMessage.evtAttach.postCount) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.evtMessage.evtAttach.waitFor()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.evtMessage.post(data);
                        return [2 /*return*/];
                }
            });
        }); });
        this.smsStack.evtMessageStatusReport.attach(function (data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.evtMessageStatusReport.evtAttach.postCount) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.evtMessageStatusReport.evtAttach.waitFor()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.evtMessageStatusReport.post(data);
                        return [2 /*return*/];
                }
            });
        }); });
    };
    Modem.prototype.initCardStorage = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        debug("Init cardStorage");
                        this.cardStorage = new CardStorage_1.CardStorage(this.atStack);
                        return [4 /*yield*/, this.cardStorage.evtReady.waitFor()];
                    case 1:
                        _a.sent();
                        this.callback(null, this, true);
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(Modem.prototype, "number", {
        get: function () {
            return this.cardStorage.number;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "contacts", {
        get: function () {
            return this.cardStorage.contacts;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "contactNameMaxLength", {
        get: function () {
            return this.cardStorage.contactNameMaxLength;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "numberMaxLength", {
        get: function () {
            return this.cardStorage.numberMaxLength;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "storageLeft", {
        get: function () {
            return this.cardStorage.storageLeft;
        },
        enumerable: true,
        configurable: true
    });
    return Modem;
}());
exports.Modem = Modem;
//# sourceMappingURL=Modem.js.map