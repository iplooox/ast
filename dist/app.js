"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ts_simple_ast_1 = require("ts-simple-ast");
var async = require("async");
var Request = /** @class */ (function () {
    function Request(name, referncesCount) {
        this.name = "";
        this.references = 0;
        this.paths = [];
        this.name = name;
        this.references = referncesCount;
    }
    return Request;
}());
var ReferenceScanner = /** @class */ (function () {
    function ReferenceScanner() {
        this.project = new ts_simple_ast_1.Project();
        this.requestsSourceFiles = [];
        this.foundRequests = [];
        this.getFiles();
        var now = new Date();
        this.scanNameSpace();
        this.foundRequests.forEach(function (x) {
            console.log("Request: " + x.name + " Used:" + x.references + " Paths: " + x.paths.map(function (x) { return "\n" + x.path; }) + "\nVerbs:" + x.paths.map(function (y) { return y.verbs; }));
        });
        console.log("Found: " + this.foundRequests.length + " used requests");
        console.log(new Date().getTime() - now.getTime());
    }
    ReferenceScanner.prototype.getFiles = function () {
        this.project.addExistingSourceFiles("../WebVersion/WorkBook.WebSite/typescript/**/*.ts");
        var requestDirectory = this.project.getDirectory("../WebVersion/WorkBook.WebSite/typescript/requests");
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
        var func = function (sourceFile) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var e_1, _a, requestClassList, _loop_1, this_1, requestClassList_1, requestClassList_1_1, requestClass;
            var _this = this;
            return tslib_1.__generator(this, function (_b) {
                console.log("Starting scanning " + sourceFile.getBaseName());
                requestClassList = sourceFile.getDescendantsOfKind(ts_simple_ast_1.SyntaxKind.ClassDeclaration);
                _loop_1 = function (requestClass) {
                    var references = requestClass.findReferencesAsNodes(); // findReferences is slower.
                    if (references.length !== 0) {
                        var requestName_1 = requestClass.getFirstDescendantByKindOrThrow(ts_simple_ast_1.SyntaxKind.Identifier);
                        if (requestName_1 === undefined) {
                            console.error("RequestName was not found");
                            return "continue";
                        }
                        var methods_1 = [];
                        async.each(references, function (x) {
                            if (requestName_1 === "EmployeeWhereAboutsRequest") {
                                return;
                            }
                            var newAssigmentVariable = _this.getOnlyNewAssignmentNode(x);
                            if (!newAssigmentVariable) {
                                return;
                            }
                            var hej2 = newAssigmentVariable.getNextSiblings();
                            async.each(hej2, function (y) {
                                var overridden = false;
                                var method = "";
                                y.getChildrenOfKind(ts_simple_ast_1.SyntaxKind.BinaryExpression).forEach(function (be) {
                                    if (be === undefined) {
                                        return;
                                    }
                                    var token = be.getOperatorToken();
                                    if (token === undefined) {
                                        return;
                                    }
                                    // We found an assignment
                                    if (token.getKind() === ts_simple_ast_1.SyntaxKind.EqualsToken) {
                                        var left = be.getLeft();
                                        if (left === undefined) {
                                            return;
                                        }
                                        var lastLeft = left.getLastChildByKind(ts_simple_ast_1.SyntaxKind.Identifier);
                                        if (lastLeft === undefined) {
                                            return;
                                        }
                                        var lastLeftText = lastLeft.getText();
                                        if (lastLeftText !== "method" && lastLeftText !== "overrideMethodWith") {
                                            return;
                                        }
                                        // We got an assignment of method/overrideMethodWith
                                        var right = be.getRight();
                                        if (right === undefined) {
                                            return;
                                        }
                                        var lastRight = right.getLastChildByKind(ts_simple_ast_1.SyntaxKind.Identifier);
                                        if (lastRight === undefined) {
                                            return;
                                        }
                                        if (overridden) {
                                            return;
                                        }
                                        overridden = overridden || lastLeftText === "overrideMethodWith";
                                        method = lastRight.getText();
                                    }
                                });
                                if (method !== "") {
                                    methods_1.push(method.toUpperCase());
                                }
                            });
                        });
                        if (methods_1.length === 0) {
                            methods_1.push("GET");
                        }
                        var foundRequest = new Request(requestName_1.getText(), references.length);
                        foundRequest.paths = references.map(function (x) { return { path: x.getSourceFile().getFilePath(), verbs: methods_1 }; });
                        this_1.foundRequests.push(foundRequest);
                    }
                };
                this_1 = this;
                try {
                    for (requestClassList_1 = tslib_1.__values(requestClassList), requestClassList_1_1 = requestClassList_1.next(); !requestClassList_1_1.done; requestClassList_1_1 = requestClassList_1.next()) {
                        requestClass = requestClassList_1_1.value;
                        _loop_1(requestClass);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (requestClassList_1_1 && !requestClassList_1_1.done && (_a = requestClassList_1.return)) _a.call(requestClassList_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return [2 /*return*/];
            });
        }); };
        async.each(this.requestsSourceFiles, func);
    };
    ReferenceScanner.prototype.getParentOfKindRecursive = function (node, kind) {
        if (node === undefined) {
            return node;
        }
        var parent = node.getParentIfKind(kind);
        if (!parent) {
            parent = this.getParentOfKindRecursive(node.getParent(), kind);
        }
        if (parent instanceof ts_simple_ast_1.SourceFile) {
            return undefined;
        }
        return parent;
    };
    ReferenceScanner.prototype.getOnlyNewAssignmentNode = function (node) {
        var newExpression = this.getParentOfKindRecursive(node, ts_simple_ast_1.SyntaxKind.NewExpression);
        var variableStatement = this.getParentOfKindRecursive(node, ts_simple_ast_1.SyntaxKind.VariableStatement);
        var importStatement = this.getParentOfKindRecursive(node, ts_simple_ast_1.SyntaxKind.VariableStatement);
        if (!newExpression || !variableStatement || importStatement) {
            return;
        }
        return node;
    };
    return ReferenceScanner;
}());
var hejsa = new ReferenceScanner();
//# sourceMappingURL=app.js.map