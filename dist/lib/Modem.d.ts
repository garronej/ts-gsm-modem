import { AtStack } from "./AtStack";
import { AtMessage } from "at-messages-parser";
import { CardStorage, Contact } from "./CardStorage";
import { Message, StatusReport } from "./SmsStack";
import { SyncEvent } from "ts-events-extended";
import "colors";
export declare type UnlockResult = UnlockResult.Success | UnlockResult.Failed;
export declare namespace UnlockResult {
    type Success = {
        success: true;
    };
    type Failed = {
        success: false;
        pinState: AtMessage.LockedPinState;
        tryLeft: number;
    };
}
export interface PerformUnlock {
    (pin: string): Promise<UnlockResult>;
    (puk: string, newPin: string): Promise<UnlockResult>;
}
export interface UnlockCodeProvider {
    (modemInfos: {
        imei: string;
        manufacturer: string;
        model: string;
        firmwareVersion: string;
    }, iccid: string | undefined, pinState: AtMessage.LockedPinState, tryLeft: number, performUnlock: PerformUnlock): void;
}
export interface UnlockCode {
    pinFirstTry: string;
    pinSecondTry?: string;
}
export declare class InitializationError extends Error {
    readonly modemInfos: Partial<{
        hasSim: boolean;
        imei: string;
        manufacturer: string;
        model: string;
        firmwareVersion: string;
        iccid: string;
        iccidAvailableBeforeUnlock: boolean;
        validSimPin: string;
        lastPinTried: string;
        imsi: string;
        serviceProviderName: string;
        isVoiceEnabled: boolean;
    }>;
    constructor(message: string, modemInfos: Partial<{
        hasSim: boolean;
        imei: string;
        manufacturer: string;
        model: string;
        firmwareVersion: string;
        iccid: string;
        iccidAvailableBeforeUnlock: boolean;
        validSimPin: string;
        lastPinTried: string;
        imsi: string;
        serviceProviderName: string;
        isVoiceEnabled: boolean;
    }>);
}
export declare class Modem {
    readonly dataIfPath: string;
    private readonly enableSmsStack;
    private readonly enableCardStorage;
    static create(params: {
        dataIfPath: string;
        unlock?: UnlockCode | UnlockCodeProvider;
        disableSmsFeatures?: boolean;
        disableContactsFeatures?: boolean;
        enableTrace?: boolean;
    }): Promise<Modem>;
    private readonly atStack;
    private readonly systemState;
    imei: string;
    manufacturer: string;
    model: string;
    firmwareVersion: string;
    iccid: string;
    iccidAvailableBeforeUnlock: boolean | undefined;
    imsi: string;
    serviceProviderName: string | undefined;
    isVoiceEnabled: boolean | undefined;
    private readonly unlockCodeProvider;
    private readonly onInitializationCompleted;
    private hasSim;
    private debug;
    private constructor();
    private buildUnlockCodeProvider(unlockCode);
    private readIccid();
    readonly runCommand: {
        (command: string, callback?: ((resp: AtMessage | undefined, final: AtMessage, raw: string) => void) | undefined): Promise<[AtMessage | undefined, AtMessage, string]>;
        (command: String, params: {
            recoverable?: boolean | undefined;
            reportMode?: AtMessage.ReportMode | undefined;
            retryOnErrors?: boolean | number[] | undefined;
        }, callback?: ((resp: AtMessage | undefined, final: AtMessage, raw: string) => void) | undefined): Promise<[AtMessage | undefined, AtMessage, string]>;
    };
    readonly runCommand_isRunning: boolean;
    readonly runCommand_queuedCallCount: number;
    runCommand_cancelAllQueuedCalls(): number;
    terminate(): void;
    readonly isTerminated: typeof AtStack.prototype.isTerminated;
    readonly evtTerminate: typeof AtStack.prototype.evtTerminate;
    readonly evtUnsolicitedAtMessage: typeof AtStack.prototype.evtUnsolicitedMessage;
    lastPinTried: string | undefined;
    validSimPin: string | undefined;
    private initCardLockFacility();
    private smsStack;
    readonly evtMessage: SyncEvent<Message>;
    readonly evtMessageStatusReport: SyncEvent<StatusReport>;
    private initSmsStack();
    sendMessage: (number: string, text: string, callback?: ((sendDate: Date | undefined) => void) | undefined) => Promise<Date | undefined>;
    private cardStorage;
    private initCardStorage();
    readonly number: typeof CardStorage.prototype.number;
    readonly contacts: typeof CardStorage.prototype.contacts;
    readonly contactNameMaxLength: typeof CardStorage.prototype.contactNameMaxLength;
    readonly numberMaxLength: typeof CardStorage.prototype.contactNameMaxLength;
    readonly storageLeft: typeof CardStorage.prototype.storageLeft;
    generateSafeContactName: typeof CardStorage.prototype.generateSafeContactName;
    getContact: typeof CardStorage.prototype.getContact;
    private storageAccessGroupRef;
    createContact: (number: string, name: string, callback?: ((contact: Contact) => void) | undefined) => Promise<Contact>;
    updateContact: (index: number, params: {
        number?: string | undefined;
        name?: string | undefined;
    }, callback?: ((contact: Contact) => void) | undefined) => Promise<Contact>;
    deleteContact: (index: number, callback?: (() => void) | undefined) => Promise<void>;
    writeNumber: (number: string, callback?: (() => void) | undefined) => Promise<void>;
    ping(): Promise<void>;
}
