import { axe } from 'jest-axe'
import { expect } from 'vitest'

/**
 * Runs the axe accessibility checker on rendered HTML and fails the test if it
 * finds problems (missing labels, bad ARIA, duplicate ids...). Colour contrast
 * can't be checked in tests (there is no real screen), so check that by eye.
 */
export async function expectNoAxeViolations(container: Element) {
  const results = await axe(container)
  expect(results.violations).toEqual([])
}
