"use strict";
exports.__esModule = true;
var ts_simple_ast_1 = require("ts-simple-ast");
var project = new ts_simple_ast_1.Project({
    compilerOptions: {
        tsConfigFilePath: "./tsconfig.json"
    }
});
project.getSourceFileOrThrow("src/ExistingFile.ts");
var diagnostics = project.getPreEmitDiagnostics();
console.log("hej");
console.log("WTF IS THIS POOOOP");
console.log(project.formatDiagnosticsWithColorAndContext(diagnostics));
