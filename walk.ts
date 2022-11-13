import ts from "typescript";

export interface NodeWalker<TState, TUpdate extends Namespaced, TOut> {
  visit(node: ts.Node, ns: string[], tc: ts.TypeChecker): TUpdate | null,
  combine(state: TState, update: TUpdate): TState;
  finalize(state: TState): TOut;
}

export type Namespaced = {
  namespace: string[];
}

export const walk = <TState, TUpdate extends Namespaced, TOut>(
  root: ts.Node,
  walker: NodeWalker<TState, TUpdate, TOut>,
  initial: TState,
  tc: ts.TypeChecker): TOut => {

  let states: TUpdate[] = [];

  const visit = (node: ts.Node, ns: string[]) => {
    switch (node.kind) {
      case ts.SyntaxKind.SourceFile:
      case ts.SyntaxKind.ModuleBlock:
      case ts.SyntaxKind.FirstStatement:
      case ts.SyntaxKind.VariableDeclarationList:
        node.forEachChild(n => visit(n, ns));
        break;
      case ts.SyntaxKind.ModuleDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.EnumDeclaration:
      case ts.SyntaxKind.VariableDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.NamespaceExportDeclaration:
        const state = walker.visit(node, ns, tc);
        if (state !== null) {
          states = [...states, state];
          node.forEachChild(n => visit(n, state.namespace));
        }
    }
  }
  visit(root, []);
  return walker.finalize(states.reduce(walker.combine, initial));
}
