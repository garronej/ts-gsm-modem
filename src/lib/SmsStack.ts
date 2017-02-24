import { AtStack } from "./AtStack";
import {
    atIdDict,
    AtMessage,
    AtMessageList,
    AtImps,
    MessageStat
} from "at-messages-parser";
import {
    SmsDeliver, 
    SmsDeliverPart, 
    SmsStatusReport, 
    TP_MTI,
    TP_ST, 
    ST_CLASS, 
    decodePdu, 
    buildSmsSubmitPdus 
} from "node-python-messaging";
import { execStack, ExecStack } from "ts-exec-stack";
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

    private evtSmsDeliver = new SyncEvent<[number, SmsDeliver| SmsDeliverPart]>();
    private evtSmsStatusReport = new SyncEvent<SmsStatusReport>();
    private readonly concatenatedSmsMap: {
        [ref: number]: {
            [seq: number]: [number, SmsDeliverPart]
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
        (atList: AtMessageList | undefined) => {

            if (!atList) return;

            for (let p_CMGL_SET of atList.atMessages as AtImps.P_CMGL_SET[]) {

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

                    if( sms instanceof SmsStatusReport ){
                            this.atStack.runCommand(`AT+CMGD=${p_CMGL_SET.index}\r`);
                            return;
                    }

                    this.evtSmsDeliver.post([p_CMGL_SET.index, sms as SmsDeliver | SmsDeliverPart]);

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

                if (error){
                    this.atStack.evtError.post(error);
                    return;
                }

                let messageId = this.generateMessageId();

                for (let pduWrap of pdus) {


                    this.atStack.runCommand(`AT+CMGS=${pduWrap.length}\r`);

                    let [resp] = await pr.typed(
                        this.atStack,
                        this.atStack.runCommandExt
                    )(`${pduWrap.pdu}\u001a`, {
                        "recoverable": true,
                    }) as [ AtImps.P_CMGS_SET | undefined];

                    if (!resp) {

                        for (let mr of Object.keys(this.mrMessageIdMap))
                            if (this.mrMessageIdMap[mr] === messageId)
                                delete this.mrMessageIdMap[mr];

                        callback!(NaN);

                        return;
                    }

                    this.mrMessageIdMap[resp.mr] = messageId;

                }

                this.statusReportMap[messageId] = {
                    "cnt": pdus.length,
                    "completed": 0
                };

                callback!(messageId);

            })();

        }
    );

    private registerListeners(): void {

        this.atStack.evtUnsolicitedMessage.attach(urc => {

            switch (urc.id) {
                case atIdDict.P_CMTI_URC:
                    this.retrieveSms((urc as AtImps.P_CMTI_URC).index);
                    break;
                case atIdDict.P_CDSI_URC:
                    this.retrieveSms((urc as AtImps.P_CDSI_URC).index);
                    break;
            }

        });

        this.evtSmsStatusReport.attach(smsStatusReport => {

            let messageId = this.mrMessageIdMap[smsStatusReport.ref];

            if (!messageId) return;

            let isDelivered: boolean= true;

            switch( smsStatusReport._stClass ){
                case "RESERVED":
                case "STILL TRYING": return;
                case "PERMANENT ERROR":
                case "TEMPORARY ERROR":
                case "SPECIFIC TO SC":
                    isDelivered= false;
                    break;
                case "COMPLETED": 
                    let elem = this.statusReportMap[messageId];
                    if (++elem.completed !== elem.cnt) return;
                    isDelivered= true;
                    break;
            }
            

            for (let mr of Object.keys(this.mrMessageIdMap))
                if (this.mrMessageIdMap[mr] === messageId)
                    delete this.mrMessageIdMap[mr];

            delete this.statusReportMap[messageId];

            this.evtMessageStatusReport.post({
                        "messageId": messageId,
                        "dischargeTime": smsStatusReport.sr.dt,
                        "isDelivered": isDelivered,
                        "status": TP_ST[smsStatusReport.sr.status]
            });

        });

        this.evtSmsDeliver.attach(([index, smsDeliver]) => {

            if (!(smsDeliver instanceof SmsDeliverPart)) {

                this.evtMessage.post({
                    "number": smsDeliver.number,
                    "date": smsDeliver.date,
                    "text": smsDeliver.text
                });
                this.atStack.runCommand(`AT+CMGD=${index}\r`);
                return;

            }

            if (!this.concatenatedSmsMap[smsDeliver.ref])
                this.concatenatedSmsMap[smsDeliver.ref] = {};

            this.concatenatedSmsMap[smsDeliver.ref][smsDeliver.seq] = [index, smsDeliver];

            if (Object.keys(this.concatenatedSmsMap[smsDeliver.ref]).length !== smsDeliver.cnt)
                return;

            let concatMessage: Message = {
                "number": smsDeliver.number,
                "date": smsDeliver.date,
                "text": ""
            };

            let ref = smsDeliver.ref;

            for (let seq = 1; seq <= smsDeliver.cnt; seq++) {
                let [index, sms] = this.concatenatedSmsMap[ref][seq];
                concatMessage.text += sms.text;
                this.atStack.runCommand(`AT+CMGD=${index}\r`);
            }

            delete this.concatenatedSmsMap[ref];

            this.evtMessage.post(concatMessage);

        });


    }

    private retrieveSms(index: number): void {

        this.atStack.runCommand(`AT+CMGR=${index}\r`,
            (resp: AtImps.P_CMGR_SET | undefined) => {

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
                            this.evtSmsDeliver.post([index, sms as SmsDeliver | SmsDeliverPart]);
                            return;
                        case TP_MTI.SMS_STATUS_REPORT:
                            this.evtSmsStatusReport.post(sms as SmsStatusReport);
                            this.atStack.runCommand(`AT+CMGD=${index}\r`);
                            return;
                    }

                });

            });

    }

}