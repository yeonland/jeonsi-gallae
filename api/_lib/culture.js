// api/_lib 아래 파일은 Vercel이 함수로 배포하지 않는 공용 모듈이다

const BASE_URL = 'https://apis.data.go.kr/B553457/cultureinfo'

function getToday() {
  return new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
    .replaceAll('-', '')
}

// from~to 사이에 시작일 또는 종료일이 있는 항목이 조회되므로
// 오늘부터 먼 미래까지로 잡아 진행 중·예정 전시만 받아온다
export function buildListUrl(serviceKey) {
  return (
    `${BASE_URL}/period2` +
    `?serviceKey=${serviceKey}` +
    '&PageNo=1' +
    '&numOfrows=1000' +
    `&from=${getToday()}` +
    '&to=20991231' +
    '&serviceTp=A'
  )
}

export function buildDetailUrl(serviceKey, seq) {
  return `${BASE_URL}/detail2?serviceKey=${serviceKey}&seq=${seq}`
}

// 상세 API는 초당 요청 수 제한이 있어 초과하면 잠시 쉬고 다시 요청한다
export async function fetchDetailXml(serviceKey, seq, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(buildDetailUrl(serviceKey, seq))

    if (!response.ok) {
      throw new Error(`문화정보 API 오류: ${response.status}`)
    }

    const xmlText = await response.text()

    if (!xmlText.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS')) {
      return xmlText
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
  }

  throw new Error('문화정보 API 요청 제한 초과')
}

export function pickTag(xmlText, tag) {
  return (
    xmlText
      .match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]
      ?.replaceAll('&amp;', '&')
      .trim() || ''
  )
}
