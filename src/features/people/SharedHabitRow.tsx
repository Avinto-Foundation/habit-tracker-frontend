import { Check, Flame } from 'lucide-react'
import type { SharedHabit } from '../../api/types'
import { scheduleLabel } from '../habits/habitOptions'
import { streakText } from '../today/greeting'
import styles from './PersonProfile.module.css'

/**
 * One habit on someone's profile: icon, name, target and schedule, then the
 * current and best streak and whether it's done today (or this week's progress).
 *
 * Read-only: friends can look, not tick it off. The numbers are words too
 * ("5 days streak", "Best 9 days"), so nothing is shown by colour alone.
 */
export default function SharedHabitRow({ entry }: { entry: SharedHabit }) {
  const { habit, current_streak, longest_streak, streak_unit, done_today, week_progress } = entry
  return (
    <li className={styles.habit}>
      <span
        className={styles.icon}
        style={{ borderColor: habit.color, backgroundColor: `${habit.color}1A` }}
        aria-hidden="true"
      >
        {habit.icon}
      </span>
      <div className={styles.details}>
        <h3 className={styles.habitName}>{habit.name}</h3>
        <span className={styles.meta}>
          {[habit.target, scheduleLabel(habit)].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className={styles.numbers}>
        <span className={styles.streak}>
          <Flame size={16} aria-hidden="true" />
          {streakText(current_streak, streak_unit)}
          <span className="sr-only"> streak</span>
        </span>
        <span className={styles.best}>Best {streakText(longest_streak, streak_unit)}</span>
        {week_progress ? (
          <span className={styles.best}>
            {week_progress.done} of {week_progress.goal} this week
          </span>
        ) : (
          done_today && (
            <span className={styles.done}>
              <Check size={16} aria-hidden="true" /> Done today
            </span>
          )
        )}
      </div>
    </li>
  )
}
