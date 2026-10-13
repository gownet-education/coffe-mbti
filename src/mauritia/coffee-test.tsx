import { useEffect,useRef,useState } from "react";
import { Check,Coffee,RotateCcw,Sparkles,ChevronLeft,Store } from "lucide-react";
import { RadioGroup,RadioGroupItem } from "../shared/ui/radio-group";
import { Progress } from "../shared/ui/progress";
import FullscreenControl from "../shared/fullscreen-control";
import AxisResults from "./axis-results";
import { axes,questions,scoreAnswers,canAdvanceQuestion,canSkipQuestion,quizVersion,type Answer } from "./quiz";
import { sendRecord,saveActive,recoverPending,type SurveyRecord } from "../shared/survey";
import { useIdle,IdleWarning } from "../shared/idle";
import { isKiosk,channel,source } from "../shared/mode";
import { ShareActions,ResultQr,shareUrl } from "../shared/share";
import { QUIZ_IDLE_SECONDS,RESULT_IDLE_SECONDS,IDLE_WARNING_SECONDS } from "../shared/config";
type Screen="home"|"quiz"|"brewing"|"result";
const cardHeights:Record<string,number>={BNSE:5515,MFPR:5547,MFSE:5638};
export default function CoffeeTest(){
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 const [screen,setScreen]=useState<Screen>("home"),[answers,setAnswers]=useState<(Answer|undefined)[]>(Array(10).fill(undefined)),[index,setIndex]=useState(0),[id,setId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState(false),[designPreview,setDesignPreview]=useState(false);
 const startedAt=useRef("");
 // 매장 태블릿은 무조작 초기화와 QR, 온라인은 공유 버튼을 씁니다.
 const [kiosk]=useState(isKiosk);
 const lock=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 const normalized=answers.map(a=>a??null),result=scoreAnswers(normalized),q=questions[index],processed=answers.filter(a=>a!==undefined).length;
 const axis=axes.find(a=>a.id===q.axis)!,groupQuestions=questions.filter(item=>item.axis===q.axis),groupAnswered=questions.filter((item,i)=>item.axis===q.axis&&(answers[i]==="A"||answers[i]==="B")).length,skipAllowed=canSkipQuestion(answers,index);
 function record(status:SurveyRecord["status"],reason:string,list:(Answer|undefined)[]=answers):SurveyRecord{
  const outcome=scoreAnswers(list.map(a=>a??null));
  return {id,brand:"모리티아",status,reason,startedAt:startedAt.current,endedAt:new Date().toISOString(),lastQuestion:status==="완료"?10:index+1,answered:outcome.answered,code:status==="완료"?outcome.code??"":"",typeName:status==="완료"?outcome.type?.name??"":"",answers:list.map(a=>a===undefined?"":a===null?"건너뜀":a),version:quizVersion,channel:channel(),source:source()};
 }
 // Leaving a test before the result is recorded as unfinished, with the question it stopped at.
 function reset(why:unknown="처음으로"){if(screen==="quiz"&&id)void sendRecord(record("미완료",typeof why==="string"?why:"처음으로"));saveActive(null);if(designPreview){window.history.replaceState(null,"",window.location.pathname);setDesignPreview(false);}setScreen("home");setAnswers(Array(10).fill(undefined));setIndex(0);setId("");setError("");setSaved(false);}
 useEffect(()=>{if(new URLSearchParams(window.location.search).get("preview")!=="BFPE")return;setAnswers(["A","A","A","A","A","A","A","A","A","A"]);setDesignPreview(true);setScreen("result");},[]);
 useEffect(()=>{if(screen==="quiz"||screen==="result")heading.current?.focus();window.scrollTo({top:0,behavior:"instant"});},[screen,index]);
 const idleLeft=useIdle(!kiosk?0:screen==="quiz"?QUIZ_IDLE_SECONDS:screen==="result"&&!busy?RESULT_IDLE_SECONDS:0,IDLE_WARNING_SECONDS,()=>reset("시간 초과"),screen+index);
 useEffect(()=>{recoverPending();},[]);
 useEffect(()=>{if(screen==="quiz"&&id)saveActive(record("미완료","페이지 이탈"));},[screen,id,answers,index]);
 function start(){
  if(lock.current)return;
  startedAt.current=new Date().toISOString();setId(crypto.randomUUID());setAnswers(Array(10).fill(undefined));setIndex(0);setSaved(false);setError("");setScreen("quiz");
 }
 async function finish(next:(Answer|undefined)[],reveal=true){
  if(lock.current)return;
  const submitted=next.map(a=>a??null),outcome=scoreAnswers(submitted);
  if(outcome.missing.length){const missingAxis=outcome.missing[0];setAnswers(next);setIndex(questions.findLastIndex(item=>item.axis===missingAxis));setScreen("quiz");return;}
  lock.current=true;setBusy(true);setError("");setSaved(false);setAnswers(next);
  if(reveal)setScreen("brewing");saveActive(null);
  const delay=new Promise(r=>setTimeout(r,reveal?1300:0));
  try{if(!await sendRecord(record("완료","완료",next)))throw new Error("저장하지 못했어요. 연결되면 자동으로 다시 보냅니다.");setSaved(true);}
  catch(e){setError(e instanceof Error?e.message:"저장에 실패했어요. 다시 시도해 주세요.");}
  finally{await delay;setScreen("result");setBusy(false);lock.current=false;}
 }
 function advance(skip=false){if(lock.current)return;const next=[...answers];if(skip){if(!canSkipQuestion(answers,index))return;next[index]=null;}if(!canAdvanceQuestion(next,index))return;setAnswers(next);if(index===9)void finish(next);else setIndex(index+1);}
 function select(value:string){if(value!=="A"&&value!=="B")return;setAnswers(prev=>prev.map((v,i)=>i===index?value:v));}
 useEffect(()=>{
  const ctx=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>void}}).modelContext;if(!ctx?.registerTool)return;
  const lifecycle=new AbortController();
  try{ctx.registerTool({name:"read_coffee_test",title:"커피 테스트 상태 보기",description:"현재 문항과 선택 상태 또는 결과를 읽습니다. 응답을 변경하거나 제출하지 않습니다.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=="object"||Object.keys(input).length)throw new Error("No arguments allowed");return {screen,question:screen==="quiz"?q:null,answers,result:screen==="result"?result:null};}},{signal:lifecycle.signal});}catch{ /* Optional browser capability. */ }
  return()=>lifecycle.abort();
 },[screen,index,answers]);
 const restart=<button className="text-button" onClick={reset}><RotateCcw size={15}/>처음으로</button>;
 return <div className="site-shell"><header className="site-header"><a href="./" className="wordmark" aria-label="모리티아 처음으로" onClick={event=>{event.preventDefault();if(!lock.current)reset();}}><span className="brand-logo" role="img" aria-label="모리티아"/></a>{screen==="home"?<span className="header-label">COFFEE DNA</span>:screen!=="brewing"?restart:<span className="header-label">취향을 찾는 중</span>}</header>
 {screen==="home"?<main className="welcome"><div className="welcome-intro"><p className="test-label">모리티아 커피 취향 테스트</p><h1>내 취향의 커피,<br/>어떤 맛일까?</h1><div className="brand-friends" aria-label="모리티아의 아리, 모리, 해리 캐릭터"><span className="brand-character ari" role="img" aria-label="바리스타 아리"/><span className="brand-character mori" role="img" aria-label="셰프 모리"/><span className="brand-character harry" role="img" aria-label="매니저 해리"/></div></div><div className="welcome-action"><p className="welcome-description">10개의 질문으로 나의 취향을 알아보고<br/>모리티아의 추천 메뉴를 만나보세요.</p><div className="welcome-start"><button className="primary start-button" onClick={start} disabled={busy||!ready}>시작하기</button><span>10문항 · 약 2분</span></div><p className="small-note">모르는 문항은 건너뛸 수 있어요.</p><p className="privacy-note">이름과 연락처는 받지 않아요. 응답은 매장 취향 통계에 저장됩니다.</p>{error?<p role="alert" className="error-box">{error}</p>:null}</div></main>:null}
 {screen==="quiz"?<main className="quiz-main"><div className="quiz-top"><span>커피 취향 찾기</span><span><b>{String(index+1).padStart(2,"0")}</b> / 10</span></div><Progress value={processed*10} aria-label={"10문항 중 "+processed+"문항 선택 또는 건너뜀"} className="quiz-progress"/><div className="progress-detail"><span>{processed}문항 진행</span><span>{10-processed}문항 남았어요</span></div><div className="question-block" key={q.id}><span className="question-kicker">질문 {String(q.id).padStart(2,"0")} · {axis.label} {groupQuestions.findIndex(item=>item.id===q.id)+1}/{groupQuestions.length}</span><h1 ref={heading} tabIndex={-1}>{q.title}</h1><p id="question-help" className={"question-help"+(!skipAllowed?" answer-required":"")}>{skipAllowed?"지금의 나와 더 가까운 쪽을 골라주세요.":"건너뛰면 이 취향의 결과를 정할 수 없어요. 한쪽을 골라주세요."}</p><RadioGroup value={answers[index]??""} onValueChange={select} aria-label={q.title} aria-describedby="question-help" className="answer-options">{(["A","B"] as const).map(letter=><label key={letter} className={"answer-card "+(answers[index]===letter?"selected":"")} htmlFor={"answer-"+letter}><span className="answer-letter">{letter}</span><span className="answer-text">{letter==="A"?q.a:q.b}</span><RadioGroupItem id={"answer-"+letter} value={letter} className="answer-radio"/>{answers[index]===letter?<span className="chosen-label" aria-hidden="true"><Check size={15}/>선택</span>:null}</label>)}</RadioGroup><div className="question-controls"><button className="text-button back-button" onClick={()=>setIndex(i=>Math.max(0,i-1))} disabled={index===0}><ChevronLeft size={18}/>이전</button><button className="primary next-button" disabled={!canAdvanceQuestion(answers,index)} onClick={()=>advance()}>{index===9?"내 결과 보기":"다음 문항"}</button></div><button className="skip-button" onClick={()=>advance(true)} disabled={!skipAllowed} aria-describedby="question-help">이 문항 건너뛰기</button><p className="skip-note">{axis.label} 취향 · {groupAnswered}/{groupQuestions.length}문항 응답 · 동점이면 답변 필요</p></div><div className="question-dots" aria-label="문항별 진행 상태">{questions.map((item,i)=><span key={i} title={(i+1)+"번 "+(answers[i]===undefined?"미응답":answers[i]===null?"건너뜀":answers[i]+" 선택")} className={i===index?"current":answers[i]===null?"skipped":answers[i]?"done":""}>{i+1}</span>)}</div></main>:null}
 {screen==="brewing"?<main className="brewing" aria-live="polite"><div className="brew-character"><span className="brand-character mori" role="img" aria-label="모리"/></div><span className="eyebrow">취향을 찾는 중</span><h1>당신만의 취향을<br/>한 잔에 담고 있어요.</h1><p>선택한 답에서 커피 DNA를 찾는 중이에요.</p></main>:null}
 {screen==="result"&&result.type?<main className="result-main"><div className="result-intro"><span className="test-label">나의 커피 DNA</span><p>{designPreview?"BFPE 결과 미리보기":"모리티아에서 발견한 나의 취향"}</p></div><div className="result-layout"><figure className="type-card-figure"><h1 ref={heading} tabIndex={-1} className="sr-only">{result.type.name} · {result.type.subtitle}</h1><img src={"type-cards/"+result.code+".png?v=20261007-clear"} alt={result.code+" 커피 유형 카드"} width={4531} height={cardHeights[result.code??""]??5480} decoding="async"/></figure><section className="result-copy"><h2>{result.type.subtitle}</h2><p>{result.type.description}</p><AxisResults scores={result.scores}/><p className="small-note">{designPreview?"미리보기용 예시 응답의 가중 점수입니다.":result.answered+"문항 응답 · "+result.skipped+"문항 건너뜀 · 비율은 응답 점수의 합을 100%로 계산했어요."}</p></section></div><section className="menu-section"><div className="menu-heading"><div><h2>당신의 취향에 어울리는 메뉴</h2></div></div><div className="menu-grid">{[["커피",result.type.coffee],["음료",result.type.drink],["디저트",result.type.dessert]].map(([label,value],i)=><article key={label} className="menu-item"><div><span className="eyebrow">{label}</span><h3>{value}</h3></div></article>)}</div><p className="menu-reason">{result.type.reason}</p><p className="small-note">추천 메뉴는 조합 전체를 고려한 기획서 기준입니다. 주문 전 직원에게 메뉴를 확인해 주세요.</p></section>{designPreview?null:kiosk?<ResultQr url={shareUrl("./",result.code!,"qr")}/>:<ShareActions url={shareUrl("./",result.code!)} title="모리티아 COFFEE DNA" text={"나의 커피 DNA는 "+result.code+"! 너는 어떤 유형이야?"} cardSrc={"type-cards/"+result.code+".png?v=20261007-clear"} code={result.code!}/>}<div className="result-actions"><button className="primary" onClick={reset}><RotateCcw size={18}/>다시 시작하기</button><p>“오늘 모리티아에서 발견한 나의 취향.”</p></div></main>:null}
 {(screen==="result")?<div className="save-status" aria-live="polite">{designPreview?<span>디자인 미리보기입니다. 실제 응답과 통계에 저장되지 않습니다.</span>:error?<div className="error-box"><span>{error}</span><button onClick={()=>finish(answers,false)} disabled={busy}>{busy?"저장 중":"다시 저장"}</button></div>:<span>{saved?(kiosk?"응답이 저장되었어요. 잠시 사용하지 않으면 처음 화면으로 돌아갑니다.":"응답이 저장되었어요."):"저장 중이에요."}</span>}</div>:null}
 <IdleWarning left={idleLeft}/>
 <footer className="site-footer"><span>MAURITIA COFFEE</span><div className="footer-tools">{kiosk?<FullscreenControl/>:null}{kiosk&&screen==="home"?<a href="../" className="admin-link"><Store size={13}/>브랜드 선택</a>:null}</div></footer></div>
}
