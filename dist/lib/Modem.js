"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var runExclusive = require("run-exclusive");
var debug = require("debug");
require("colors");
var InitializationError = /** @class */ (function (_super) {
    __extends(InitializationError, _super);
    function InitializationError(message, modemInfos) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        _this.modemInfos = modemInfos;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    return InitializationError;
}(Error));
exports.InitializationError = InitializationError;
var Modem = /** @class */ (function () {
    function Modem(dataIfPath, unlock, enableSmsStack, enableCardStorage, enableTrace, onInitializationCompleted) {
        var _this = this;
        this.dataIfPath = dataIfPath;
        this.enableSmsStack = enableSmsStack;
        this.enableCardStorage = enableCardStorage;
        this.iccidAvailableBeforeUnlock = undefined;
        this.serviceProviderName = undefined;
        this.isVoiceEnabled = undefined;
        this.unlockCodeProvider = undefined;
        this.hasSim = undefined;
        this.debug = debug("Modem");
        this.runCommand = runExclusive.buildMethodCb((function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.atStack.runCommand.apply(_this.atStack, inputs);
        }));
        this.lastPinTried = undefined;
        this.validSimPin = undefined;
        this.evtMessage = new ts_events_extended_1.SyncEvent();
        this.evtMessageStatusReport = new ts_events_extended_1.SyncEvent();
        this.sendMessage = runExclusive.buildMethodCb((function () {
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
        this.storageAccessGroupRef = runExclusive.createGroupRef();
        this.createContact = runExclusive.buildMethodCb(this.storageAccessGroupRef, (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.createContact.apply(_this.cardStorage, inputs);
        }));
        this.updateContact = runExclusive.buildMethodCb(this.storageAccessGroupRef, (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.updateContact.apply(_this.cardStorage, inputs);
        }));
        this.deleteContact = runExclusive.buildMethodCb(this.storageAccessGroupRef, (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.deleteContact.apply(_this.cardStorage, inputs);
        }));
        this.writeNumber = runExclusive.buildMethodCb(this.storageAccessGroupRef, (function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.writeNumber.apply(_this.cardStorage, inputs);
        }));
        if (enableTrace) {
            this.debug.namespace = this.debug.namespace + " " + dataIfPath;
            this.debug.enabled = true;
        }
        this.debug("Initializing GSM Modem");
        if (typeof unlock === "function") {
            this.unlockCodeProvider = unlock;
        }
        else if (unlock) {
            this.unlockCodeProvider = this.buildUnlockCodeProvider(unlock);
        }
        this.atStack = new AtStack_1.AtStack(dataIfPath, enableSmsStack ? this.debug.namespace + " AtStack" : undefined);
        this.onInitializationCompleted = function (error) {
            _this.atStack.evtTerminate.detach(_this);
            if (error) {
                _this.atStack.terminate(error);
                onInitializationCompleted(new InitializationError(error.message, {
                    "hasSim": _this.hasSim,
                    "imei": _this.imei,
                    "manufacturer": _this.manufacturer,
                    "model": _this.model,
                    "firmwareVersion": _this.firmwareVersion,
                    "iccid": _this.iccid,
                    "iccidAvailableBeforeUnlock": _this.iccidAvailableBeforeUnlock,
                    "validSimPin": _this.validSimPin,
                    "lastPinTried": _this.lastPinTried,
                    "imsi": _this.imsi,
                    "serviceProviderName": _this.serviceProviderName,
                    "isVoiceEnabled": _this.isVoiceEnabled
                }));
            }
            else {
                _this.debug("Modem initialization success");
                onInitializationCompleted(_this);
            }
        };
        this.atStack.evtTerminate.attachOnce(this, function (atStackError) {
            return _this.onInitializationCompleted(atStackError);
        });
        this.atStack.runCommand("AT+CGSN\r", function (resp) {
            _this.imei = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
            _this.debug("IMEI: " + _this.imei);
        });
        this.atStack.runCommand("AT+CGMI\r", function (resp) {
            _this.manufacturer = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
            _this.debug("manufacturer: " + _this.manufacturer);
        });
        this.atStack.runCommand("AT+CGMM\r", function (resp) {
            _this.model = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
            _this.debug("model: " + _this.model);
        });
        this.atStack.runCommand("AT+CGMR\r", function (resp) {
            _this.firmwareVersion = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
            _this.debug("firmwareVersion: " + _this.firmwareVersion);
        });
        this.systemState = new SystemState_1.SystemState(this.atStack);
        (function () { return __awaiter(_this, void 0, void 0, function () {
            var hasSim, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.systemState.evtReportSimPresence.waitFor()];
                    case 1:
                        hasSim = _b.sent();
                        this.debug("SIM present: " + hasSim);
                        if (!hasSim) {
                            this.onInitializationCompleted(new Error("Modem has no SIM card"));
                            return [2 /*return*/];
                        }
                        this.hasSim = true;
                        _a = this;
                        return [4 /*yield*/, this.readIccid()];
                    case 2:
                        _a.iccid = _b.sent();
                        if (this.iccid) {
                            this.debug("ICCID: " + this.iccid);
                        }
                        this.initCardLockFacility();
                        return [2 /*return*/];
                }
            });
        }); })();
    }
    Modem.create = function (params) {
        return new Promise(function (resolve, reject) {
            var enableSmsStack = !(params.disableSmsFeatures === true);
            var enableCardStorage = !(params.disableContactsFeatures === true);
            var enableTrace = params.enableTrace === true;
            new Modem(params.dataIfPath, params.unlock, enableSmsStack, enableCardStorage, enableTrace, function (result) { return (result instanceof Modem) ? resolve(result) : reject(result); });
        });
    };
    Modem.prototype.buildUnlockCodeProvider = function (unlockCode) {
        var _this = this;
        return function (imei, imsi, pinState, tryLeft, performUnlock) { return __awaiter(_this, void 0, void 0, function () {
            var _i, _a, pin, unlockResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.debug("Sim locked...");
                        _i = 0, _a = [unlockCode.pinFirstTry, unlockCode.pinSecondTry, undefined];
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        pin = _a[_i];
                        if (!pin || pinState !== "SIM PIN") {
                            this.onInitializationCompleted(new Error("Unlock failed " + pinState + ", " + tryLeft));
                            return [2 /*return*/];
                        }
                        if (tryLeft === 1) {
                            this.onInitializationCompleted(new Error("Prevent unlock sim, only one try left"));
                            return [2 /*return*/];
                        }
                        this.debug("Attempting unlock with " + pin);
                        return [4 /*yield*/, performUnlock(pin)];
                    case 2:
                        unlockResult = _b.sent();
                        if (unlockResult.success) {
                            this.debug("Unlock success");
                            return [2 /*return*/];
                        }
                        pinState = unlockResult.pinState;
                        tryLeft = unlockResult.tryLeft;
                        this.debug("Unlock attempt failed " + pinState + ", " + tryLeft);
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
    };
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
                    case 4: return [2 /*return*/, (function unswitch(switched) {
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
    Object.defineProperty(Modem.prototype, "runCommand_isRunning", {
        get: function () {
            return runExclusive.isRunning(this.runCommand);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "runCommand_queuedCallCount", {
        get: function () {
            return runExclusive.getQueuedCallCount(this.runCommand);
        },
        enumerable: true,
        configurable: true
    });
    Modem.prototype.runCommand_cancelAllQueuedCalls = function () {
        return runExclusive.cancelAllQueuedCalls(this.runCommand);
    };
    Modem.prototype.terminate = function () { this.atStack.terminate(); };
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
            var cardLockFacility, cx_SPN_SET, _a, resp, resp_CX_CVOICE_SET, cx_CVOICE_READ;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cardLockFacility = new CardLockFacility_1.CardLockFacility(this.atStack);
                        cardLockFacility.evtUnlockCodeRequest.attachOnce(function (_a) {
                            var pinState = _a.pinState, times = _a.times;
                            var iccid = _this.iccid || undefined;
                            _this.iccidAvailableBeforeUnlock = !!iccid;
                            if (!_this.unlockCodeProvider) {
                                _this.onInitializationCompleted(new Error("SIM card is pin locked but no code was provided"));
                                return;
                            }
                            _this.unlockCodeProvider(_this.imei, iccid, pinState, times, function () {
                                var inputs = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    inputs[_i] = arguments[_i];
                                }
                                return __awaiter(_this, void 0, void 0, function () {
                                    var result, resultFailed, resultSuccess;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (this.atStack.isTerminated) {
                                                    throw new Error("This modem is no longer available");
                                                }
                                                switch (pinState) {
                                                    case "SIM PIN":
                                                        this.lastPinTried = inputs[0];
                                                        cardLockFacility.enterPin(inputs[0]);
                                                        break;
                                                    case "SIM PUK":
                                                        this.lastPinTried = inputs[1];
                                                        cardLockFacility.enterPuk(inputs[0], inputs[1]);
                                                        break;
                                                    case "SIM PIN2":
                                                        cardLockFacility.enterPin2(inputs[0]);
                                                        break;
                                                    case "SIM PUK2":
                                                        cardLockFacility.enterPuk2(inputs[0], inputs[1]);
                                                        break;
                                                }
                                                return [4 /*yield*/, Promise.race([
                                                        cardLockFacility.evtUnlockCodeRequest.waitFor(),
                                                        cardLockFacility.evtPinStateReady.waitFor(),
                                                        this.atStack.evtTerminate.waitFor()
                                                    ])];
                                            case 1:
                                                result = _a.sent();
                                                if (result instanceof Error) {
                                                    throw result;
                                                }
                                                else if (result) {
                                                    resultFailed = {
                                                        "success": false,
                                                        "pinState": result.pinState,
                                                        "tryLeft": result.times
                                                    };
                                                    return [2 /*return*/, resultFailed];
                                                }
                                                else {
                                                    resultSuccess = {
                                                        "success": true
                                                    };
                                                    return [2 /*return*/, resultSuccess];
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            });
                        });
                        return [4 /*yield*/, cardLockFacility.evtPinStateReady.waitFor()];
                    case 1:
                        _b.sent();
                        if (this.lastPinTried) {
                            this.validSimPin = this.lastPinTried;
                        }
                        this.debug("SIM unlocked");
                        if (!!this.systemState.isValidSim) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.systemState.evtValidSim.waitFor()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        this.debug("SIM valid");
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
                        this.debug("ICCID ( read after unlock ): " + this.iccid);
                        _b.label = 6;
                    case 6: return [4 /*yield*/, this.atStack.runCommand("AT+CIMI\r")];
                    case 7:
                        resp = (_b.sent())[0];
                        this.imsi = resp.raw.split("\r\n")[1];
                        this.debug("IMSI: " + this.imsi);
                        return [4 /*yield*/, this.atStack.runCommand("AT^CVOICE=0\r", { "recoverable": true })];
                    case 8:
                        resp_CX_CVOICE_SET = _b.sent();
                        if (!!resp_CX_CVOICE_SET[1].isError) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.atStack.runCommand("AT^CVOICE?\r", { "recoverable": true })];
                    case 9:
                        cx_CVOICE_READ = (_b.sent())[0];
                        if (cx_CVOICE_READ)
                            this.isVoiceEnabled = cx_CVOICE_READ.isEnabled;
                        _b.label = 10;
                    case 10:
                        this.debug("VOICE ENABLED: ", this.isVoiceEnabled);
                        if (this.enableSmsStack)
                            this.initSmsStack();
                        if (this.enableCardStorage)
                            this.initCardStorage();
                        else
                            this.onInitializationCompleted();
                        return [2 /*return*/];
                }
            });
        });
    };
    Modem.prototype.initSmsStack = function () {
        var _this = this;
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
                        this.cardStorage = new CardStorage_1.CardStorage(this.atStack);
                        return [4 /*yield*/, this.cardStorage.evtReady.waitFor()];
                    case 1:
                        _a.sent();
                        this.onInitializationCompleted();
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
    Modem.prototype.ping = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.atStack.runCommand("AT\r")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Modem;
}());
exports.Modem = Modem;
