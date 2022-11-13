import ts from "typescript";

import { describe, params } from "./util";
import { Member, Type, Param } from "./types";
import { Namespaced, NodeWalker, walk } from "./walk";

type Kind = "export" | "module" | "enum" | "class" | "interface" | "alias" | "module" | "variable" | "function";

type Export = {
  exported: true,
  export: string[],
  kind: Extract<Kind, "export">
}

type Named = { name: string, kind: Exclude<Kind, "export"> };

type Generic = Named & { kind: Extract<Kind, "alias" | "module"> };

type EnumDecl = Named & {
  members: Member[],
  kind: Extract<Kind, "enum">
}

type Var = Named & {
  type?: Type,
  kind: Extract<Kind, "variable">
}

type ClassLike = Named & {
  members: Member[],
  heritage?: string[][],
  kind: Extract<Kind, "class" | "interface">
}

type Fn = {
  name?: string,
  question: boolean,
  params: Param[],
  type: Type,
  kind: Extract<Kind, "function">;
}

type Decl = Export | EnumDecl | Var | ClassLike | Fn | Generic;

type KnownDeclaration = ts.FunctionDeclaration
  | ts.EnumDeclaration
  | ts.ClassDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.ModuleDeclaration
  | ts.VariableDeclaration
  | ts.NamespaceExportDeclaration;

function decl(node: KnownDeclaration, tc: ts.TypeChecker): Decl {
  if (ts.isNamespaceExportDeclaration(node))
    return {
      exported: true,
      export: node.name.text.split('.'),
      kind: "export"
    };

  if (ts.isModuleDeclaration(node))
    return {
      name: node.name.text,
      kind: "module"
    };

  if (ts.isEnumDeclaration(node))
    return {
      name: node.name.text,
      members: describe(node.members),
      kind: "enum"
    };

  if (ts.isVariableDeclaration(node))
    return {
      name: node.name.getText(),
      type: node.type && describe(node.type),
      kind: "variable"
    };

  if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node))
    return {
      name: node.name!.text,
      heritage: node.heritageClauses && describe(node.heritageClauses, tc),
      members: ts.isClassDeclaration(node) ?
        describe(node.members) :
        describe(node.members),
      kind: node.kind === ts.SyntaxKind.ClassDeclaration ? "class" : "interface"
    };

  if (ts.isFunctionDeclaration(node))
    return {
      name: node.name?.text,
      question: !!node.questionToken,
      params: params(node),
      type: describe(node.type!),
      kind: "function"
    };

  return {
    name: node.name.text,
    kind: "alias"
  };
}

type Decls = Record<string, NSDecl[]>;
type NSDecl = Decl & Namespaced;

const walker: NodeWalker<NSDecl[], NSDecl, Decls> = {
  visit(node: any, ns: string[], tc: ts.TypeChecker): NSDecl | null {
    return {
      namespace: (ts.isModuleDeclaration(node) ?
        [...ns, node.name.text] : ns), ...decl(node, tc)
    };
  },

  combine(decls: NSDecl[], update: NSDecl): NSDecl[] {
    return [...decls, update];
  },

  finalize(decls: NSDecl[]): Decls {
    return decls.reduce(
      (acc, d) => {
        const ns = d.namespace.join('.') || '__toplevel__';
        return { ...acc, [ns]: [...(acc[ns] || []), d] };
      }, {} as Decls)
  }
}

const main = (inf: string) => {
  const p = ts.createProgram([inf], { target: ts.ScriptTarget.Latest });
  const f = p.getSourceFile(inf)!;
  const tc = p.getTypeChecker();

  console.log(JSON.stringify(walk(f, walker, [], tc)));
}

main("/Users/m/p/jones/cljs/node_modules/llvm-bindings/example.d.ts");
