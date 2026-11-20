import { Check, Flame } from 'lucide-react'
import type { TodayHabit } from '../../api/types'
import { streakText } from './greeting'
import styles from './TodayHabitRow.module.css'

export interface TodayHabitRowProps {
  entry: TodayHabit
  /** Called when the check button is tapped (check in, or undo if already done). */
  onToggle: (entry: TodayHabit) => void
  /** True while this habit's check-in is being saved (button disabled). */
  saving: boolean
}

/**
 * One habit on the Today page: icon, name, target, streak, weekly progress and a
 * big round check button (one tap = done, tap again = undo).
 *
 * Accessibility: the button is a toggle (`aria-pressed`) named after the habit,
 * e.g. "Mark Read as done, pressed", so screen readers say what it does and
 * whether it's done. Done is shown by a filled circle with a tick and
 * strike-through text, not by colour alone.
 */
export default function TodayHabitRow({ entry, onToggle, saving }: TodayHabitRowProps) {
  const { habit, done_today: done, current_streak, streak_unit, week_progress } = entry

  return (
    <li className={done ? `${styles.row} ${styles.done}` : styles.row}>
      <span
        className={styles.icon}
        style={{ borderColor: habit.color, backgroundColor: `${habit.color}1A` }}
        aria-hidden="true"
      >
        {habit.icon}
      </span>

      <div className={styles.details}>
        <span className={styles.name}>{habit.name}</span>
        <span className={styles.meta}>
          {habit.target && <span>{habit.target}</span>}
          {current_streak > 0 && (
            <span className={styles.streak}>
              <Flame size={16} aria-hidden="true" />
              {streakText(current_streak, streak_unit)}
              <span className="sr-only"> streak</span>
            </span>
          )}
          {week_progress && (
            <span>
              {week_progress.done} of {week_progress.goal} this week
            </span>
          )}
        </span>
      </div>

      <button
        type="button"
        className={styles.check}
        style={done ? { backgroundColor: habit.color, borderColor: habit.color } : undefined}
        aria-pressed={done}
        aria-label={`Mark ${habit.name} as done`}
        disabled={saving}
        aria-busy={saving || undefined}
        onClick={() => onToggle(entry)}
      >
        <Check size={24} strokeWidth={3} aria-hidden="true" />
      </button>
    </li>
  )
}
