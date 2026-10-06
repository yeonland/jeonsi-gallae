export default async function handler(request, response) {
  const serviceKey = process.env.CULTURE_API_KEY

  if (!serviceKey) {
    return response.status(500).json({
      message: '문화정보 API 키가 설정되지 않았습니다.',
    })
  }

  // from~to 사이에 시작일 또는 종료일이 있는 항목이 조회되므로
  // 오늘부터 먼 미래까지로 잡아 진행 중·예정 전시만 받아온다
  const today = new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
    .replaceAll('-', '')

  const url =
    'https://apis.data.go.kr/B553457/cultureinfo/period2' +
    `?serviceKey=${serviceKey}` +
    '&PageNo=1' +
    '&numOfrows=1000' +
    `&from=${today}` +
    '&to=20991231' +
    '&serviceTp=A'

  try {
    const apiResponse = await fetch(url)

    if (!apiResponse.ok) {
      throw new Error(`문화정보 API 오류: ${apiResponse.status}`)
    }

    const xmlText = await apiResponse.text()

    response.setHeader(
      'Content-Type',
      'application/xml; charset=utf-8'
    )

    // 같은 응답을 1시간 동안 CDN에 캐시해 API 호출 수를 줄인다
    response.setHeader(
      'Cache-Control',
      's-maxage=3600, stale-while-revalidate=86400'
    )

    return response.status(200).send(xmlText)
  } catch (error) {
    console.error(error)

    return response.status(500).json({
      message: '전시 정보를 불러오지 못했습니다.',
    })
  }
}