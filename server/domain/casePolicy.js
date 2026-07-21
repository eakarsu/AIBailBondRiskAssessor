const crypto=require('crypto');
const PROTECTED_FIELDS=new Set(['race','ethnicity','religion','gender','sex','nationalOrigin','disability','geneticInformation']);
function fail(c,m,code='INVALID_CASE'){if(c){const e=new Error(m);e.code=code;throw e;}}
function validateCase(input){
  fail(!input||typeof input!=='object','case body required');fail(typeof input.defendantId!=='string'||!input.defendantId.trim(),'defendantId required');fail(typeof input.consentRef!=='string'||input.consentRef.length<8,'documented consent or lawful-basis reference required');fail(typeof input.jurisdiction!=='string'||input.jurisdiction.length<2,'jurisdiction required');fail(typeof input.policyVersion!=='string'||input.policyVersion.length<3,'governing policy version required');
  const facts=input.verifiedFacts||{};fail(Object.keys(facts).some(k=>PROTECTED_FIELDS.has(k)),'protected attributes are not accepted by the decision workflow','PROTECTED_ATTRIBUTE');
  const sources=input.sources||[];fail(!Array.isArray(sources)||sources.length<1,'at least one verified source required');for(const s of sources){fail(!s.system||!s.recordId||!/^[a-f0-9]{64}$/.test(s.digest||'')||!s.observedAt,'source system, record, observation time, and SHA-256 digest required');}
  const payload={defendantId:input.defendantId.trim(),consentRef:input.consentRef,jurisdiction:input.jurisdiction,policyVersion:input.policyVersion,verifiedFacts:facts,sources:sources.map(s=>({system:s.system,recordId:s.recordId,observedAt:s.observedAt,digest:s.digest})).sort((a,b)=>a.system.localeCompare(b.system))};
  return{caseFile:payload,digest:crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),automatedDecision:null,notice:'No eligibility, liberty, pricing, or adverse decision is made automatically.'};
}
function policyChecklist(caseFile,policy){
  fail(!policy||policy.version!==caseFile.policyVersion,'matching policy required');fail(policy.jurisdiction!==caseFile.jurisdiction,'jurisdiction mismatch');const missing=(policy.requiredFacts||[]).filter(k=>caseFile.verifiedFacts[k]===undefined);const stale=caseFile.sources.filter(s=>Date.now()-new Date(s.observedAt).getTime()>Number(policy.maxSourceAgeDays||30)*86400000).map(s=>s.system);
  return{complete:missing.length===0&&stale.length===0,missingFacts:missing,staleSources:stale,policyVersion:policy.version,decision:null,humanReviewRequired:true};
}
function validateHumanDecision(input,context){
  fail(!['admin','case_supervisor','licensed_agent'].includes(context.role),'authorized human decision-maker required','FORBIDDEN');fail(String(context.actorId)===String(context.preparedBy),'preparer cannot make final decision','SEPARATION_OF_DUTIES');fail(!['approve','decline','request_more_information'].includes(input.outcome),'valid human outcome required');fail(typeof input.rationale!=='string'||input.rationale.length<30,'case-specific rationale required');fail(typeof input.policyAttestation!=='string'||input.policyAttestation.length<16,'signed policy attestation required');fail(input.outcome==='decline'&&(typeof input.adverseActionNotice!=='string'||input.adverseActionNotice.length<30),'decline requires adverse-action explanation');return{outcome:input.outcome,rationale:input.rationale,adverseActionNotice:input.adverseActionNotice||null,decidedBy:String(context.actorId),policyAttestation:input.policyAttestation};
}
function validateDispute(input){fail(typeof input.reason!=='string'||input.reason.length<20,'dispute reason required');return{reason:input.reason,evidenceRefs:Array.isArray(input.evidenceRefs)?input.evidenceRefs:[],status:'open'};}
module.exports={PROTECTED_FIELDS,validateCase,policyChecklist,validateHumanDecision,validateDispute};
