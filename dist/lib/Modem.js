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
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var AtStack_1 = require("./AtStack");
var SystemState_1 = require("./SystemState");
var CardLockFacility_1 = require("./CardLockFacility");
//@ts-ignore: Contact need to be imported as it is used as return type.
var CardStorage_1 = require("./CardStorage");
var SmsStack_1 = require("./SmsStack");
var ts_events_extended_1 = require("ts-events-extended");
var runExclusive = require("run-exclusive");
var util = require("util");
var logger = require("logger");
var gsm_modem_connection_1 = require("gsm-modem-connection");
require("colors");
//TODO: add full original error.
var InitializationError = /** @class */ (function (_super) {
    __extends(InitializationError, _super);
    function InitializationError(srcError, dataIfPath, modemInfos) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, "Failed to initialize modem on " + dataIfPath) || this;
        _this.srcError = srcError;
        _this.dataIfPath = dataIfPath;
        _this.modemInfos = modemInfos;
        Object.setPrototypeOf(_this, _newTarget.prototype);
        return _this;
    }
    InitializationError.prototype.toString = function () {
        return [
            "InitializationError: " + this.message,
            "Cause: " + this.srcError,
            "Modem infos: " + util.format(this.modemInfos)
        ].join("\n");
    };
    return InitializationError;
}(Error));
exports.InitializationError = InitializationError;
var Modem = /** @class */ (function () {
    function Modem(dataIfPath, unlock, enableSmsStack, enableCardStorage, log, resolveConstructor) {
        var _this = this;
        this.dataIfPath = dataIfPath;
        this.enableSmsStack = enableSmsStack;
        this.enableCardStorage = enableCardStorage;
        this.log = log;
        this.resolveConstructor = resolveConstructor;
        this.iccidAvailableBeforeUnlock = undefined;
        this.serviceProviderName = undefined;
        this.isVoiceEnabled = undefined;
        this.evtTerminate = new ts_events_extended_1.SyncEvent();
        this.unlockCodeProvider = undefined;
        this.hasSim = undefined;
        this.runCommand = runExclusive.buildMethod((function () {
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
        this.sendMessage = runExclusive.buildMethod((function () {
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
                        case 2: return [2 /*return*/, this.smsStack.sendMessage.apply(this.smsStack, inputs)];
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
        this.createContact = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.createContact.apply(_this.cardStorage, inputs);
        };
        this.updateContact = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.updateContact.apply(_this.cardStorage, inputs);
        };
        this.deleteContact = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.deleteContact.apply(_this.cardStorage, inputs);
        };
        this.writeNumber = function () {
            var inputs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                inputs[_i] = arguments[_i];
            }
            return _this.cardStorage.writeNumber.apply(_this.cardStorage, inputs);
        };
        this.debug = logger.debugFactory("Modem " + dataIfPath, true, this.log);
        this.debug("Initializing GSM Modem");
        if (typeof unlock === "function") {
            this.unlockCodeProvider = unlock;
        }
        else if (unlock) {
            this.unlockCodeProvider = this.buildUnlockCodeProvider(unlock);
        }
        if (!gsm_modem_connection_1.Monitor.hasInstance) {
            this.debug("Connection monitor not used, skipping preliminary modem reboot");
            this.initAtStack();
        }
        var cm = gsm_modem_connection_1.Monitor.getInstance();
        var accessPoint = Array.from(cm.connectedModems).find(function (_a) {
            var dataIfPath = _a.dataIfPath;
            return dataIfPath === _this.dataIfPath;
        });
        if (!accessPoint) {
            this.resolveConstructor(new InitializationError(new Error("According to gsm-modem-connection modem does not seem to be connected on specified interface"), this.dataIfPath, {}));
            return;
        }
        this.debug("Performing preliminary modem reboot by issuing the AT command to restart MT");
        (new AtStack_1.AtStack(this.dataIfPath, function () { })).terminate("RESTART MT");
        cm.evtModemDisconnect.attachOnceExtract(function (ap) { return ap === accessPoint; }, function () { return _this.debug("Modem disconnected as expected caught ( event extracted from monitor )"); });
        cm.evtModemConnect.attachOnceExtract(function (_a) {
            var id = _a.id;
            return id === accessPoint.id;
        }, function (_a) {
            var dataIfPath = _a.dataIfPath;
            _this.dataIfPath = dataIfPath;
            _this.debug("Modem reconnected successfully ( event extracted from monitor )");
            _this.initAtStack();
        });
    }
    /**
     * Note: if no log is passed then console.log is used.
     * If log is false no log.
     * throw InitializationError
     */
    Modem.create = function (params) {
        return new Promise(function (resolve, reject) {
            var enableSmsStack = !(params.disableSmsFeatures === true);
            var enableCardStorage = !(params.disableContactsFeatures === true);
            var log = (function () {
                switch (params.log) {
                    case undefined: return console.log.bind(console);
                    case false: return function () { };
                    default: return params.log;
                }
            })();
            new Modem(params.dataIfPath, params.unlock, enableSmsStack, enableCardStorage, log, function (result) { return (result instanceof Modem) ? resolve(result) : reject(result); });
        });
    };
    Modem.prototype.initAtStack = function () {
        return __awaiter(this, void 0, void 0, function () {
            var hasSim, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.atStack = new AtStack_1.AtStack(this.dataIfPath, logger.debugFactory("AtStack " + this.dataIfPath, true, this.log));
                        this.onInitializationCompleted = function (error) {
                            _this.atStack.evtTerminate.detach(_this);
                            if (!!error) {
                                var initializationError_1 = new InitializationError(error, _this.dataIfPath, {
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
                                });
                                _this.debug(initializationError_1.toString().red);
                                if (!!_this.smsStack) {
                                    _this.smsStack.clearAllTimers();
                                }
                                //TODO: restart here?
                                _this.atStack.terminate().then(function () { return _this.resolveConstructor(initializationError_1); });
                            }
                            else {
                                _this.atStack.evtTerminate.attach(function (error) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        this.debug(!!error ?
                                            ("terminate with error: " + error).red :
                                            "terminate without error");
                                        if (!!this.smsStack) {
                                            this.smsStack.clearAllTimers();
                                        }
                                        this.evtTerminate.post(error);
                                        return [2 /*return*/];
                                    });
                                }); });
                                _this.resolveConstructor(_this);
                            }
                        };
                        this.atStack.evtTerminate.attachOnce(function (error) { return !!error; }, this, function (error) { return _this.onInitializationCompleted(error); });
                        this.atStack.runCommand("AT+CGSN\r").then(function (_a) {
                            var resp = _a.resp;
                            _this.imei = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
                            _this.debug("IMEI: " + _this.imei);
                        });
                        this.atStack.runCommand("AT+CGMI\r").then(function (_a) {
                            var resp = _a.resp;
                            _this.manufacturer = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
                            _this.debug("manufacturer: " + _this.manufacturer);
                        });
                        this.atStack.runCommand("AT+CGMM\r").then(function (_a) {
                            var resp = _a.resp;
                            _this.model = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
                            _this.debug("model: " + _this.model);
                        });
                        this.atStack.runCommand("AT+CGMR\r").then(function (_a) {
                            var resp = _a.resp;
                            _this.firmwareVersion = resp.raw.match(/^\r\n(.*)\r\n$/)[1];
                            _this.debug("firmwareVersion: " + _this.firmwareVersion);
                        });
                        this.systemState = new SystemState_1.SystemState(this.atStack, logger.debugFactory("SystemState " + this.dataIfPath, true, this.log));
                        return [4 /*yield*/, this.systemState.evtReportSimPresence.waitFor()];
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
        });
    };
    Modem.prototype.buildUnlockCodeProvider = function (unlockCode) {
        var _this = this;
        return function (_modemInfos, _iccid, pinState, tryLeft, performUnlock) { return __awaiter(_this, void 0, void 0, function () {
            var e_1, _a, _b, _c, pin, unlockResult, e_1_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this.debug("Sim locked...");
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 6, 7, 8]);
                        _b = __values([unlockCode.pinFirstTry, unlockCode.pinSecondTry, undefined]), _c = _b.next();
                        _d.label = 2;
                    case 2:
                        if (!!_c.done) return [3 /*break*/, 5];
                        pin = _c.value;
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
                    case 3:
                        unlockResult = _d.sent();
                        if (unlockResult.success) {
                            this.debug("Unlock success");
                            return [2 /*return*/];
                        }
                        pinState = unlockResult.pinState;
                        tryLeft = unlockResult.tryLeft;
                        this.debug("Unlock attempt failed " + pinState + ", " + tryLeft);
                        _d.label = 4;
                    case 4:
                        _c = _b.next();
                        return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 8];
                    case 6:
                        e_1_1 = _d.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
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
                        _a = _c.sent(), resp = _a.resp, final = _a.final;
                        if (!final.isError) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.atStack.runCommand("AT+CRSM=176,12258,0,0,10\r", { "recoverable": true })];
                    case 2:
                        _b = _c.sent(), resp_1 = _b.resp, final_1 = _b.final;
                        if (final_1.isError) {
                            switchedIccid = undefined;
                        }
                        else {
                            switchedIccid = resp_1.response;
                        }
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
            return runExclusive.isRunning(this.runCommand, this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Modem.prototype, "runCommand_queuedCallCount", {
        get: function () {
            return runExclusive.getQueuedCallCount(this.runCommand, this);
        },
        enumerable: true,
        configurable: true
    });
    Modem.prototype.runCommand_cancelAllQueuedCalls = function () {
        return runExclusive.cancelAllQueuedCalls(this.runCommand, this);
    };
    Modem.prototype.terminate = function () {
        if (!!this.smsStack) {
            this.smsStack.clearAllTimers();
        }
        return this.atStack.terminate();
    };
    Object.defineProperty(Modem.prototype, "terminateState", {
        get: function () {
            return this.atStack.terminateState;
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
            var cardLockFacility, cx_SPN_SET, _a, resp, resp_CX_CVOICE_SET, cx_CVOICE_READ;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cardLockFacility = new CardLockFacility_1.CardLockFacility(this.atStack, logger.debugFactory("CardLockFacility " + this.dataIfPath, true, this.log));
                        cardLockFacility.evtUnlockCodeRequest.attachOnce(function (_a) {
                            var pinState = _a.pinState, times = _a.times;
                            var iccid = _this.iccid || undefined;
                            _this.iccidAvailableBeforeUnlock = !!iccid;
                            if (!_this.unlockCodeProvider) {
                                _this.onInitializationCompleted(new Error("SIM card is pin locked but no code was provided"));
                                return;
                            }
                            _this.unlockCodeProvider({
                                "imei": _this.imei,
                                "manufacturer": _this.manufacturer,
                                "model": _this.model,
                                "firmwareVersion": _this.firmwareVersion
                            }, iccid, pinState, times, function () {
                                var inputs = [];
                                for (var _i = 0; _i < arguments.length; _i++) {
                                    inputs[_i] = arguments[_i];
                                }
                                return __awaiter(_this, void 0, void 0, function () {
                                    var context, _result, resultSuccess, resultFailed;
                                    var _this = this;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!!this.atStack.terminateState) {
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
                                                context = {};
                                                return [4 /*yield*/, Promise.race([
                                                        new Promise(function (resolve) { return cardLockFacility.evtPinStateReady.attachOnce(context, function () { return resolve({ "type": "SUCCESS" }); }); }),
                                                        new Promise(function (resolve) { return cardLockFacility.evtUnlockCodeRequest.attachOnce(context, function (unlockCodeRequest) { return resolve({ "type": "FAILED", unlockCodeRequest: unlockCodeRequest }); }); }),
                                                        new Promise(function (resolve) { return _this.atStack.evtTerminate.attachOnce(context, function (error) { return resolve({ "type": "TERMINATE", error: error }); }); })
                                                    ])];
                                            case 1:
                                                _result = _a.sent();
                                                cardLockFacility.evtPinStateReady.detach(context);
                                                cardLockFacility.evtUnlockCodeRequest.detach(context);
                                                this.atStack.evtTerminate.detach(context);
                                                switch (_result.type) {
                                                    case "SUCCESS":
                                                        resultSuccess = {
                                                            "success": true
                                                        };
                                                        return [2 /*return*/, resultSuccess];
                                                    case "FAILED":
                                                        resultFailed = {
                                                            "success": false,
                                                            "pinState": _result.unlockCodeRequest.pinState,
                                                            "tryLeft": _result.unlockCodeRequest.times
                                                        };
                                                        return [2 /*return*/, resultFailed];
                                                    case "TERMINATE":
                                                        throw _result.error || new Error("Terminate have been called on locked modem");
                                                }
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            }, function () { return _this.atStack.terminate(); });
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
                        cx_SPN_SET = (_b.sent()).resp;
                        if (cx_SPN_SET)
                            this.serviceProviderName = cx_SPN_SET.serviceProviderName;
                        this.debug("Service Provider name: " + this.serviceProviderName);
                        if (!!this.iccidAvailableBeforeUnlock) return [3 /*break*/, 6];
                        _a = this;
                        return [4 /*yield*/, this.readIccid()];
                    case 5:
                        _a.iccid = _b.sent();
                        this.debug("ICCID ( read after unlock ): " + this.iccid);
                        _b.label = 6;
                    case 6: return [4 /*yield*/, this.atStack.runCommand("AT+CIMI\r")];
                    case 7:
                        resp = (_b.sent()).resp;
                        this.imsi = resp.raw.split("\r\n")[1];
                        this.debug("IMSI: " + this.imsi);
                        return [4 /*yield*/, this.atStack.runCommand("AT^CVOICE=0\r", { "recoverable": true })];
                    case 8:
                        resp_CX_CVOICE_SET = _b.sent();
                        if (!!resp_CX_CVOICE_SET.final.isError) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.atStack.runCommand("AT^CVOICE?\r", { "recoverable": true })];
                    case 9:
                        cx_CVOICE_READ = (_b.sent()).resp;
                        if (cx_CVOICE_READ) {
                            this.isVoiceEnabled = cx_CVOICE_READ.isEnabled;
                        }
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
        this.smsStack = new SmsStack_1.SmsStack(this.atStack, logger.debugFactory("SmsStack " + this.dataIfPath, true, this.log));
        this.smsStack.evtMessage.attach(function (message) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.debug("MESSAGE RECEIVED", message);
                        if (!!this.evtMessage.evtAttach.postCount) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.evtMessage.evtAttach.waitFor()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.evtMessage.post(message);
                        return [2 /*return*/];
                }
            });
        }); });
        this.smsStack.evtMessageStatusReport.attach(function (statusReport) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.debug("STATUS REPORT RECEIVED", statusReport);
                        if (!!this.evtMessageStatusReport.evtAttach.postCount) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.evtMessageStatusReport.evtAttach.waitFor()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.evtMessageStatusReport.post(statusReport);
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
                        this.cardStorage = new CardStorage_1.CardStorage(this.atStack, logger.debugFactory("CardStorage " + this.dataIfPath, true, this.log));
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
    /** Issue AT\r command */
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
