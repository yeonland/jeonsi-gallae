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

        region:
          item.querySelector('area')?.textContent || '',

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

        price: null,
      }
    })

  return exhibitions
}