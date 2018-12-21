import { ReferenceScanner } from "./app";
import { SourceFile } from 'ts-simple-ast';
import * as Cluster from "cluster"

export class ScannerWorker {
    filesToScan = new Map<SourceFile, boolean>();
    scanner = new ReferenceScanner();

    constructor() {
        if (Cluster.isMaster) {
            this.getFilesToScan();
        } else {

        }
    }

    getFilesToScan = () => {
        this.scanner.requestsSourceFiles.forEach(x => {
            this.filesToScan.set(x, false);
        });
    }

    startScanning = () => {

    }

    scan = (): void => {
        const scanner = new ReferenceScanner();

        if (scanner.requestsSourceFiles.length == 0)
            return;

    }
}