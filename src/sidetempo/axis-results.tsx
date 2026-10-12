import { scoreAnswers } from "./quiz";

type AxisScore = ReturnType<typeof scoreAnswers>["scores"][number];

export default function AxisResults({ scores }: { scores: AxisScore[] }) {
 return <div className="axis-list">{scores.map(score => {
  const aPercent = score.total ? Math.round(score.aScore / score.total * 100) : 0;
  const bPercent = score.total ? 100 - aPercent : 0;
  return <div className="axis-row" key={score.id}>
   <h3 className="axis-name">{score.label}</h3>
   <div className="axis-details">
    <div className="axis-choices">
     <span className={"axis-choice" + (score.winner === "A" ? " is-preferred" : "")}>{score.aLabel}</span>
     <span className={"axis-choice" + (score.winner === "B" ? " is-preferred" : "")}>{score.bLabel}</span>
    </div>
    <div className="axis-track" aria-hidden="true"><span style={{ width: aPercent + "%" }} /></div>
    <div className="axis-ends"><span>{score.a} {aPercent}%</span><span>{score.b} {bPercent}%</span></div>
   </div>
  </div>;
 })}</div>;
}
