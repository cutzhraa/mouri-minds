const guideCache = new Map()

function guideCategory(character) {
  const codePoint = character.codePointAt(0)
  if (codePoint >= 0x3040 && codePoint <= 0x309f) return 'hiragana'
  if (codePoint >= 0x30a0 && codePoint <= 0x30ff) return 'katakana'
  return 'kanji'
}

export async function getStrokeGuide(character) {
  if (!character || /^\s+$/.test(character)) return []
  if (guideCache.has(character)) return guideCache.get(character)

  const request = (async () => {
    const codePoint = character.codePointAt(0).toString(16).padStart(5, '0')
    const response = await fetch(`/stroke-guides/${guideCategory(character)}/${codePoint}.svg`)
    if (!response.ok) return null

    const svgText = await response.text()
    const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml')
    const paths = Array.from(svg.querySelectorAll('path[id*="-s"]'))
      .map(path => ({
        order: Number(path.id.match(/-s(\d+)$/)?.[1]),
        d: path.getAttribute('d')
      }))
      .filter(path => Number.isFinite(path.order) && path.d)
      .sort((a, b) => a.order - b.order)
      .map(path => path.d)
    const numbers = Array.from(svg.querySelector('g[id*="StrokeNumbers"]')?.querySelectorAll('text') || [])
      .map((label, index) => {
        const matrix = label.getAttribute('transform')?.match(/matrix\([^)]*\)/)?.[0]
        const values = matrix?.match(/-?\d+(?:\.\d+)?/g)?.map(Number)
        return {
          order: Number(label.textContent.trim()) || index + 1,
          x: values?.[4],
          y: values?.[5]
        }
      })
      .filter(number => Number.isFinite(number.x) && Number.isFinite(number.y))
      .sort((a, b) => a.order - b.order)
    return { paths, numbers }
  })().catch(() => null)

  guideCache.set(character, request)
  const result = await request
  if (result === null) guideCache.delete(character)
  return result
}

export async function getExpectedStrokeCount(character) {
  const characters = Array.from((character || '').normalize('NFKC')).filter(char => !/^\s+$/.test(char))
  const guides = await Promise.all(characters.map(getStrokeGuide))
  if (!guides.length || guides.some(guide => !guide?.paths?.length)) return null
  return guides.reduce((total, guide) => total + guide.paths.length, 0)
}

export async function getStrokeNumberGroups(character) {
  const characters = Array.from((character || '').normalize('NFKC')).filter(char => !/^\s+$/.test(char))
  return Promise.all(characters.map(async char => {
    const guide = await getStrokeGuide(char)
    return { character: char, numbers: guide?.numbers || [] }
  }))
}

function samplePolyline(points, sampleCount) {
  if (!points || points.length < 2) return null
  const lengths = [0]
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  }
  const totalLength = lengths[lengths.length - 1]
  if (totalLength < 12) return null

  return Array.from({ length: sampleCount }, (_, sampleIndex) => {
    const target = totalLength * sampleIndex / (sampleCount - 1)
    let segment = 1
    while (segment < lengths.length - 1 && lengths[segment] < target) segment++
    const segmentLength = lengths[segment] - lengths[segment - 1] || 1
    const progress = (target - lengths[segment - 1]) / segmentLength
    return {
      x: points[segment - 1].x + (points[segment].x - points[segment - 1].x) * progress,
      y: points[segment - 1].y + (points[segment].y - points[segment - 1].y) * progress
    }
  })
}

function sampleSvgPath(pathData, sampleCount) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 109 109')
  svg.setAttribute('width', '109')
  svg.setAttribute('height', '109')
  svg.style.position = 'fixed'
  svg.style.left = '-10000px'
  svg.style.visibility = 'hidden'
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathData)
  svg.appendChild(path)
  document.body.appendChild(svg)
  try {
    const totalLength = path.getTotalLength()
    if (!totalLength) return null
    return Array.from({ length: sampleCount }, (_, index) => {
      const point = path.getPointAtLength(totalLength * index / (sampleCount - 1))
      return { x: point.x, y: point.y }
    })
  } finally {
    svg.remove()
  }
}

function normalizeStrokes(strokes) {
  const allPoints = strokes.flat()
  const minX = Math.min(...allPoints.map(point => point.x))
  const maxX = Math.max(...allPoints.map(point => point.x))
  const minY = Math.min(...allPoints.map(point => point.y))
  const maxY = Math.max(...allPoints.map(point => point.y))
  const width = maxX - minX
  const height = maxY - minY
  if (width < 1 || height < 1) return null

  return strokes.map(stroke => stroke.map(point => ({
    x: (point.x - minX) / width,
    y: (point.y - minY) / height
  })))
}

export async function validateStrokeOrder(character, drawnStrokes) {
  const characters = Array.from((character || '').normalize('NFKC')).filter(char => !/^\s+$/.test(char))
  if (!characters.length || !drawnStrokes.length) return false

  const guideGroups = await Promise.all(characters.map(async char => {
    const guide = await getStrokeGuide(char)
    if (!guide?.paths?.length) return null
    return guide.paths.map(path => sampleSvgPath(path, 24))
  }))
  if (guideGroups.some(group => !group?.length || group.some(path => !path))) return false

  const expectedCount = guideGroups.reduce((total, group) => total + group.length, 0)
  if (expectedCount !== drawnStrokes.length) return false

  let strokeOffset = 0
  for (const expectedGroup of guideGroups) {
    const drawnGroup = drawnStrokes.slice(strokeOffset, strokeOffset + expectedGroup.length)
    strokeOffset += expectedGroup.length
    const normalizedExpected = normalizeStrokes(expectedGroup)
    const normalizedDrawn = normalizeStrokes(drawnGroup.map(stroke => samplePolyline(stroke, 24)))
    if (!normalizedExpected || !normalizedDrawn) return false

    let totalError = 0
    let largestStrokeError = 0
    for (let strokeIndex = 0; strokeIndex < normalizedExpected.length; strokeIndex++) {
      let strokeError = 0
      for (let pointIndex = 0; pointIndex < 24; pointIndex++) {
        const expected = normalizedExpected[strokeIndex][pointIndex]
        const drawn = normalizedDrawn[strokeIndex][pointIndex]
        strokeError += Math.hypot(expected.x - drawn.x, expected.y - drawn.y)
      }
      strokeError /= 24
      totalError += strokeError
      largestStrokeError = Math.max(largestStrokeError, strokeError)
    }

    const averageError = totalError / normalizedExpected.length
    if (averageError > 0.2 || largestStrokeError > 0.3) return false
  }

  return true
}
