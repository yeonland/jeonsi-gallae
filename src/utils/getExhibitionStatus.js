export function getExhibitionStatus(startDate, endDate) {
  const today = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  today.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  if (today < start) {
    return {
      key: 'upcoming',
      label: '전시 예정',
    }
  }

  if (today > end) {
    return {
      key: 'ended',
      label: '전시 종료',
    }
  }

  return {
    key: 'ongoing',
    label: '전시 중',
  }
}