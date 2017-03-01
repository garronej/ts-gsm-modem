import { AtStack } from "./AtStack";
import { AtMessage, ReportMode, LockedPinState } from "at-messages-parser";
import { SystemState } from "./SystemState";
import { CardLockFacility, UnlockCodeRequest } from "./CardLockFacility";
import { CardStorage, Contact } from "./CardStorage";

import { SmsStack, Message, StatusReport } from "./SmsStack";
import { SyncEvent, VoidSyncEvent } from "ts-events-extended";
import { execStack, ExecStack} from "ts-exec-stack";


require("colors");

process.on("unhandledRejection", error=> { 
    console.log("INTERNAL ERROR".red);
    console.log(error);
    throw error;
});


export interface UnlockCodeProviderCallback {
    (pin: string): void;
    (puk: string, newPin: string): void;
}

export interface UnlockCodeProvider {
    handler(
        imei: string,
        pinState: LockedPinState,
        tryLeft: number,
        callback: UnlockCodeProviderCallback
    ): void;
    explicit: { pinFirstTry: string; pinSecondTry?: string };
}

export type CreateCallback= (modem:Modem, hasSim:boolean)=> void;



export class Modem {

    private static getSafeUnlockCodeProvider(
        unlockCodeProvider: UnlockCodeProvider['handler'] | UnlockCodeProvider['explicit'] | undefined 
    ): UnlockCodeProvider['handler'] {

            switch (typeof unlockCodeProvider) {
                case "object":
                    let explicit = unlockCodeProvider as UnlockCodeProvider['explicit'];
                    let pins = [explicit.pinFirstTry, explicit.pinSecondTry];
                    return (imei, pinState, tryLeft, callback) => {

                        if (pinState === "SIM PIN") {

                            if (tryLeft === 1)
                                throw new Error("Prevent unlock sim, only one try left!");

                            let pin = pins.shift();

                            if (pin) {
                                callback(pin);
                                return;
                            }
                        }

                        throw new Error(`No unlock action defined for ${pinState}, tryLeft: ${tryLeft}`);

                    };
                case "function":
                    return unlockCodeProvider as UnlockCodeProvider['handler'];
                default: throw new Error("No action defined for unlock card");
            }

    }

    public static create(
        params: {
            path: string;
            unlockCodeProvider?: UnlockCodeProvider['handler'] | UnlockCodeProvider['explicit'];
            disableSmsFeatures?: boolean;
            disableContactsFeatures?: boolean;
        },
        callback: CreateCallback
    ): void {

        new Modem({
            "path": params.path,
            "unlockCodeProvider": Modem.getSafeUnlockCodeProvider(params.unlockCodeProvider),
            "enableSmsStack": !(params.disableSmsFeatures === true),
            "enableCardStorage": !(params.disableContactsFeatures === true)
        }, callback);

    };



    private readonly atStack: AtStack;
    private readonly systemState: SystemState;

    public imei: string;

    private constructor(
        private readonly params: {
            path: string;
            unlockCodeProvider: UnlockCodeProvider['handler'];
            enableSmsStack: boolean;
            enableCardStorage: boolean;
        },
        private readonly callback: CreateCallback
    ) {

        this.atStack = new AtStack(params.path);

        this.atStack.runCommand("AT+CGSN\r", resp => {
            this.imei = resp!.raw.split("\r\n")[1];
        });

        this.systemState = new SystemState(this.atStack);

        this.systemState.evtReportSimPresence.attachOnce(hasSim => {

            if (!hasSim) {
                callback(this, false);
                return;
            }

            this.initCardLockFacility();

        });

    }


    public readonly runCommand = execStack(
        ((...inputs) => this.atStack.runCommand.apply(this.atStack, inputs)
        ) as typeof AtStack.prototype.runCommand
    );


    public terminate: typeof AtStack.prototype.terminate =
    (...inputs) => this.atStack.terminate.apply(this.atStack, inputs);


    public get evtTerminate(): typeof AtStack.prototype.evtTerminate {
        return this.atStack.evtTerminate;
    }

    public get evtUnsolicitedAtMessage(): typeof AtStack.prototype.evtUnsolicitedMessage {
        return this.atStack.evtUnsolicitedMessage;
    }


    private initCardLockFacility(): void {

        let cardLockFacility = new CardLockFacility(this.atStack);

        cardLockFacility.evtUnlockCodeRequest.attach(({pinState, times}) => {

            this.params.unlockCodeProvider(this.imei, pinState, times, (...inputs) => {

                switch (pinState) {
                    case "SIM PIN": cardLockFacility.enterPin(inputs[0]); return;
                    case "SIM PIN2": cardLockFacility.enterPin2(inputs[0]); return;
                    case "SIM PUK": cardLockFacility.enterPuk(inputs[0], inputs[1]); return;
                    case "SIM PUK2": cardLockFacility.enterPuk2(inputs[0], inputs[1]); return;
                }

            });



        });

        cardLockFacility.evtPinStateReady.attachOnce(this, function callee() {

            let self = this as Modem;

            if (!self.systemState.isValidSim) {
                self.systemState.evtValidSim.attachOnce(() => callee.call(self));
                return;
            }


            if (self.params.enableSmsStack) self.initSmsStack();
            if (self.params.enableCardStorage) self.initCardStorage();
            else self.callback(self, true);
        });

    }

    private smsStack: SmsStack;

    public readonly evtMessage = new SyncEvent<Message>();
    public readonly evtMessageStatusReport = new SyncEvent<StatusReport>();

    private initSmsStack(): void {

        this.smsStack = new SmsStack(this.atStack);

        this.smsStack.evtMessage.attach(data => {
            if (!this.evtMessage.evtAttach.postCount)
                this.evtMessage.evtAttach.attachOnce(() => this.evtMessage.post(data));
            else
                this.evtMessage.post(data);
        });

        this.smsStack.evtMessageStatusReport.attach(data => {
            if (!this.evtMessageStatusReport.evtAttach.postCount)
                this.evtMessageStatusReport.evtAttach.attachOnce(() => this.evtMessageStatusReport.post(data));
            else
                this.evtMessageStatusReport.post(data);
        });

    }


    public sendMessage = execStack(function callee(...inputs) {

        let self = this as Modem;

        if (!self.systemState.isNetworkReady) {
            self.systemState.evtNetworkReady.attachOnce(() => callee.apply(self, inputs));
            return;
        }

        self.smsStack.sendMessage.apply(self.smsStack, inputs);

    } as typeof SmsStack.prototype.sendMessage);




    private cardStorage: CardStorage;

    private initCardStorage(): void {

        this.cardStorage = new CardStorage(this.atStack);

        this.cardStorage.evtReady.attachOnce(() => this.callback(this, true));

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

    public createContact = execStack(Modem, "WRITE", (
        (...inputs) => this.cardStorage.createContact.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.createContact);

    public updateContact = execStack(Modem, "WRITE", (
        (...inputs) => this.cardStorage.updateContact.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.updateContact);

    public deleteContact = execStack(Modem, "WRITE", (
        (...inputs) => this.cardStorage.deleteContact.apply(this.cardStorage, inputs)
    ) as typeof CardStorage.prototype.deleteContact);


}