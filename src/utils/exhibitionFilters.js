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
  { key: 'closing', label: '마감 임박순' },
  { key: 'recent', label: '최근 시작순' },
  { key: 'title', label: '이름순' },
]

// 곧 종료: 오늘부터 14일 안에 끝나는 전시
const CLOSING_DAYS = 14
// 최근 시작: 시작한 지 30일 이내인 전시
const RECENT_DAYS = 30

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

// 추천순 그룹: 곧 종료 → 최근 시작 → 그 외 진행 중 → 예정 → 종료
function getRecommendGroup(exhibition) {
  const today = getToday()
  const daysSinceStart = (today - toDate(exhibition.startDate)) / DAY
  const daysLeft = getDaysLeft(exhibition.endDate)

  if (daysLeft < 0) return 4
  if (daysSinceStart < 0) return 3
  if (daysLeft <= CLOSING_DAYS) return 0
  if (daysSinceStart <= RECENT_DAYS) return 1

  return 2
}

function compareRecommended(a, b) {
  const groupA = getRecommendGroup(a)
  const groupB = getRecommendGroup(b)

  if (groupA !== groupB) return groupA - groupB

  // 곧 종료·그 외 진행 중은 빨리 끝나는 순, 최근 시작은 최신순, 예정은 빨리 열리는 순
  if (groupA === 1) return b.startDate.localeCompare(a.startDate)
  if (groupA === 3) return a.startDate.localeCompare(b.startDate)

  return a.endDate.localeCompare(b.endDate)
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

const sorters = {
  recommended: compareRecommended,
  closing: (a, b) => a.endDate.localeCompare(b.endDate),
  recent: (a, b) => b.startDate.localeCompare(a.startDate),
  title: (a, b) => a.title.localeCompare(b.title, 'ko'),
}

export function filterExhibitions(
  exhibitions,
  { keyword, status, region, weekendOnly, freeOnly, visitDate, sort }
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
    .sort(sorters[sort])
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
