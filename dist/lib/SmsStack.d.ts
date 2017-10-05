import { AtStack } from "./AtStack";
import { SyncEvent } from "ts-events-extended";
import "colors";
export interface Message {
    number: string;
    date: Date;
    text: string;
}
export interface StatusReport {
    messageId: number;
    dischargeTime: Date;
    isDelivered: boolean;
    recipient: string;
    status: string;
}
export declare class SmsStack {
    private readonly atStack;
    private debug;
    readonly evtMessage: SyncEvent<Message>;
    readonly evtMessageStatusReport: SyncEvent<StatusReport>;
    private evtSmsDeliver;
    private evtSmsStatusReport;
    private readonly uncompletedMultipartSms;
    constructor(atStack: AtStack);
    private retrieveUnreadSms(used, capacity);
    private readonly statusReportMap;
    private readonly mrMessageIdMap;
    private sendPdu(pduLength, pdu);
    private readonly maxTrySendPdu;
    sendMessage: (number: string, text: string, callback?: ((messageId: number | undefined) => void) | undefined) => Promise<number | undefined>;
    private registerListeners();
    private retrievePdu(index);
}
