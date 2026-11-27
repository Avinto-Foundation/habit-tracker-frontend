import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeHabit } from '../test/habits'
import { apiUrl, server } from '../test/server'
import * as habitsApi from './habits'
import type { HabitInput } from './types'

const INPUT: HabitInput = {
  name: 'Read',
  target: '20 pages',
  icon: '📚',
  color: '#1D4ED8',
  schedule_type: 'weekdays',
  weekdays: [0, 2, 4],
  times_per_week: null,
  visibility: 'friends',
}

describe('habits API calls', () => {
  it('listHabits() gets active habits (no query string)', async () => {
    let url = ''
    server.use(
      http.get(apiUrl('/habits/'), ({ request }) => {
        url = request.url
        return HttpResponse.json([makeHabit()])
      }),
    )

    const habits = await habitsApi.listHabits()

    expect(new URL(url).search).toBe('')
    expect(habits).toEqual([makeHabit()])
  })

  it('listHabits({ archived: true }) asks for archived habits', async () => {
    let archived: string | null = null
    server.use(
      http.get(apiUrl('/habits/'), ({ request }) => {
        archived = new URL(request.url).searchParams.get('archived')
        return HttpResponse.json([])
      }),
    )

    await habitsApi.listHabits({ archived: true })

    expect(archived).toBe('true')
  })

  it('getHabit() gets one habit by id', async () => {
    server.use(http.get(apiUrl('/habits/7/'), () => HttpResponse.json(makeHabit({ id: 7 }))))

    expect(await habitsApi.getHabit(7)).toEqual(makeHabit({ id: 7 }))
  })

  it('getHabit() throws on 404 (missing or not mine)', async () => {
    server.use(
      http.get(apiUrl('/habits/9/'), () =>
        HttpResponse.json({ detail: 'No Habit matches the given query.' }, { status: 404 }),
      ),
    )

    await expect(habitsApi.getHabit(9)).rejects.toMatchObject({ response: { status: 404 } })
  })

  it('createHabit() posts the habit and returns the saved one', async () => {
    let sent: unknown
    server.use(
      http.post(apiUrl('/habits/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(makeHabit({ ...INPUT, id: 3 }), { status: 201 })
      }),
    )

    const habit = await habitsApi.createHabit(INPUT)

    expect(sent).toEqual(INPUT)
    expect(habit.id).toBe(3)
  })

  it('updateHabit() patches only the fields given', async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/habits/3/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(makeHabit({ id: 3, archived: true }))
      }),
    )

    const habit = await habitsApi.updateHabit(3, { archived: true })

    expect(sent).toEqual({ archived: true })
    expect(habit.archived).toBe(true)
  })

  it('deleteHabit() sends DELETE', async () => {
    let deleted = false
    server.use(
      http.delete(apiUrl('/habits/3/'), () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await habitsApi.deleteHabit(3)

    expect(deleted).toBe(true)
  })
})
