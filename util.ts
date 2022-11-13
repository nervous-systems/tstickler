
import ts, { isHeritageClause, isTypeNode, TypeChecker } from "typescript";
import {Modifier, Param, Type, Member} from "./types";
  
const toStringModifier = (m: ts.ModifierLike): Modifier => {
    switch(m.kind) {
      case ts.SyntaxKind.StaticKeyword:    return "static";
      case ts.SyntaxKind.PublicKeyword:    return "public";
      case ts.SyntaxKind.PrivateKeyword:   return "private";
      case ts.SyntaxKind.ProtectedKeyword: return "protected";
      case ts.SyntaxKind.ReadonlyKeyword:  return "readonly";
      case ts.SyntaxKind.ExportKeyword:    return "export";
      case ts.SyntaxKind.DefaultKeyword:   return "default";
      case ts.SyntaxKind.ConstKeyword:     return "const";
      case ts.SyntaxKind.AsyncKeyword:     return "async";
      case ts.SyntaxKind.DeclareKeyword:   return "declare";
      default:
        throw new Error(`I don't know about ${ts.SyntaxKind[m.kind]}`);
    }
}

const getNodeType = (node: ts.TypeNode) => node.getText();

export const modifiers = (n: ts.Node) =>
  (ts.canHaveModifiers(n) && (ts.getModifiers(n)?.map(toStringModifier)) || []);

export const params = (n: ts.FunctionDeclaration      |
                          ts.ConstructorDeclaration   |
                          ts.MethodDeclaration        |
                          ts.CallSignatureDeclaration |
                          ts.MethodSignature): Param[] =>
  n.parameters
    .filter(({name}) => ts.isIdentifier(name))
    .map(({name, type, questionToken, ...v}) => (
      {name:      name.getText(),
       type:      describeType(type!),
       question:  !!questionToken,
       modifiers: modifiers(v)}));

const describeType = (type: ts.TypeNode): Type => {
  if(ts.isFunctionTypeNode(type) || ts.isConstructorTypeNode(type))
    return {name:       type.name?.getText(),
            parameters: type.parameters.map(
              t => ({name:      t.name.getText(),
                     question:  !!t.questionToken,
                     modifiers: modifiers(t),
                     type:      describeType(t.type!)})),
            type:       describeType(type.type),
            kind:       "callable"};
    
  if(ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type))
    return {members: type.types.map(describeType),
            kind:    (ts.isUnionTypeNode(type) ?
                        "union" : "intersection")};

  if(ts.isArrayTypeNode(type))
    return {members: describeType(type.elementType),
            kind:    "array"};
  
  if(ts.isTypeLiteralNode(type))
    return {members: type.members.map(describeMember),
            kind:    "literal"};

  return getNodeType(type);
}

function isNodeArray<T extends ts.Node>(node?: any): node is ts.NodeArray<T> {
    return (node as ts.NodeArray<T>).hasTrailingComma !== undefined;
} 
export function describe<T extends ts.HeritageClause>(node: ts.NodeArray<T>, tc:  TypeChecker): string[][]; 
export function describe<T extends ts.HeritageClause>(node: T,               tc:  TypeChecker): string[];
export function describe<T extends ts.TypeNode>      (node: ts.NodeArray<T>, tc?: TypeChecker): Type[]; 
export function describe<T extends ts.TypeNode>      (node: T,               tc?: TypeChecker): Type;
export function describe<T extends ts.Node>          (node: ts.NodeArray<T>, tc?: TypeChecker): Member[];
export function describe<T extends ts.Node>          (node: T,               tc?: TypeChecker): Member;
export function describe(node: any, tc?: TypeChecker): unknown { 
    if(isHeritageClause(node))
        return describeHeritageClause(node, tc!);    
    if(isTypeNode(node))
        return describeType(node);    
    if(isNodeArray(node))
        return node.map(x => describe(x, tc));
    return describeMember(node);
}

const describeMember = (node: ts.Node): Member => {
  if(ts.isPropertyDeclaration      (node)  ||
     ts.isPropertySignature        (node)  ||
     ts.isConstructorDeclaration   (node)  ||
     ts.isMethodDeclaration        (node)  ||
     ts.isCallSignatureDeclaration (node)  ||
     ts.isIndexSignatureDeclaration(node)  ||
     ts.isMethodSignature          (node)  ||
     ts.isConstructorDeclaration   (node)) {
        
    const m = {type:      node.type && describeType(node.type!),
               question:  !!node.questionToken,
               modifiers: modifiers(node)};
    if(ts.isIndexSignatureDeclaration(node))
      return {...m, member: "index-sig"};
    if(ts.isPropertyDeclaration(node) || ts.isPropertySignature(node))
       return {...m, 
               name:    node.name.getText(),
               member: "property"};

    return {...m,
            name:       node.name?.getText(),
            params:     params(node),
            member:     (ts.isCallSignatureDeclaration(node) ?
                         "call-sig" :
                          (ts.isConstructorDeclaration(node) ?
                          "constructor" :
                          (ts.isMethodDeclaration(node) ?
                          "method" : "generic")))
            };
  }
  throw new Error(`Don't know how to handle the given member ${ts.SyntaxKind[node.kind]}`);
}

const describeHeritageClause = (c: ts.HeritageClause, tc: ts.TypeChecker) => (
  c.types
  .map(
    e => {
      const t = tc.getTypeFromTypeNode(e);
      return tc.getFullyQualifiedName(t.symbol).split('.');
    }));

    