import { Project, SyntaxKind, SourceFile, Node, ts, VariableStatement, Identifier } from "ts-simple-ast";
import * as async from "async";
import { stringify } from 'querystring';

interface PathWithVerb {
    path: string | undefined;
    verbs: string[];
}

class Request {
    name: string = "";
    references: number = 0;
    paths: PathWithVerb[] = [];
    constructor(name: string, referncesCount: number) {
        this.name = name;
        this.references = referncesCount;
    }
}

class ReferenceScanner {
    private project = new Project();
    private requestsSourceFiles: SourceFile[] = [];
    //readonly foundRequests: Request[] = [];
    readonly foundRequests: Map<string, Map<string, Set<string>>> = new Map<string, Map<string, Set<string>>>();
    constructor() {
        this.getFiles();
        var now = new Date();
        this.scanNameSpace();

        this.foundRequests.forEach((value, key) => {
            // if (!Array.from(value.values()).some(x => Array.from(x).length > 1)) {
            //     return;
            // }
            console.log(`Request: ${key}`);
            console.log(`   Used: ${Array.from(value.values()).length}`);
            console.log(`   References:`);
            value.forEach((value1, key1) => {
                console.log(`       Path: ${key1}`);
                console.log(`       Verbs: ${Array.from(value1.values())}`);
            });
        })
        //         this.foundRequests.forEach(x => {
        //             if (x.name !== "PipelineCopyRequest") {
        //                 return;
        //             }
        //             console.log(`
        // Request: ${x.name}
        //     Used:${x.references}
        //         References:${x.paths.map(x => {
        //                 return `
        //             Path: ${x.path}
        //             Verbs: ${x.verbs}`;
        //             })}`);
        //         });

        console.log(`Found: ${Array.from(this.foundRequests.keys()).length} used requests`);
        console.log(new Date().getTime() - now.getTime());
    }

    getFiles(): void {
        this.project.addExistingSourceFiles("../WebVersion/WorkBook.WebSite/typescript/**/*.ts");
        const requestDirectory = this.project.getDirectory("../WebVersion/WorkBook.WebSite/typescript/requests");
        if (requestDirectory === undefined) {
            console.error(`Request directory not found.`);
            return;
        }

        const filesToSkipFromScanning = new Set(["standardRequest.ts"]);
        this.requestsSourceFiles = requestDirectory.getSourceFiles().filter(x => { return !filesToSkipFromScanning.has(x.getBaseName()); });


        console.log(`Found ${this.project.getSourceFiles().length} source files.`);
        console.log(`Found ${this.requestsSourceFiles.length} source files in request directory`);
    }

    scanNameSpace() {
        var func = async (sourceFile: SourceFile) => {
            console.log(`Starting scanning ${sourceFile.getBaseName()}`);
            const requestClassList = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);

            for (const requestClass of requestClassList) {
                const references = requestClass.findReferencesAsNodes(); // findReferences is slower.
                if (references.length !== 0) {
                    const requestName = requestClass.getFirstDescendantByKindOrThrow(SyntaxKind.Identifier);
                    if (requestName === undefined) {
                        console.error("RequestName was not found");
                        continue;
                    }

                    let verifiedReferences: { reference: Node<ts.Node>, methods: string[] }[] = [];

                    async.each(references, x => {
                        if (requestName.getText() === "PipelineCopyRequest") {
                            console.log("hej");
                        }

                        const newAssigmentVariableStatement = this.getOnlyNewAssignmentVariableStatementNode(x);
                        if (newAssigmentVariableStatement === undefined) {
                            return;
                        }
                        const methods: string[] = [];

                        const hej2 = newAssigmentVariableStatement.getNextSiblings();
                        async.each(hej2, y => {
                            let method: string = "";
                            y.getChildrenOfKind(SyntaxKind.BinaryExpression).forEach(be => {
                                if (be === undefined) {
                                    return;
                                }
                                var token = be.getOperatorToken();
                                if (token === undefined) {
                                    return;
                                }
                                // We found an assignment
                                if (token.getKind() === SyntaxKind.EqualsToken) {
                                    var left = be.getLeft();
                                    if (left === undefined) {
                                        return;
                                    }
                                    var lastLeft = left.getLastChildByKind(SyntaxKind.Identifier);
                                    if (lastLeft === undefined) {
                                        return;
                                    }
                                    var lastLeftText = lastLeft.getText();
                                    if (lastLeftText !== "method") {
                                        return;
                                    }
                                    // We got an assignment of method/overrideMethodWith
                                    var right = be.getRight();
                                    if (right === undefined) {
                                        return;
                                    }
                                    var lastRight = right.getLastChildByKind(SyntaxKind.Identifier);
                                    if (lastRight === undefined) {
                                        return;
                                    }
                                    method = lastRight.getText();
                                }
                            });
                            if (method !== "") {
                                methods.push(method.toUpperCase());
                            }
                        });

                        if (methods.length === 0) {
                            methods.push("GET");
                        }

                        // We found a new assignment of the request, it's used
                        verifiedReferences.push({ reference: x, methods });
                    });

                    if (verifiedReferences.length === 0) {
                        return;
                    }
                    var name = requestName.getText();
                    if (!this.foundRequests.has(name)) {
                        this.foundRequests.set(name, new Map<string, Set<string>>());
                    }

                    var requestMap = this.foundRequests.get(name);

                    verifiedReferences.forEach(x => {
                        var path = x.reference.getSourceFile().getFilePath();

                        if (requestMap !== undefined) {
                            if (!requestMap.has(path)) {
                                requestMap.set(path, new Set<string>());
                            }

                            var methodSet = requestMap.get(path);
                            x.methods.forEach(y => {
                                if (methodSet !== undefined) {
                                    methodSet.add(y);
                                }
                            });
                        }
                    })
                    // const foundRequest = new Request(requestName.getText(), verifiedReferences.length);
                    // foundRequest.paths = verifiedReferences.map(x => { return { path: x.reference.getSourceFile().getFilePath(), verbs: x.methods } as PathWithVerb; });

                    // this.foundRequests.push(foundRequest);
                }
            }
        };
        async.each(this.requestsSourceFiles, func);
    }
    getParentOfKindRecursive(node: Node<ts.Node>, kind: number): Node<ts.Node> | undefined {
        if (node === undefined) {
            return node;
        }

        let parent = node.getParentIfKind(kind);
        if (!parent) {
            parent = this.getParentOfKindRecursive(node.getParent(), kind);
        }
        if (parent instanceof SourceFile) {
            return undefined;
        }
        return parent;
    }

    getOnlyNewAssignmentVariableStatementNode(node: Node<ts.Node>): Node<ts.Node> | undefined {
        const importStatement = this.getParentOfKindRecursive(node, SyntaxKind.ImportSpecifier);
        if (importStatement) {
            return;
        }
        const newExpression = this.getParentOfKindRecursive(node, SyntaxKind.NewExpression);
        const variableStatement = this.getParentOfKindRecursive(node, SyntaxKind.VariableStatement);
        if (!newExpression || !variableStatement) {
            return;
        }

        return variableStatement;
    }
}

const hejsa = new ReferenceScanner();
