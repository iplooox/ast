"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ts_simple_ast_1 = require("ts-simple-ast");
var request = /** @class */ (function () {
    function request(name, referncesCount) {
        this.name = "";
        this.references = 0;
        this.paths = [];
        this.name = name;
        this.references = referncesCount;
    }
    return request;
}());
var ReferenceScanner = /** @class */ (function () {
    function ReferenceScanner() {
        this.project = new ts_simple_ast_1.Project();
        this.requestsSourceFiles = [];
        this.foundRequests = [];
        this.getFiles();
        this.scanNameSpace();
        this.foundRequests.forEach(function (x) {
            console.log("Request: " + x.name + " Used:" + x.references + " Paths: " + x.paths.map(function (x) { return x.path + " \n"; }));
        });
        console.log("Found: " + this.foundRequests.length + " used requests");
    }
    ReferenceScanner.prototype.getFiles = function () {
        this.project.addExistingSourceFiles("../../WebVersion/WorkBook.WebSite/typescript/**/*.ts");
        var requestDirectory = this.project.getDirectory("../../WebVersion/WorkBook.WebSite/typescript/requests");
        if (requestDirectory === undefined) {
            console.error("Request directory not found.");
            return;
        }
        var filesToSkipFromScanning = new Set(["standardRequest.ts"]);
        this.requestsSourceFiles = requestDirectory.getSourceFiles().filter(function (x) { return !filesToSkipFromScanning.has(x.getBaseName()); });
        console.log("Found " + this.project.getSourceFiles().length + " source files.");
        console.log("Found " + this.requestsSourceFiles.length + " source files in request directory");
    };
    ReferenceScanner.prototype.scanNameSpace = function () {
        var _this = this;
        this.requestsSourceFiles.forEach(function (sourceFile) {
            var e_1, _a;
            console.log("Starting scanning " + sourceFile.getBaseName());
            var requestClassList = sourceFile.getDescendantsOfKind(ts_simple_ast_1.SyntaxKind.ClassDeclaration);
            try {
                for (var requestClassList_1 = tslib_1.__values(requestClassList), requestClassList_1_1 = requestClassList_1.next(); !requestClassList_1_1.done; requestClassList_1_1 = requestClassList_1.next()) {
                    var requestClass = requestClassList_1_1.value;
                    var references = requestClass.findReferencesAsNodes(); //findReferences is slower.
                    if (references.length !== 0) {
                        var requestName = requestClass.getFirstDescendantByKindOrThrow(ts_simple_ast_1.SyntaxKind.Identifier);
                        if (requestName === undefined) {
                            console.error("RequestName was not found");
                            continue;
                        }
                        if (requestName.getText() === "standardRequest") {
                            return;
                        }
                        var foundRequest = new request(requestName.getText(), references.length);
                        foundRequest.paths = references.map(function (x) { return { path: x.getSourceFile().getFilePath() }; });
                        _this.foundRequests.push(foundRequest);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (requestClassList_1_1 && !requestClassList_1_1.done && (_a = requestClassList_1.return)) _a.call(requestClassList_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    };
    return ReferenceScanner;
}());
var hejsa = new ReferenceScanner();
//# sourceMappingURL=app.js.map