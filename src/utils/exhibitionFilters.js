const DAY = 24 * 60 * 60 * 1000

function toDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function getToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return today
}

// 오늘 기준 다가오는 토·일 (주말 당일이면 이번 주말)
export function getThisWeekend() {
  const today = getToday()
  const day = today.getDay()

  const saturday = new Date(today)
  saturday.setDate(today.getDate() + (day === 0 ? -1 : 6 - day))

  const sunday = new Date(saturday)
  sunday.setDate(saturday.getDate() + 1)

  return { saturday, sunday }
}

export function getDaysLeft(endDate) {
  if (!endDate) return Infinity

  return Math.round((toDate(endDate) - getToday()) / DAY)
}

export function getTodayString() {
  const today = getToday()
  const pad = (value) => String(value).padStart(2, '0')

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

export function isOpenOnDate(exhibition, dateString) {
  return (
    exhibition.startDate <= dateString &&
    exhibition.endDate >= dateString
  )
}

// '무료', '무료 (사전예약)'처럼 무료로 시작하는 경우만 무료로 본다
// ('성인 3,000원 … 한시적 무료' 같은 안내 문구는 제외)
export function isFree(exhibition) {
  const price = exhibition.price?.trim() || ''

  return /^무료/.test(price) || /^0원/.test(price)
}

export function getPriceLabel(exhibition) {
  if (exhibition.price === undefined) return ''
  if (isFree(exhibition)) return '무료'
  if (!exhibition.price) return '관람료 문의'

  // 금액 안내가 길면 첫 항목만 보여준다
  return exhibition.price.split(/[/\n(]/)[0].trim()
}

export function isOpenOnWeekend(exhibition) {
  const { saturday, sunday } = getThisWeekend()

  return (
    toDate(exhibition.startDate) <= sunday &&
    toDate(exhibition.endDate) >= saturday
  )
}

// 칩은 하나만 고를 수 있으며, 고른 칩을 필터 조건으로 바꿔 쓴다
export const QUICK_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'ongoing', label: '전시 중' },
  { key: 'closing', label: '곧 종료' },
  { key: 'upcoming', label: '전시 예정' },
  { key: 'weekend', label: '이번 주말 관람 가능' },
  { key: 'free', label: '무료' },
]

export function getQuickFilterConditions(quick) {
  return {
    status: ['ongoing', 'closing', 'upcoming'].includes(quick) ? quick : 'all',
    weekendOnly: quick === 'weekend',
    freeOnly: quick === 'free',
  }
}

export const SORT_OPTIONS = [
  { key: 'recommended', label: '추천순' },
  { key: 'distance', label: '가까운 순' },
  { key: 'closing', label: '마감 임박순' },
  { key: 'recent', label: '최근 시작순' },
  { key: 'title', label: '이름순' },
]

// 곧 종료: 오늘부터 14일 안에 끝나는 전시
const CLOSING_DAYS = 14

function matchesStatus(exhibition, status) {
  if (status === 'any') return true

  const today = getToday()
  const started = toDate(exhibition.startDate) <= today
  const daysLeft = getDaysLeft(exhibition.endDate)

  if (status === 'ongoing') return started && daysLeft >= 0
  if (status === 'closing') return started && daysLeft >= 0 && daysLeft <= CLOSING_DAYS
  if (status === 'upcoming') return !started

  return daysLeft >= 0
}

// 찜한 전시에서 자주 고른 지역·기관을 뽑아 추천 점수에 반영한다
function buildTasteProfile(favorites = []) {
  return {
    regions: new Set(favorites.map((item) => item.region).filter(Boolean)),
    institutions: new Set(
      favorites.map((item) => item.institution).filter(Boolean)
    ),
    ids: new Set(favorites.map((item) => item.id)),
  }
}

// 추천 점수: 새로 시작한 전시와 내 취향을 가장 크게 반영하고,
// 마감 임박은 보조 점수로만 써서 마감 임박순과 결과가 달라지게 한다
export function getRecommendScore(exhibition, profile) {
  const today = getToday()
  const daysSinceStart = (today - toDate(exhibition.startDate)) / DAY
  const daysLeft = getDaysLeft(exhibition.endDate)
  const duration =
    (toDate(exhibition.endDate) - toDate(exhibition.startDate)) / DAY

  if (daysLeft < 0) return -100

  let score = 0

  // 새로 시작한 전시
  if (daysSinceStart >= 0 && daysSinceStart <= 14) score += 3
  else if (daysSinceStart >= 0 && daysSinceStart <= 30) score += 2

  // 곧 열리는 전시는 조금, 한참 뒤에 열리는 전시는 뒤로
  if (daysSinceStart < 0) score += daysSinceStart >= -14 ? 1 : -1

  // 놓치기 전에 볼 전시
  if (daysSinceStart >= 0 && daysLeft <= 7) score += 2
  else if (daysSinceStart >= 0 && daysLeft <= CLOSING_DAYS) score += 1

  // 무료 전시
  if (isFree(exhibition)) score += 1

  // 1년 넘게 하는 상설전 성격의 전시는 언제든 갈 수 있으니 뒤로
  if (duration > 365) score -= 2

  // 내가 찜한 전시와 같은 기관·지역 (이미 찜한 전시는 제외)
  if (profile && !profile.ids.has(exhibition.id)) {
    if (profile.institutions.has(exhibition.institution)) score += 4
    else if (profile.regions.has(exhibition.region)) score += 3
  }

  return score
}

// 두 좌표 사이 거리(km)
function getDistanceKm(from, to) {
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// API의 gpsX는 경도, gpsY는 위도
export function getExhibitionDistance(exhibition, location) {
  const lat = Number.parseFloat(exhibition.gpsY)
  const lng = Number.parseFloat(exhibition.gpsX)

  if (!location || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return getDistanceKm(location, { lat, lng })
}

function matchesKeyword(exhibition, keyword) {
  if (!keyword) return true

  return [
    exhibition.title,
    exhibition.institution,
    exhibition.region,
    exhibition.sigungu,
  ].some((value) => value.toLowerCase().includes(keyword))
}

function getSorter(sort, { favorites, location }) {
  if (sort === 'recommended') {
    const profile = buildTasteProfile(favorites)
    const scores = new Map()
    const scoreOf = (exhibition) => {
      if (!scores.has(exhibition.id)) {
        scores.set(exhibition.id, getRecommendScore(exhibition, profile))
      }

      return scores.get(exhibition.id)
    }

    // 점수가 같으면 최근 시작한 전시부터
    return (a, b) =>
      scoreOf(b) - scoreOf(a) || b.startDate.localeCompare(a.startDate)
  }

  if (sort === 'distance') {
    // 위치 정보가 없는 전시는 맨 뒤로
    const distanceOf = (exhibition) =>
      getExhibitionDistance(exhibition, location) ?? Infinity

    return (a, b) => distanceOf(a) - distanceOf(b)
  }

  const sorters = {
    closing: (a, b) => a.endDate.localeCompare(b.endDate),
    recent: (a, b) => b.startDate.localeCompare(a.startDate),
    title: (a, b) => a.title.localeCompare(b.title, 'ko'),
  }

  return sorters[sort] || sorters.closing
}

export function filterExhibitions(
  exhibitions,
  {
    keyword,
    status,
    region,
    weekendOnly,
    freeOnly,
    visitDate,
    sort,
    favorites,
    location,
  }
) {
  const normalizedKeyword = keyword.trim().toLowerCase()

  return exhibitions
    .filter(
      (exhibition) =>
        matchesStatus(exhibition, status) &&
        matchesKeyword(exhibition, normalizedKeyword) &&
        (region === 'all' || exhibition.region === region) &&
        (!weekendOnly || isOpenOnWeekend(exhibition)) &&
        (!freeOnly || isFree(exhibition)) &&
        (!visitDate || isOpenOnDate(exhibition, visitDate))
    )
    .sort(getSorter(sort, { favorites, location }))
}

// 데이터에 있는 지역을 전시 수가 많은 순으로
export function getRegions(exhibitions) {
  const counts = new Map()

  exhibitions.forEach(({ region }) => {
    if (region) counts.set(region, (counts.get(region) || 0) + 1)
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([region]) => region)
}
