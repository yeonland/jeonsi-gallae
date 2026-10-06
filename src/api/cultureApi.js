function decodeHtml(text) {
  if (!text) return ''

  const parser = new DOMParser()

  let decoded = text

  // API 데이터가 두 번 인코딩된 경우까지 처리
  for (let i = 0; i < 2; i++) {
    const doc = parser.parseFromString(decoded, 'text/html')
    const next = doc.documentElement.textContent || ''

    if (next === decoded) break

    decoded = next
  }

  return decoded
}

function formatDate(dateString) {
  if (!dateString || dateString.length !== 8) {
    return ''
  }

  return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`
}

// 관람료는 페이지별로 나눠 받으며, 한 페이지가 올 때마다 onPage로 알려준다.
// 상세 API 요청 제한 때문에 페이지는 하나씩 순서대로 요청한다.
export async function getExhibitionPrices(onPage, signal) {
  let page = 0
  let totalPages = 1

  while (page < totalPages) {
    const response = await fetch(`/api/culture-prices?page=${page}`, {
      signal,
    })

    if (!response.ok) {
      throw new Error('관람료 정보를 불러오지 못했습니다.')
    }

    const data = await response.json()

    totalPages = data.totalPages
    onPage(data.prices, { page: page + 1, totalPages })
    page += 1
  }
}

export async function getCultureExhibitions() {
  const url = '/api/culture'
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('전시 정보를 불러오지 못했습니다.')
  }

  const xmlText = await response.text()

  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')

  const items = [...xml.querySelectorAll('item')]

  const exhibitions = items
    .filter((item) => {
      const serviceName =
        item.querySelector('serviceName')?.textContent

      return serviceName === '전시'
    })
    .map((item) => {
      const thumbnail =
        item.querySelector('thumbnail')?.textContent || ''

      return {
        id:
          item.querySelector('seq')?.textContent || '',

        title: decodeHtml(
          item.querySelector('title')?.textContent || ''
        ),

        institution: decodeHtml(
          item.querySelector('place')?.textContent || ''
        ),

        // '서울시'처럼 표기가 섞여 있어 '시'를 떼고 통일
        region:
          (item.querySelector('area')?.textContent || '')
            .trim()
            .replace(/시$/, '') || '기타',

        sigungu:
          item.querySelector('sigungu')?.textContent || '',

        category: decodeHtml(
          item.querySelector('realmName')?.textContent ||
          item.querySelector('serviceName')?.textContent ||
          '전시'
        ),

        startDate: formatDate(
          item.querySelector('startDate')?.textContent || ''
        ),

        endDate: formatDate(
          item.querySelector('endDate')?.textContent || ''
        ),

        thumbnail: thumbnail.replace(
          'http://www.culture.go.kr',
          'https://www.culture.go.kr'
        ),

        gpsX:
          item.querySelector('gpsX')?.textContent || '',

        gpsY:
          item.querySelector('gpsY')?.textContent || '',

        // 관람료는 getExhibitionPrices로 따로 받아 합친다
        price: undefined,
      }
    })

  return exhibitions
}