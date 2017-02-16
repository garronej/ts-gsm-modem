import { AtStack } from "./AtStack";
import {
    atIdDict,
    AtMessage,
    AtMessageList,
    AtImps,
    MessageStat
} from "at-messages-parser";
import {
    decodePdu,
    buildSmsSubmitPdus,
    Sms,
    TP_ST,
    TP_MTI,
    ST_CLASS,
    stClassOf
} from "node-python-messaging";
import { execStack } from "ts-exec-stack";
import { SyncEvent } from "ts-events-extended";

import * as pr from "ts-promisify";

require("colors");

export interface Message {
    number: string;
    date: Date;
    text: string;
}

export interface StatusReport {
    messageId: number;
    dischargeTime: Date;
    isDelivered: boolean;
    status: string;
}

export class SmsStack {

    public readonly evtMessage = new SyncEvent<Message>();
    public readonly evtMessageStatusReport = new SyncEvent<StatusReport>();

    private evtSmsDeliver = new SyncEvent<[number, Sms]>();
    private evtSmsStatusReport = new SyncEvent<Sms>();
    private readonly concatenatedSmsMap: {
        [ref: number]: {
            [seq: number]: [number, Sms]
        }
    } = {};

    constructor(private readonly atStack: AtStack) {

        atStack.runCommand('AT+CPMS="SM","SM","SM"\r');
        atStack.runCommand('AT+CNMI=1,1,0,2,0\r');

        this.registerListeners();
        this.retrieveUnreadSms();

    }

    private retrieveUnreadSms(): void {

        this.atStack.runCommand(`AT+CMGL=${MessageStat.ALL}\r`, 
        (atList: AtMessageList) => {

            if (!atList) return;

            for (let atMessage of atList.atMessages) {

                let p_CMGL_SET = atMessage as AtImps.P_CMGL_SET;

                if (
                    p_CMGL_SET.stat !== MessageStat.REC_READ &&
                    p_CMGL_SET.stat !== MessageStat.REC_UNREAD
                ) {

                    this.atStack.runCommand(`AT+CMGD=${p_CMGL_SET.index}\r`);
                    return;
                }

                decodePdu(p_CMGL_SET.pdu, (error, sms) => {


                    if (error) {
                        console.log("PDU not decrypted: ".red, p_CMGL_SET.pdu, error);
                        this.atStack.runCommand(`AT+CMGD=${p_CMGL_SET.index}\r`);
                        return;

                    }

                    switch (sms.type) {
                        case TP_MTI.SMS_DELIVER:
                            this.evtSmsDeliver.post([p_CMGL_SET.index, sms]);
                            return;
                        case TP_MTI.SMS_STATUS_REPORT:
                            this.atStack.runCommand(`AT+CMGD=${p_CMGL_SET.index}\r`);
                            return;
                    }


                });

            }

        });


    }

    private generateMessageId: () => number = (() => {
        let id = 1;
        return () => { return id++; }
    })();

    private readonly statusReportMap: {
        [messageId: number]: {
            cnt: number,
            completed: number
        }
    } = {};

    private readonly mrMessageIdMap: {
        [mr: number]: number;
    } = {};

    public sendMessage = execStack(
        (number: string,
            text: string,
            callback?: (messageId: number) => void
        ): void => {
            (async () => {

                let [error, pdus] = await pr.typed(buildSmsSubmitPdus)({
                    "number": number,
                    "text": text,
                    "request_status": true
                });

                if (error) throw error;

                let messageId = this.generateMessageId();

                for (let pduWrap of pdus) {

                    this.atStack.runCommand(`AT+CMGS=${pduWrap.length}\r`);

                    let [resp] = await pr.typed(
                        this.atStack,
                        this.atStack.runCommandExt
                    )(`${pduWrap.pdu}\u001a`, {
                        "recoverable": true,
                    });

                    if (!resp) {

                        for (let mr of Object.keys(this.mrMessageIdMap))
                            if (this.mrMessageIdMap[mr] === messageId)
                                delete this.mrMessageIdMap[mr];

                        callback(null);

                        return;
                    }

                    let p_CMGS_SET = resp as AtImps.P_CMGS_SET;

                    this.mrMessageIdMap[p_CMGS_SET.mr] = messageId;

                }

                this.statusReportMap[messageId] = {
                    "cnt": pdus.length,
                    "completed": 0
                };

                callback(messageId);

            })();

        }
    );

    private registerListeners(): void {

        this.evtSmsStatusReport.attach(sms => {

            let messageId = this.mrMessageIdMap[sms.ref];

            if (!messageId) return;

            let statusReport: StatusReport;

            switch (stClassOf(sms.sr.status)) {
                case ST_CLASS.RESERVED:
                case ST_CLASS.STILL_TRYING: return;
                case ST_CLASS.PERMANENT_ERROR:
                case ST_CLASS.TEMPORARY_ERROR:
                case ST_CLASS.SPECIFIC_TO_SC:
                    statusReport = {
                        "messageId": messageId,
                        "dischargeTime": sms.sr.dt,
                        "isDelivered": false,
                        "status": TP_ST[sms.sr.status]
                    };
                    break;
                case ST_CLASS.COMPLETED:
                    let elem = this.statusReportMap[messageId];
                    if (++elem.completed !== elem.cnt)
                        return;
                    statusReport = {
                        "messageId": messageId,
                        "dischargeTime": sms.sr.dt,
                        "isDelivered": true,
                        "status": TP_ST[sms.sr.status]
                    };
            }

            for (let mr of Object.keys(this.mrMessageIdMap))
                if (this.mrMessageIdMap[mr] === messageId)
                    delete this.mrMessageIdMap[mr];

            delete this.statusReportMap[messageId];

            this.evtMessageStatusReport.post(statusReport);

        });

        this.evtSmsDeliver.attach(([index, sms]) => {

            if (typeof (sms.ref) !== "number") {

                this.evtMessage.post({
                    "number": sms.number,
                    "date": sms.date,
                    "text": sms.text
                });
                this.atStack.runCommand(`AT+CMGD=${index}\r`);
                return;

            }

            if (!this.concatenatedSmsMap[sms.ref])
                this.concatenatedSmsMap[sms.ref] = {};

            this.concatenatedSmsMap[sms.ref][sms.seq] = [index, sms]

            if (Object.keys(this.concatenatedSmsMap[sms.ref]).length !== sms.cnt)
                return;

            let concatMessage: Message = {
                "number": sms.number,
                "date": sms.date,
                "text": ""
            };

            let ref = sms.ref;

            for (let seq = 1; seq <= sms.cnt; seq++) {
                let [index, sms] = this.concatenatedSmsMap[ref][seq];
                concatMessage.text += sms.text;
                this.atStack.runCommand(`AT+CMGD=${index}\r`);
            }

            delete this.concatenatedSmsMap[ref];

            this.evtMessage.post(concatMessage);

        });

        this.atStack.evtUnsolicitedMessage.attach(atMessage => {

            switch (atMessage.id) {
                case atIdDict.P_CMTI_URC:
                    let atMessageCMTI = atMessage as AtImps.P_CMTI_URC;
                    this.retrieveSms(atMessageCMTI.index);
                    break;
                case atIdDict.P_CDSI_URC:
                    let atMessageCDSI = atMessage as AtImps.P_CDSI_URC;
                    this.retrieveSms(atMessageCDSI.index);
                    break;
            }

        });

    }

    private retrieveSms(index: number): void {

        this.atStack.runCommand(`AT+CMGR=${index}\r`, 
        (resp: AtImps.P_CMGR_SET) => {

            if (!resp) return;

            if (resp.stat !== MessageStat.REC_UNREAD) return;

            decodePdu(resp.pdu, (error, sms) => {

                if (error) {
                    console.log("PDU not decrypted: ".red, resp.pdu, error);
                    this.atStack.runCommand(`AT+CMGD=${index}\r`);
                    return;
                }

                switch (sms.type) {

                    case TP_MTI.SMS_DELIVER:
                        this.evtSmsDeliver.post([index, sms]);
                        return;
                    case TP_MTI.SMS_STATUS_REPORT:
                        this.evtSmsStatusReport.post(sms);
                        this.atStack.runCommand(`AT+CMGD=${index}\r`);
                        return;
                }

            });

        });

    }

}