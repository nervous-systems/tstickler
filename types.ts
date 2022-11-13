export type MemberType = "method" | "property" | "constructor" | "constructor-sig" | "index-sig" | "call-sig" | "generic";

export type AnonymousMember = {
  type?: Type,
  question: boolean,
  modifiers: string[]
}

export type IndexSig = AnonymousMember & {
  member: Extract<MemberType, "index-sig">
}

export type NamedMember = AnonymousMember & {
  name: string,
  member: Exclude<MemberType, "constructor" | "constructor-sig" | "index-sig">
}

export type CallableMember = AnonymousMember & {
  name?: string,
  params: Param[],
  typeParams?: string[],
  member: Exclude<MemberType, "property" | "index-sig">
}

export type Member = CallableMember | NamedMember | IndexSig;

export type Modifier = "static"
  | "public"
  | "private"
  | "protected"
  | "readonly"
  | "export"
  | "default"
  | "const"
  | "async"
  | "declare";

export type Param = {
  name: string,
  question: boolean,
  modifiers?: Modifier[],
  type: Type
}

type Callable = {
  name?: string,
  parameters: Param[],
  modifiers?: Modifier[],
  typeParams?: string[],
  type: Type,
  kind: "callable";
}

type Floor = string;

type Compound = {
  members: Type[],
  kind: "union" | "intersection"
}

type Array = {
  members: Type,
  kind: "array"
}

type Literal = {
  members: Member[],
  kind: "literal"
}

export type Type = Callable | Floor | Compound | Array | Literal;
