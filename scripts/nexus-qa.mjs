import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root=process.cwd();
const checks=[
  ["Auth context","src/lib/actor.ts",["loadSessionContext","NEXUS_OWNER","activeCompanyId"]],
  ["Customers","src/lib/customers.functions.ts",["listCustomers","createCustomer","updateCustomer","deleteCustomer"]],
  ["Contracts","src/lib/contracts.functions.ts",["listContracts","createContract","updateContract","deleteContract"]],
  ["Content","src/lib/content.functions.ts",["listContent","createContent","updateContent","deleteContent"]],
  ["Affiliates","src/lib/affiliates.functions.ts",["listAffiliates","createAffiliate","updateAffiliate","deleteAffiliate"]],
  ["Commissions","src/lib/commissions.functions.ts",["listCommissionPayments","createCommissionPayment","updateCommissionPayment","deleteCommissionPayment"]],
  ["Receivables","src/lib/finance.functions.ts",["listReceivables","createReceivable","updateReceivable","deleteReceivable","listCashTransactions"]],
  ["Payables","src/lib/payables.functions.ts",["listPayables","createPayable","updatePayable","deletePayable"]],
  ["Finance UI","src/routes/_authenticated/estudio/financeiro.tsx",["A receber","A pagar","Novo lançamento"]],
  ["Cash flow UI","src/routes/_authenticated/estudio/fluxo-caixa.tsx",["listCashTransactions","Fluxo de Caixa"]],
  ["Studio dashboard","src/routes/_authenticated/estudio/index.tsx",["getStudioDashboard"]]
];
let failed=0;
console.log("\nNEXUS QA AGENT — static module audit\n");
for(const [name,file,needles] of checks){
  const path=join(root,file);
  if(!existsSync(path)){console.log("❌",name,"— arquivo ausente:",file);failed++;continue;}
  const src=readFileSync(path,"utf8");
  const missing=needles.filter(x=>!src.includes(x));
  if(missing.length){console.log("❌",name,"— faltando:",missing.join(", "));failed++;}
  else console.log("✅",name);
}
const finance=readFileSync(join(root,"src/lib/finance.functions.ts"),"utf8");
const payables=readFileSync(join(root,"src/lib/payables.functions.ts"),"utf8");
const financePage=readFileSync(join(root,"src/routes/_authenticated/estudio/financeiro.tsx"),"utf8");
const invariants=[
  ["Finance tenant isolation",finance.includes('eq("company_id",ctx.activeCompanyId!)')],
  ["Payables tenant isolation",payables.includes('eq("company_id",ctx.activeCompanyId!)')],
  ["Receivable cash sync",finance.includes('referenceType="accounts_receivable"')],
  ["Payable cash sync",payables.includes('referenceType="accounts_payable"')],
  ["Finance delete cleanup",finance.includes('from("cash_transactions").delete()')],
  ["Payable delete cleanup",payables.includes('from("cash_transactions").delete()')],
  ["Finance supplier selector",financePage.includes("listFinanceSuppliers")]
];
for(const [name,ok] of invariants){if(ok)console.log("✅",name);else{console.log("❌",name);failed++;}}
console.log("\nResultado:",failed===0?"PASS":"FAIL","—",failed,"falha(s).");
process.exitCode=failed?1:0;