import ts from "typescript";

export interface NodeWalker<TState, TUpdate extends Namespaced, TOut> {
    visit   (node:   any, ns: string[], tc: ts.TypeChecker): TUpdate | null,
    combine (state: TState, update: TUpdate):                TState;
    finalize(state: TState):                                 TOut;
  }

export type Namespaced = {
    namespace: string[];
}
  
export const walk = <TState, TUpdate extends Namespaced, TOut>(
    node:    ts.Node,
    walker:  NodeWalker<TState, TUpdate, TOut>,
    tst:     TState,
    tc:      ts.TypeChecker): TOut => {
  
    let states: TUpdate[] = [];
  
    const visit = (root: ts.Node = node, ns: string[]) => {
      switch(root.kind) {
        case ts.SyntaxKind.SourceFile:
        case ts.SyntaxKind.ModuleBlock:
        case ts.SyntaxKind.FirstStatement:
        case ts.SyntaxKind.VariableDeclarationList:
          root.forEachChild(node => visit(node, ns));
          break;
        case ts.SyntaxKind.ModuleDeclaration:
        case ts.SyntaxKind.ClassDeclaration:
        case ts.SyntaxKind.InterfaceDeclaration:
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.EnumDeclaration:
        case ts.SyntaxKind.VariableDeclaration:
        case ts.SyntaxKind.TypeAliasDeclaration:
        case ts.SyntaxKind.NamespaceExportDeclaration:
          const state = walker.visit(root, ns, tc);
          if(state !== null) {
            states = [...states, state];
            root.forEachChild(n => visit(n, state.namespace));
          }
      }
    }
    visit(node, []);
    return walker.finalize(states.reduce(walker.combine, tst));
}
    