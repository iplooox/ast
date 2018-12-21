import { Project, SyntaxKind, SourceFile, Node, ts, VariableStatement, Identifier, ClassDeclaration, ImportSpecifier, ImportDeclaration } from "ts-simple-ast";
import * as async from "async";

export class ReferenceScanner {
    private project = new Project();
    private _requestsSourceFiles: SourceFile[] = [];
    public get requestsSourceFiles(): SourceFile[] {
        return this._requestsSourceFiles;
    }
    public set requestsSourceFiles(value: SourceFile[]) {
        if (!Array.isArray(value) || value.length === 0)
            return;

        this._requestsSourceFiles = value;
    }
    private webConfig: SourceFile | undefined = undefined;
    readonly foundRequests: Map<string, Map<string, Set<string>>> = new Map<string, Map<string, Set<string>>>();

    constructor() {
        this.getFiles();
    }

    debug() {
        const directories = this.project.getDirectory("../WebVersion/WorkBook.WebSite/typescript")
        const files = directories!.getDescendantSourceFiles()
        const requestReferences = new Map<string, string[]>(); //Path / RequestName
        const usedRequests = new Map<string, Node<ts.Node>[]>()

        files.forEach(file => {
            if (file.isDeclarationFile() || file.isFromExternalLibrary() || file.isInNodeModules())
                return;

            console.log(file.getBaseName());
            file.forEachDescendant((x, t) => {
                switch (x.getKind()) {
                    case SyntaxKind.ImportDeclaration:
                        if (x instanceof ImportDeclaration) {
                            const sourcefile = x.getModuleSpecifierSourceFile();

                            if (sourcefile !== undefined && sourcefile.getDirectory().getBaseName() == "requests") {
                                const namedImports = x.getImportClauseOrThrow().getChildrenOfKind(SyntaxKind.NamedImports);
                                if (namedImports.length == 0)
                                    return;

                                const requestsNames: string[] = [];

                                namedImports.forEach(importo => {
                                    const requestNameNodes = importo.getChildrenOfKind(SyntaxKind.SyntaxList)
                                    if (requestNameNodes.length === 0)
                                        return;

                                    namedImports.forEach(x => x.getChildren().forEach(y => {
                                        const getImportSpecifiers = y.getChildrenOfKind(SyntaxKind.ImportSpecifier)

                                        getImportSpecifiers.forEach(x => requestsNames.push(x.getText()))
                                    }))

                                    // requestNameNodes.forEach(x => {
                                    //     requestsNames.push(x.getText());
                                    // });
                                });

                                if (requestsNames.length === 0)
                                    return;

                                console.log(requestsNames);

                            }
                        }

                        console.log("hej");


                        break;
                    case SyntaxKind.NewExpression:
                        let requestIdentifier = x.getFirstChildByKind(SyntaxKind.Identifier);
                        if (requestIdentifier === undefined)
                            return;

                        const requestName = requestIdentifier.getText();
                        usedRequests.has(requestName) ? usedRequests.get(requestName)!.push(x) : usedRequests.set(requestName, [x])

                        break;
                    default:
                }
            })



            console.log(file.getTypeReferenceDirectives().length)
        });

        console.log(usedRequests.keys());

        console.log("hej")
    }

    scan(): void {
        this.scanNameSpace();

        const now = new Date();

        this.foundRequests.forEach((value, key) => {
            // if (!Array.from(value.values()).some(x => Array.from(x).length > 1)) {
            //     return;
            // }
            // if (Array.from(value.values()).length < 2) {
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

        this.webConfig = this.project.addExistingSourceFile("../WebVersion/WorkBook.WebSite/web.config");

        console.log(`Found ${this.project.getSourceFiles().length} source files.`);
        console.log(`Found ${this.requestsSourceFiles.length} source files in request directory`);
    }

    scanNameSpace() {
        async.each(this.requestsSourceFiles, this.scanClasses);
    }

    scanClasses = (sourceFile: SourceFile) => {
        console.log(`Starting scanning ${sourceFile.getBaseName()}`);
        const requestClassList = sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration);

        const referenceMap = this.findReferencesOfClasses(requestClassList);

        for (const requestReferences of referenceMap) {

            const requestClass = requestReferences[0];
            const requestName = requestReferences[0].getName();
            const references = requestReferences[1];

            if (references.length !== 0)
                return;

            let verifiedReferences: { reference: Node<ts.Node>, methods: string[] }[] = [];

            references.forEach(x => {
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

                if (methods.length === 0)
                    this.findFirstVerb(methods, requestClass, requestName);

                // We found a new assignment of the request, it's used
                verifiedReferences.push({ reference: x, methods });
            });

            if (verifiedReferences.length === 0)
                return;

            if (!this.foundRequests.has(requestName || ""))
                this.foundRequests.set(name, new Map<string, Set<string>>());

            var requestMap = this.foundRequests.get(name);

            verifiedReferences.forEach(x => {
                if (this.webConfig === undefined)
                    return;

                var path = this.webConfig.getRelativePathTo(x.reference.getSourceFile());

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
            });
        }
    };

    private findFirstVerb(methods: string[], requestClass: ClassDeclaration, requestName: string | undefined) {
        var defaultMethod = "GET";
        requestClass.getProperties();
        requestClass.getMembers().forEach(m => {
            var foundVerbs = false;
            m.forEachDescendant((d, t) => {
                switch (d.getKind()) {
                    case SyntaxKind.Identifier:
                        if (d.getText() === "verbs") {
                            foundVerbs = true;
                        }
                        else if (foundVerbs) {
                            var foundMethod = d.getText();
                            if (foundMethod === undefined) {
                                throw new Error("WHERE IS THE VERB!?! " + requestName);
                            }
                            defaultMethod = foundMethod.toUpperCase();
                            t.stop();
                        }
                        else {
                            t.up();
                        }
                        break;
                    default:
                        break;
                }
            });
        });
        methods.push(defaultMethod);
    }

    findReferencesOfClasses(requestClassList: ClassDeclaration[]): Map<ClassDeclaration, Node<ts.Node>[]> {
        let references = new Map<ClassDeclaration, Node<ts.Node>[]>();

        var t = process.hrtime();

        for (const requestClass of requestClassList)
            references.set(requestClass, requestClass.findReferencesAsNodes());

        t = process.hrtime(t);

        console.log('Finding references for %d took %d seconds and %d nanoseconds', requestClassList.length, t[0], t[1]);

        return references;
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

//hejsa.scan();
hejsa.debug();