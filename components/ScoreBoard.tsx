interface ScoreBoardProps {
  questionNumber: number;
  totalQuestions: number;
  score: number;
  streak: number;
}

interface TileProps {
  label: string;
  value: number;
  suffix?: string;
}

function Tile({ label, value, suffix }: TileProps) {
  return (
    <div className="border-[3px] border-ink bg-ink px-3 py-2 shadow-hard-sm sm:px-4 sm:py-3">
      <dt className="text-sm font-semibold text-chalk/80">{label}</dt>
      <dd className="font-display text-3xl leading-tight text-gold sm:text-4xl">
        {value}
        {suffix && <span className="text-lg text-chalk/70 sm:text-xl">{suffix}</span>}
      </dd>
    </div>
  );
}

export function ScoreBoard({ questionNumber, totalQuestions, score, streak }: ScoreBoardProps) {
  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-4">
      <Tile label="Question" value={questionNumber} suffix={`/${totalQuestions}`} />
      <Tile label="Score" value={score} />
      <Tile label="Streak" value={streak} />
    </dl>
  );
}
