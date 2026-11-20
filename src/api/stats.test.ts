import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeCheckIn, makeStats } from '../test/habits'
import { apiUrl, server } from '../test/server'
import { listCheckIns, updateCheckInNote } from './checkins'
import { getHabitStats } from './habits'

describe('habit page API calls', () => {
  it('getHabitStats() sends the month when given', async () => {
    let month: string | null = 'not sent'
    server.use(
      http.get(apiUrl('/habits/1/stats/'), ({ request }) => {
        month = new URL(request.url).searchParams.get('month')
        return HttpResponse.json(makeStats())
      }),
    )

    expect(await getHabitStats(1, '2026-11')).toEqual(makeStats())
    expect(month).toBe('2026-11')

    await getHabitStats(1)
    expect(month).toBeNull()
  })

  it('listCheckIns() sends from and to', async () => {
    let query = ''
    server.use(
      http.get(apiUrl('/habits/1/checkins/'), ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json([makeCheckIn(1, '2026-11-20')])
      }),
    )

    const checkins = await listCheckIns(1, { from: '2026-11-19', to: '2026-11-20' })

    expect(query).toBe('?from=2026-11-19&to=2026-11-20')
    expect(checkins).toEqual([makeCheckIn(1, '2026-11-20')])
  })

  it("updateCheckInNote() patches that day's note", async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/habits/1/checkins/2026-11-20/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(makeCheckIn(1, '2026-11-20', 'On the bus'))
      }),
    )

    const checkin = await updateCheckInNote(1, '2026-11-20', 'On the bus')

    expect(sent).toEqual({ note: 'On the bus' })
    expect(checkin.note).toBe('On the bus')
  })
})
