import data from "./quiz-data.json";
export type Answer = "A" | "B" | null;
export const questions = data.questions;
export const types = data.types;
export const quizVersion = "mauritia-2026-10-v5";
export const axes = [
 {id:"BODY",label:"바디",a:"BOLD",b:"MELLOW",aCode:"B",bCode:"M",aLabel:"진한 커피",bLabel:"부드러운 커피"},
 {id:"FLAVOR",label:"풍미",a:"FRUITY",b:"NUTTY",aCode:"F",bCode:"N",aLabel:"산미·과일향",bLabel:"고소·초콜릿향"},
 {id:"SWEETNESS",label:"달콤함",a:"PURE",b:"SWEET",aCode:"P",bCode:"S",aLabel:"커피 본연의 맛",bLabel:"달콤한 맛"},
 {id:"STYLE",label:"스타일",a:"EXPLORER",b:"ROUTINE",aCode:"E",bCode:"R",aLabel:"새로운 메뉴",bLabel:"익숙한 메뉴"},
] as const;
export function validAnswers(value:unknown):value is Answer[] {return Array.isArray(value)&&value.length===10&&value.every(v=>v===null||v==="A"||v==="B");}
function axisTotals(answers:readonly (Answer|undefined)[],axis:string){
 let a=0,b=0;
 questions.forEach((q,i)=>{if(q.axis===axis){if(answers[i]==="A")a+=q.weight;if(answers[i]==="B")b+=q.weight;}});
 return {a,b};
}
// Leaving an axis requires a decided result, including after back navigation.
export function canAdvanceQuestion(answers:readonly (Answer|undefined)[],index:number){
 const question=questions[index];
 if(!question||answers[index]===undefined)return false;
 const isLast=!questions.slice(index+1).some(q=>q.axis===question.axis);
 if(!isLast)return true;
 const {a,b}=axisTotals(answers,question.axis);
 return a!==b;
}
export function canSkipQuestion(answers:readonly (Answer|undefined)[],index:number){
 const question=questions[index];
 if(!question)return false;
 const candidate=answers.map((answer,i)=>i===index?null:answer);
 const {a,b}=axisTotals(candidate,question.axis);
 const hasLaterQuestion=questions.slice(index+1).some(q=>q.axis===question.axis);
 // An untouched axis may skip ahead; a scored tie must be answered.
 return (a!==b||(a===0&&b===0&&hasLaterQuestion))&&canAdvanceQuestion(candidate,index);
}
export function scoreAnswers(answers:Answer[]){
 if(!validAnswers(answers)) throw new Error("10개의 올바른 응답이 필요합니다.");
 const scores=axes.map(axis=>{
 const {a,b}=axisTotals(answers,axis.id);
 return {...axis,aScore:a,bScore:b,total:a+b,winner:a===b?null:a>b?"A":"B",code:a===b?null:a>b?axis.aCode:axis.bCode};
 });
 const missing=scores.filter(s=>!s.code).map(s=>s.id);
 const code=missing.length?null:scores.map(s=>s.code).join("");
 return {code,scores,missing,answered:answers.filter(Boolean).length,skipped:answers.filter(a=>a===null).length,type:types.find(t=>t.code===code)??null};
}
