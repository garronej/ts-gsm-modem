// Type definitions for serialport 4.0.7




declare module "serialport" {

    type Options = {
        baudRate?: number;
        autoOpen?: boolean;
        parity?: 'none' | 'even' | 'mark' | 'odd' | 'space';
        xon?: boolean,
        xoff?: boolean,
        xany?: boolean,
        rtscts?: boolean,
        hupcl?: boolean,
        dataBits?: number,
        stopBits?: number,
        bufferSize?: number,
        lock?: boolean,
        parser?: (emitter: NodeJS.EventEmitter, buffer: Buffer | string) => void,
        platformOptions?: Object
    };


    class SerialPort{
        constructor(path: string, options?: Options, openImmediately?: boolean, callback?: (err: string) => void)
        isOpen(): boolean;
        on(event: "data", callback: (...data: any[]) => void): SerialPort;
        on(event: "error", callback: (error: string | Error) => void): SerialPort;
        on(event: "disconnect", callback: (error: string | Error | null) => void): SerialPort;
        on(event: "open", callback: () => void): SerialPort;
        open(callback: () => void): void;
        write(buffer: Buffer | string, callback?: (error: string | Error | null) => void): void
        pause(): void;
        resume(): void;
        disconnected(error: string | Error): void;
        close(callback?: (error: string | Error | null) => void): void;
        flush(callback?: (err: string | Error | null) => void): void;
        set(options: SerialPort.setOptions, callback: () => void): void;
        drain(callback?: (error: string | Error | null) => void): void;
        update(options: SerialPort.updateOptions, callback?: () => void): void;
        static list(callback: (err: string, ports: SerialPort.portConfig[]) => void): void;
        static parsers: {
            readline: (delimiter: string) => void,
            raw: (emitter: any, buffer: string) => void
        };
        listenerCount: NodeJS.EventEmitter["listenerCount"];

    }

    namespace SerialPort {
        interface portConfig {
            comName: string;
            manufacturer: string;
            serialNumber: string;
            pnpId: string;
            locationId: string;
            vendorId: string;
            productId: string;
        }

        interface setOptions {
            brk?: boolean;
            cts?: boolean;
            dsr?: boolean;
            dtr?: boolean;
            rts?: boolean;
        }

        interface updateOptions {
            baudRate?: number;
        }
    }

    export = SerialPort
}
