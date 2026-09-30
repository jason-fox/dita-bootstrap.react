// [type, props?, ...children] - props is present only when item[1] is a plain object
export type AstNode = string | AstArray;
export type AstArray = [string, ...unknown[]];
