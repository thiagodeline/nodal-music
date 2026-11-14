/* Testes sem acesso a credenciais nem banco de produção. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const src=fs.readFileSync('src/lib/onboarding-route.ts','utf8')
const js=ts.transpileModule(src,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,strict:true},
  reportDiagnostics:true,
})
if(js.diagnostics?.length) throw new Error(js.diagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('\n'))
const sandboxModule={exports:{}}
vm.runInNewContext(js.outputText,{module:sandboxModule,exports:sandboxModule.exports}, {filename:'onboarding-route.js'})
const {onboardingRedirect: next}=sandboxModule.exports
if(typeof next!=='function')throw new Error('Helper não exportado')

const cases=[
  ['Sem perfil, na área privada', '/dashboard', null,false,'/onboarding'],
  ['Sem perfil, na tela de cadastro', '/onboarding', null,false,null],
  ['Conta nova, na área privada', '/dashboard', {status:'PENDING_ONBOARDING',onboarding_completed:false},false,'/onboarding'],
  ['Conta nova, tentar abrir contrato', '/onboarding/contract',{status:'PENDING_ONBOARDING',onboarding_completed:false},false,'/onboarding'],
  ['Conta nova, preencher dados', '/onboarding',{status:'PENDING_ONBOARDING',onboarding_completed:false},false,null],
  ['Contrato não assinado: fechar cadastro', '/onboarding',{status:'PENDING_CONTRACT',onboarding_completed:true},false,'/onboarding/contract'],
  ['Contrato não assinado: acesso direto ao Dashboard', '/dashboard',{status:'PENDING_CONTRACT',onboarding_completed:true},false,'/onboarding/contract'],
  ['Contrato não assinado: login para /dashboard', '/dashboard/analytics',{status:'PENDING_CONTRACT',onboarding_completed:true},false,'/onboarding/contract'],
  ['Contrato não assinado: impedir admin', '/admin',{status:'PENDING_CONTRACT',onboarding_completed:true},false,'/onboarding/contract'],
  ['Contrato não assinado: liberar contrato', '/onboarding/contract',{status:'PENDING_CONTRACT',onboarding_completed:true},false,null],
  ['Aceite registrado, PDF pendente: exigir contrato', '/dashboard',{status:'PENDING_CONTRACT',onboarding_completed:true},false,'/onboarding/contract'],
  ['PDF pronto: permitir dashboard', '/dashboard',{status:'PENDING_CONTRACT',onboarding_completed:true},true,null],
  ['PDF pronto: permitir baixar pelo contrato', '/onboarding/contract',{status:'PENDING_CONTRACT',onboarding_completed:true},true,null],
  ['PDF pronto: impedir formulário duplicado', '/onboarding',{status:'PENDING_CONTRACT',onboarding_completed:true},true,'/dashboard'],
  ['Conta aprovada: dashboard', '/dashboard',{status:'ACTIVE',onboarding_completed:true},true,null],
  ['Conta aprovada: formulario para dashboard', '/onboarding',{status:'ACTIVE',onboarding_completed:true},true,'/dashboard'],
  ['Conta aprovada: ver contrato anterior', '/onboarding/contract',{status:'ACTIVE',onboarding_completed:true},true,null],
  ['Conta bloqueada: não reabrir formulário', '/onboarding',{status:'BLOCKED',onboarding_completed:true},false,'/dashboard'],
  ['Conta antiga sem flag: não bloquear indevidamente', '/dashboard',{status:'ACTIVE',onboarding_completed:null},false,null],
]
for (const [title,path,profile,ready,want] of cases){
  const got=next(path,profile,ready)
  assert.equal(got,want,`${title}: esperado ${want}, obtido ${got}`)
  console.log('PASSOU',title)
}
console.log('TOTAL',cases.length,'cenários de onboarding aprovados.')
