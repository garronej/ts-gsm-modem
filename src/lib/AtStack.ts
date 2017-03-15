import { SerialPortExt } from "./SerialPortExt";
import * as promisify from "ts-promisify";
import { SyncEvent } from "ts-events-extended";
import { execStack, ExecStack } from "ts-exec-stack";
import { Timer, setTimeout } from "timer-extended";

import * as _debug from "debug";
let debug= _debug("_AtStack");

require("colors");

import { 
    getSerialPortParser, 
    AtMessage 
} from "at-messages-parser";


export type RunCallback= (resp: AtMessage | undefined, final: AtMessage, raw: string)=> void;

export type RunParams= {
    userProvided: {
        recoverable?: boolean;
        reportMode?: AtMessage.ReportMode;
        retryOnErrors?: boolean | number[];
    };
    safe: {
        recoverable: boolean;
        reportMode: AtMessage.ReportMode;
        retryOnErrors: number[];
    }
};

export class Timers extends Array<Timer<any>> {

    constructor(){
        super();
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public add<T>(timer: Timer<T>): Timer<T>{

        for( let index=0; index<this.length; index++ )
            if( this[index].hasExec || this[index].hasBeenCleared )
                this.splice(index, 1);

        super.push(timer);

        return timer;

    }

    public clearAll(): void {
        for( let timer of this)
            timer.clear();
    }

}



export class AtStack {

    public readonly timers= new Timers();

    public readonly evtUnsolicitedMessage = new SyncEvent<AtMessage>();
    public readonly evtTerminate = new SyncEvent<Error | null>();

    private readonly serialPort: SerialPortExt;
    private readonly serialPortAtParser= getSerialPortParser(30000);
    constructor(path: string) {

        this.serialPort = new SerialPortExt(path, {
            "parser": this.serialPortAtParser
        });

        this.registerListeners();

        this.runCommand("ATZ\r");


    }

    public terminate(): void {
        if (this.serialPort.isOpen())
            this.serialPort.close();
        this.evtTerminate.post(null);
    }

    public readonly evtError = new SyncEvent<Error>();
    private readonly evtResponseAtMessage = new SyncEvent<AtMessage>();


    private readonly parseErrorDelay = 30000;


    private registerListeners(): void {

        this.evtError.attach(error => {

            debug("unrecoverable error: ".red, error);

            if (this.serialPort.isOpen())
                this.serialPort.close();


            this.evtTerminate.post(error);

        });

        //this.serialPortAtParser.evtRawData.attach(rawAtMessages => debug(JSON.stringify(rawAtMessages).yellow));
        //this.evtUnsolicitedMessage.attach(atMessage => debug(JSON.stringify(atMessage, null, 2).yellow));

        this.serialPort.once("disconnect", () => { debug("disconnect"); this.evtTerminate.post(null); });

        this.serialPort.once("close", () => { debug("close"); this.timers.clearAll(); });

        this.serialPort.evtError.attach(this.evtError);

        this.serialPort.on("data", (atMessage: AtMessage | null, unparsed: string) => {

            if (!atMessage) {
                this.evtError.post(new ParseError(unparsed));
                return;
            }

            //debug(JSON.stringify(atMessage.id));

            if (atMessage.isUnsolicited)
                this.evtUnsolicitedMessage.post(atMessage);
            else {
                this.evtResponseAtMessage.post(atMessage);
            }

        });

    }


    public runCommand = execStack(this.runCommandManageParams);

    public runCommandExt: (command: String, params: RunParams['userProvided'], callback?: RunCallback) => void = this.runCommand;
    public runCommandDefault: (command: string, callback?: RunCallback) => void = this.runCommand;

    private runCommandManageParams(command: string, callback?: RunCallback): void;
    private runCommandManageParams(command: String, params: RunParams['userProvided'], callback?: RunCallback): void;
    private runCommandManageParams(...inputs: any[]): void {

        let command: string | undefined = undefined;
        let params: RunParams['userProvided'] | undefined = undefined;
        let callback: RunCallback = function () { };

        for (let input of inputs) {
            switch (typeof input) {
                case "string": command = input; break;
                case "object": params = input; break;
                case "function": callback = input; break;
            }
        }

        this.runCommandSetReportMode(
            command!,
            AtStack.generateSafeRunParams(params),
            callback
        );

    }


    private static generateSafeRunParams(
        params: RunParams['userProvided'] | undefined
    ): RunParams['safe'] {

        if (!params) params = {};

        if (typeof params.recoverable !== "boolean")
            params.recoverable = false;

        if (typeof params.reportMode !== "number")
            params.reportMode = AtMessage.ReportMode.DEBUG_INFO_VERBOSE;

        switch (typeof params.retryOnErrors) {
            case "boolean": break;
            case "object":
                if (params.reportMode === AtMessage.ReportMode.NO_DEBUG_INFO)
                    params.retryOnErrors = false;
                break;
            default:
                if (params.reportMode === AtMessage.ReportMode.NO_DEBUG_INFO)
                    params.retryOnErrors = false;
                else
                    params.retryOnErrors = [14, 500];
        }

        if (!params.retryOnErrors)
            params.retryOnErrors = [];
        else if (typeof params.retryOnErrors === "boolean") {
            params.retryOnErrors = [];
            (params.retryOnErrors as number[]).indexOf = (...inputs) => { return 0; };
        }

        return params as RunParams['safe'];


    }

    private reportMode: AtMessage.ReportMode | undefined = undefined;

    private runCommandSetReportMode(
        command: string,
        params: RunParams['safe'],
        callback: RunCallback
    ): void {

        let { reportMode } = params;

        if (reportMode !== this.reportMode) {

            this.runCommandSetEcho(`AT+CMEE=${reportMode}\r`,
                { "recoverable": false, "retryOnErrors": [] } as any,
                () => {
                    this.reportMode = params.reportMode;
                    this.runCommandSetEcho(command,
                        params,
                        (resp, final, raw) => {

                            if (command.match(/(^ATZ\r$)|(^AT\+CMEE=\ ?[0-9]\r$)/))
                                this.reportMode = undefined;

                            callback(resp, final, raw);

                        })
                });
            return;
        }

        this.runCommandSetEcho(command, params, callback);

    }

    private isEchoEnable: boolean | undefined = undefined;
    private hideEcho = false;

    private runCommandSetEcho(
        command: string,
        params: RunParams['safe'],
        callback: RunCallback
    ): void {

        let finalCallback: RunCallback = (...inputs) => {

            this.isEchoEnable = true;

            if (command.match(/^ATZ\r$/)) {
                this.isEchoEnable = undefined;
                this.hideEcho = false;
            } else if (command.match(/^ATE0\r$/)) {
                this.isEchoEnable = false;
                this.hideEcho = true;
            } else if (command.match(/^ATE1?\r$/)) {
                this.isEchoEnable = true;
                this.hideEcho = false;
            }

            callback.apply(null, inputs);

        };

        if (!this.isEchoEnable) {

            this.runCommandRetry(`ATE1\r`,
                { "recoverable": false, "retryOnErrors": [] } as any,
                () => this.runCommandRetry(command, params, finalCallback));
            return;

        }

        this.runCommandRetry(command, params, finalCallback);

    }


    private readonly maxRetry = 10;
    private readonly delayBeforeRetry = 5000;

    private retryLeft = this.maxRetry;

    private runCommandRetry(
        command: string,
        params: RunParams['safe'],
        callback: RunCallback
    ): void {

        let { retryOnErrors, recoverable } = params;

        let finalCallback: RunCallback = (...inputs) => {

            this.retryLeft = this.maxRetry;

            callback.apply(null, inputs);

        };

        this.runCommandBase(command, (resp, final, raw) => {
            if (final.isError) {

                let code = NaN;

                if (
                    final.id === AtMessage.idDict.COMMAND_NOT_SUPPORT ||
                    final.id === AtMessage.idDict.TOO_MANY_PARAMETERS
                ) this.retryLeft = 0;
                else if (
                    final.id === AtMessage.idDict.P_CME_ERROR ||
                    final.id === AtMessage.idDict.P_CMS_ERROR
                ) code = (final as AtMessage.P_CME_ERROR | AtMessage.P_CMS_ERROR).code;

                if (!this.retryLeft-- || retryOnErrors.indexOf(code) < 0) {

                    if (!recoverable) {
                        this.evtError.post(new RunCommandError(command, final));
                        return;
                    }

                    finalCallback(resp, final, raw);

                    return;

                }

                this.timers.add(
                    setTimeout(
                        () => this.runCommandRetry(command, params, callback),
                        this.delayBeforeRetry
                    )
                );

                return;
            }

            finalCallback(resp, final, raw);

        });
    }


    private readonly retryMaxWrite = 3;
    private readonly delayReWrite = 5000;
    private retryLeftReWrite = this.retryMaxWrite;

    private runCommandBase(
        command: string,
        callback: RunCallback
    ): void {

        //debug(JSON.stringify(command).blue);

        let timer = this.timers.add(setTimeout(() => {

            debug("on timeout!!!!!".red);

            this.evtResponseAtMessage.detach();

            let unparsed = this.serialPortAtParser.flush();

            if (unparsed) {
                console.log("on est là unparsed");
                (this.serialPort as any).emit("data", null, unparsed);
                return;
            }

            if (!this.retryLeftReWrite--) {
                this.evtError.post(new Error("Modem not responding"));
                return;
            }

            this.runCommandBase(command, callback);


        }, this.delayReWrite));


        Promise.all([
            new Promise(
                resolve => this.serialPort.writeAndDrain(
                    command,
                    serialPortError => {
                        if (serialPortError) {
                            this.serialPort.evtError.post(serialPortError);
                            return;
                        }
                        resolve();
                    }
                )
            ),
            new Promise<[AtMessage | undefined, AtMessage, string]>(resolve => {

                let rawEcho = "";
                let resp: AtMessage | undefined = undefined;

                this.evtResponseAtMessage.attach(atMessage => {

                    timer.clear();

                    if (atMessage.isFinal) {
                        this.evtResponseAtMessage.detach();
                        resolve([resp, atMessage, [
                            (this.hideEcho) ? "" : rawEcho,
                            (resp) ? resp.raw : "",
                            atMessage.raw
                        ].join("")]);
                    } else if (atMessage.id === AtMessage.idDict.ECHO)
                        rawEcho += atMessage.raw;
                    else resp = atMessage;

                });

            })
        ]).then(([_, [resp, final, raw]]) => {

            //debug(`${JSON.stringify((resp ? resp.raw : "") + " *** " + final.raw)}`.green);

            this.retryLeftReWrite = this.retryMaxWrite;

            callback(resp, final, raw);
        });

    }

}

export class RunCommandError extends Error {

    constructor(public readonly command: string,
        public readonly atMessageError: AtMessage) {
        super(RunCommandError.name);
        Object.setPrototypeOf(this, RunCommandError.prototype)

    }
}

export class ParseError extends Error {

    constructor(public readonly unparsed: string) {
        super(ParseError.name);
        Object.setPrototypeOf(this, ParseError.prototype)
    }

}