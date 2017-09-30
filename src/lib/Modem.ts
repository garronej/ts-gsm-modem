import { AtStack } from "./AtStack";
import { AtMessage } from "at-messages-parser";
import { SystemState } from "./SystemState";
import { CardLockFacility, UnlockCodeRequest } from "./CardLockFacility";
import { CardStorage, Contact } from "./CardStorage";
import { SerialPortExt } from "./SerialPortExt";

import { SmsStack, Message, StatusReport } from "./SmsStack";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import * as runExclusive from "run-exclusive";

import * as _debug from "debug";
let debug= _debug("_Modem");

import "colors";

export interface UnlockCodeProviderCallback {
    (pin: string): void;
    (puk: string, newPin: string): void;
}

export interface UnlockCodeProvider {
    handler(
        imei: string,
        iccid: string | undefined,
        pinState: AtMessage.LockedPinState,
        tryLeft: number,
        callback: UnlockCodeProviderCallback
    ): void;
    explicit: { pinFirstTry: string; pinSecondTry?: string };
}

export type CreateCallback= (error: null | Error, modem:Modem, hasSim:boolean)=> void;



export class Modem {

    private static getSafeUnlockCodeProvider(
        unlockCodeProvider: UnlockCodeProvider['handler'] | UnlockCodeProvider['explicit'] | undefined 
    ): UnlockCodeProvider['handler'] {

            switch (typeof unlockCodeProvider) {
                case "object":
                    let explicit = unlockCodeProvider as UnlockCodeProvider['explicit'];
                    let pins = [explicit.pinFirstTry, explicit.pinSecondTry];
                    return (imei, imsi, pinState, tryLeft, callback) => {

                        if (pinState === "SIM PIN") {

                            if (tryLeft === 1)
                                throw new Error("Prevent unlock sim, only one try left!");

                            let pin = pins.shift();

                            if (pin) {
                                debug(`Unlock ${imei}, ${imsi}, ${pinState}, ${tryLeft}, ${pin}`);
                                callback(pin);
                                return;
                            }
                        }

                        throw new Error(`No unlock action defined for ${pinState}, tryLeft: ${tryLeft}`);

                    };
                case "function":
                    return unlockCodeProvider as UnlockCodeProvider['handler'];
                default: throw new Error("No action defined for pin locked sim card");
            }

    }

    public static create(
        params: {
            path: string;
            unlockCodeProvider?: UnlockCodeProvider['handler'] | UnlockCodeProvider['explicit'];
            disableSmsFeatures?: boolean;
            disableContactsFeatures?: boolean;
        },
        callback?: CreateCallback
    ): Promise<[null | Error, Modem, boolean]> {

        return new Promise<[null | Error, Modem, boolean]>(resolve => {

            let modem = new Modem({
                "path": params.path,
                "unlockCodeProvider": Modem.getSafeUnlockCodeProvider(params.unlockCodeProvider),
                "enableSmsStack": !(params.disableSmsFeatures === true),
                "enableCardStorage": !(params.disableContactsFeatures === true)
            }, (error, modem, hasSim) => {

                modem.evtTerminate.detach();

                if (callback) callback(error, modem, hasSim);

                resolve([error, modem, hasSim]);

            });

            modem.evtTerminate.attachOnce(error => {

                error = error || new Error("Modem has disconnected");

                if (callback) callback(error, modem, false);
                resolve([error, modem, false]);
            });


        });


    };



    private readonly atStack: AtStack;
    private readonly systemState: SystemState;

    public imei: string;
    public iccid: string;
    public iccidAvailableBeforeUnlock: boolean;
    public imsi: string;
    public serviceProviderName: string | undefined= undefined;
    public isVoiceEnabled: boolean | undefined= undefined;

    private constructor(
        private readonly params: {
            path: string;
            unlockCodeProvider: UnlockCodeProvider['handler'];
            enableSmsStack: boolean;
            enableCardStorage: boolean;
        },
        private readonly callback: CreateCallback
    ) {

        debug(`Initializing new GSM modem on ${params.path}`);

        this.atStack = new AtStack(params.path);

        this.atStack.runCommand("AT+CGSN\r", resp => {
            this.imei = resp!.raw.split("\r\n")[1];
            debug("IMEI: ", this.imei);
        });

        this.systemState = new SystemState(this.atStack);

        (async () => {

            let hasSim = await this.systemState.evtReportSimPresence.waitFor();

            if (!hasSim) {
                callback(null, this, false);
                return;
            }

            debug("HAS SIM: TRUE");

            this.iccid = await this.readIccid();

            this.iccidAvailableBeforeUnlock = (this.iccid) ? true : false;

            debug("ICCID before unlock: ", this.iccid);

            this.initCardLockFacility();


        })();

    }

    public async ping() {

        await this.atStack.runCommand("AT\r");

        return;

    }


    private async readIccid(): Promise<string> {

        let switchedIccid: string | undefined;

        let [resp, final] = await this.atStack.runCommand(
            "AT^ICCID?\r",
            { "recoverable": true }
        );

        if (final.isError) {

            let [resp, final] = await this.atStack.runCommand(
                "AT+CRSM=176,12258,0,0,10\r",
                { "recoverable": true }
            );

            if (final.isError)
                switchedIccid = undefined;
            else switchedIccid = (resp as AtMessage.P_CRSM_SET).response!;

        } else switchedIccid = (resp as AtMessage.CX_ICCID_SET).iccid;

        return (switched => {

            let out = "";

            if (!switched) return out;

            for (let i = 0; i < switched.length; i += 2)
                out += switched[i + 1] + switched[i];

            if (out[out.length - 1].match(/^[Ff]$/))
                out = out.slice(0, -1);

            return out;

        })(switchedIccid);

    }


    public readonly runCommand = runExclusive.buildMethodCb(
        ((...inputs) => this.atStack.runCommand.apply(this.atStack, inputs)
        ) as typeof AtStack.prototype.runCommand
    );

    public get runCommand_isRunning(): boolean {
        return runExclusive.isRunning(this.runCommand);
    }

    public get runCommand_queuedCallCount(): number {
        return runExclusive.getQueuedCallCount(this.runCommand);
    }

    public runCommand_cancelAllQueuedCalls(): number {
        return runExclusive.cancelAllQueuedCalls(this.runCommand);
    }


    public terminate: typeof AtStack.prototype.terminate =
    (...inputs) => this.atStack.terminate.apply(this.atStack, inputs);

    public get isTerminated(): typeof AtStack.prototype.isTerminated {
        return this.atStack.isTerminated;
    }

    public get evtTerminate(): typeof AtStack.prototype.evtTerminate {
        return this.atStack.evtTerminate;
    }

    public get evtUnsolicitedAtMessage(): typeof AtStack.prototype.evtUnsolicitedMessage {
        return this.atStack.evtUnsolicitedMessage;
    }

    public pin: string | undefined = undefined;

    private async initCardLockFacility(): Promise<void> {

        let cardLockFacility = new CardLockFacility(this.atStack);

        cardLockFacility.evtUnlockCodeRequest.attach(({ pinState, times }) => {

            this.params.unlockCodeProvider(
                this.imei, 
                (this.iccidAvailableBeforeUnlock)?this.iccid:undefined, 
                pinState, 
                times, (...inputs) => {

                switch (pinState) {
                    case "SIM PIN":
                        this.pin = inputs[0];
                        cardLockFacility.enterPin(inputs[0]);
                        return;
                    case "SIM PUK":
                        this.pin = inputs[1];
                        cardLockFacility.enterPuk(inputs[0], inputs[1]);
                        return;
                    case "SIM PIN2": cardLockFacility.enterPin2(inputs[0]); return;
                    case "SIM PUK2": cardLockFacility.enterPuk2(inputs[0], inputs[1]); return;
                }

            });


        });



        await cardLockFacility.evtPinStateReady.waitFor();

        debug("SIM unlocked");

        if (!this.systemState.isValidSim)
            await this.systemState.evtValidSim.waitFor();

        debug("SIM valid");


        let [cx_SPN_SET] = await this.atStack.runCommand(
            "AT^SPN=0\r",
            { "recoverable": true }
        );

        if (cx_SPN_SET)
            this.serviceProviderName = (cx_SPN_SET as AtMessage.CX_SPN_SET).serviceProviderName;
        
        debug(`Service Provider name: ${this.serviceProviderName}`);


        if (!this.iccidAvailableBeforeUnlock) {

            this.iccid = await this.readIccid();

            debug("ICCID after unlock: ", this.iccid);

        }

        let [resp] = await this.atStack.runCommand("AT+CIMI\r");

        this.imsi = resp!.raw.split("\r\n")[1];

        debug("IMSI: ", this.imsi);

        //TODO: check voice

        let resp_CX_CVOICE_SET = await this.atStack.runCommand(
            "AT^CVOICE=0\r", 
            { "recoverable": true }
        );

        if( !resp_CX_CVOICE_SET[1].isError ){

            let [ cx_CVOICE_READ ] = await this.atStack.runCommand(
                "AT^CVOICE?\r", 
                { "recoverable": true }
            );

            if( cx_CVOICE_READ )
                this.isVoiceEnabled= (cx_CVOICE_READ as AtMessage.CX_CVOICE_READ).isEnabled;

        }

        debug("VOICE ENABLED: ", this.isVoiceEnabled);

        if (this.params.enableSmsStack) this.initSmsStack();
        if (this.params.enableCardStorage) this.initCardStorage();
        else this.callback(null, this, true);

    }

    private smsStack: SmsStack;

    public readonly evtMessage = new SyncEvent<Message>();
    public readonly evtMessageStatusReport = new SyncEvent<StatusReport>();

    private initSmsStack(): void {

        this.smsStack = new SmsStack(this.atStack);

        this.smsStack.evtMessage.attach(async data => {
            if (!this.evtMessage.evtAttach.postCount)
                await this.evtMessage.evtAttach.waitFor();

            this.evtMessage.post(data);
        });

        this.smsStack.evtMessageStatusReport.attach(async data => {
            if (!this.evtMessageStatusReport.evtAttach.postCount)
                await this.evtMessageStatusReport.evtAttach.waitFor();

            this.evtMessageStatusReport.post(data);
        });

    }

    public sendMessage = runExclusive.buildMethodCb(
        (async (...inputs) => {

            if (!this.systemState.isNetworkReady)
                await this.systemState.evtNetworkReady.waitFor();

            this.smsStack.sendMessage.apply(this.smsStack, inputs);

        }) as any as typeof SmsStack.prototype.sendMessage
    );


    private cardStorage: CardStorage;

    private async initCardStorage(): Promise<void> {

        this.cardStorage = new CardStorage(this.atStack);

        await this.cardStorage.evtReady.waitFor();

        this.callback(null, this, true);

    }

    public get number(): typeof CardStorage.prototype.number {
        return this.cardStorage.number;
    }

    public get contacts(): typeof CardStorage.prototype.contacts {
        return this.cardStorage.contacts;
    }

    public get contactNameMaxLength(): typeof CardStorage.prototype.contactNameMaxLength {
        return this.cardStorage.contactNameMaxLength;
    }

    public get numberMaxLength(): typeof CardStorage.prototype.contactNameMaxLength {
        return this.cardStorage.numberMaxLength;
    }

    public get storageLeft(): typeof CardStorage.prototype.storageLeft {
        return this.cardStorage.storageLeft;
    }

    public generateSafeContactName: typeof CardStorage.prototype.generateSafeContactName =
    (...inputs) => this.cardStorage.generateSafeContactName.apply(this.cardStorage, inputs);

    public getContact: typeof CardStorage.prototype.getContact =
    (...inputs) => this.cardStorage.getContact.apply(this.cardStorage, inputs);

    private storageAccessGroupRef= runExclusive.createGroupRef();

    public createContact = runExclusive.buildMethodCb(this.storageAccessGroupRef, (
        (...inputs) => this.cardStorage.createContact.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.createContact);

    public updateContact = runExclusive.buildMethodCb(this.storageAccessGroupRef, (
        (...inputs) => this.cardStorage.updateContact.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.updateContact);

    public deleteContact = runExclusive.buildMethodCb(this.storageAccessGroupRef, (
        (...inputs) => this.cardStorage.deleteContact.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.deleteContact);

    public writeNumber = runExclusive.buildMethodCb(this.storageAccessGroupRef, (
        (...inputs) => this.cardStorage.writeNumber.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.writeNumber);


}