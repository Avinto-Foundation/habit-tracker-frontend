import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeToday, makeTodayHabit } from '../test/habits'
import { apiUrl, server } from '../test/server'
import { checkIn, undoCheckIn } from './checkins'
import { getToday } from './habits'

const CHECKIN = {
  id: 7,
  habit: 3,
  date: '2026-11-20',
  note: '',
  created_at: '2026-11-20T08:00:00Z',
}

describe('check-in API calls', () => {
  it('checkIn() posts an empty body for "today"', async () => {
    let sent: unknown
    server.use(
      http.post(apiUrl('/habits/3/checkins/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(CHECKIN, { status: 201 })
      }),
    )

    expect(await checkIn(3)).toEqual(CHECKIN)
    expect(sent).toEqual({})
  })

  it('checkIn() can send a date and a note', async () => {
    let sent: unknown
    server.use(
      http.post(apiUrl('/habits/3/checkins/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(CHECKIN, { status: 201 })
      }),
    )

    await checkIn(3, { date: '2026-11-19', note: 'On the bus' })

    expect(sent).toEqual({ date: '2026-11-19', note: 'On the bus' })
  })

  it('undoCheckIn() deletes the check-in for that date', async () => {
    let deleted = false
    server.use(
      http.delete(apiUrl('/habits/3/checkins/2026-11-20/'), () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await undoCheckIn(3, '2026-11-20')

    expect(deleted).toBe(true)
  })

  it('getToday() gets the Today overview', async () => {
    const today = makeToday([makeTodayHabit()])
    server.use(http.get(apiUrl('/habits/today/'), () => HttpResponse.json(today)))

    expect(await getToday()).toEqual(today)
  })
})
