import { Project, SyntaxKind, SourceFile, Node, ts, VariableStatement, Identifier } from "ts-simple-ast";
import * as async from "async";

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
    readonly foundRequests: Request[] = [];
    constructor() {
        this.getFiles();
        var now = new Date();
        this.scanNameSpace();

        this.foundRequests.forEach(x => {
            console.log(`Request: ${x.name} Used:${x.references} Paths: ${x.paths.map(x => { return `\n${x.path}`; })}\nVerbs:${x.paths.map(y => y.verbs)}`);
        });

        console.log(`Found: ${this.foundRequests.length} used requests`);
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

                    if (requestName.getText() === "standardRequest") {
                        return;
                    }

                    if (requestName.getText() === "EmployeeWhereAboutsRequest") {
                        var a = 2;
                    }

                    const methods: string[] = [];

                    async.each(references, x => {
                        // Only want the new expressions
                        const newexp = this.getParentOfKindRecursive(x, SyntaxKind.NewExpression);
                        if (newexp === undefined) {
                            return;
                        }
                        // Only want the variable statements
                        const hej = this.getParentOfKindRecursive(x, SyntaxKind.VariableStatement);
                        if (hej === undefined) {
                            return;
                        }

                        const hej2 = hej.getNextSiblings();
                        async.each(hej2, y => {
                            let overridden = false;
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
                                    if (lastLeftText !== "method" && lastLeftText !== "overrideMethodWith") {
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
                                    if (overridden) {
                                        return;
                                    }
                                    overridden = overridden || lastLeftText === "overrideMethodWith";
                                    method = lastRight.getText();
                                }
                            });
                            if (method !== "") {
                                methods.push(method.toUpperCase());
                            }
                        });
                    });

                    if (methods.length === 0) {
                        methods.push("GET");
                    }
                    const foundRequest = new Request(requestName.getText(), references.length);
                    foundRequest.paths = references.map(x => { return { path: x.getSourceFile().getFilePath(), verbs: methods } as PathWithVerb; });

                    this.foundRequests.push(foundRequest);
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
}

const hejsa = new ReferenceScanner();
