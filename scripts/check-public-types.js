#!/usr/bin/env node
/**
 * Contract check (doc 42 §5.1.2): no `any` or `unknown` in the public type
 * surface. Walks every export of the built entry points (dist/index.d.ts,
 * dist/web.d.ts, dist/bundler/index.d.ts) with the TypeScript checker and
 * reports each place a public type resolves to `any` or `unknown`.
 *
 * Types declared outside this package (lib.d.ts, zod, openapi-fetch) are
 * opaque: their own members are not walked, only their type arguments. The
 * `schemas` namespace (runtime Zod validators) is skipped.
 */
import ts from 'typescript'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRIES = ['dist/index.d.ts', 'dist/web.d.ts', 'dist/bundler/index.d.ts'].map((p) => join(ROOT, p))
const SKIP_EXPORTS = new Set(['schemas'])
const MAX_DEPTH = 12

export function checkPublicTypes() {
  const program = ts.createProgram(ENTRIES, {strict: true, noEmit: true, skipLibCheck: true, module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16})
  const checker = program.getTypeChecker()
  const problems = []
  const seen = new Set()

  const isOurs = (decl) => {
    const file = decl.getSourceFile().fileName
    return file.startsWith(join(ROOT, 'dist')) && !file.includes('node_modules') && !file.startsWith(join(ROOT, 'dist/generated'))
  }

  const walk = (type, path, depth) => {
    if (depth > MAX_DEPTH) return
    if (type.flags & ts.TypeFlags.Any) {
      problems.push(`${path}: any`)
      return
    }
    if (type.flags & ts.TypeFlags.Unknown) {
      problems.push(`${path}: unknown`)
      return
    }
    const id = type.id
    if (seen.has(`${id}`)) return
    seen.add(`${id}`)
    if (type.isUnionOrIntersection()) {
      type.types.forEach((t) => walk(t, path, depth + 1))
      return
    }
    if (!(type.flags & ts.TypeFlags.Object)) return
    const symbol = type.aliasSymbol ?? type.getSymbol()
    const decls = symbol?.getDeclarations() ?? []
    const ours = decls.length === 0 || decls.some(isOurs)
    const args = [...(type.aliasTypeArguments ?? []), ...(type.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(type) : [])]
    args.forEach((a, i) => walk(a, `${path}<${i}>`, depth + 1))
    if (!ours) return
    for (const sig of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
      for (const param of sig.getParameters()) {
        const decl = param.valueDeclaration
        if (decl) walk(checker.getTypeOfSymbolAtLocation(param, decl), `${path}(${param.name})`, depth + 1)
      }
      walk(sig.getReturnType(), `${path}()`, depth + 1)
    }
    for (const prop of type.getProperties()) {
      const decls = prop.getDeclarations() ?? []
      if (decls.length > 0 && !decls.some(isOurs)) continue
      if (prop.name.startsWith('#') || prop.name.startsWith('__') || prop.name === 'prototype') continue
      const decl = prop.valueDeclaration ?? decls[0]
      if (decl && ts.getCombinedModifierFlags(decl) & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue
      const propType = decl ? checker.getTypeOfSymbolAtLocation(prop, decl) : checker.getTypeOfPropertyOfType(type, prop.name)
      if (propType) walk(propType, `${path}.${prop.name}`, depth + 1)
    }
    const index = checker.getIndexInfosOfType(type)
    index.forEach((info) => walk(info.type, `${path}[key]`, depth + 1))
  }

  for (const entry of ENTRIES) {
    const source = program.getSourceFile(entry)
    if (!source) throw new Error(`missing ${entry}; run npm run build first`)
    const moduleSymbol = checker.getSymbolAtLocation(source)
    for (const exp of checker.getExportsOfModule(moduleSymbol)) {
      if (SKIP_EXPORTS.has(exp.name)) continue
      const sym = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp
      const decl = sym.valueDeclaration ?? sym.getDeclarations()?.[0]
      if (!decl) continue
      const label = `${entry.slice(ROOT.length + 1)}:${exp.name}`
      if (sym.flags & ts.SymbolFlags.Class) {
        walk(checker.getTypeOfSymbolAtLocation(sym, decl), label, 0)
        walk(checker.getDeclaredTypeOfSymbol(sym), `${label}#instance`, 0)
      } else if (sym.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) {
        walk(checker.getDeclaredTypeOfSymbol(sym), label, 0)
      } else {
        walk(checker.getTypeOfSymbolAtLocation(sym, decl), label, 0)
      }
    }
  }
  return [...new Set(problems)]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkPublicTypes()
  if (problems.length > 0) {
    console.error(`Public types expose any/unknown in ${problems.length} place(s):\n  ${problems.join('\n  ')}`)
    process.exit(1)
  }
  console.log('Public types: no any/unknown')
}
