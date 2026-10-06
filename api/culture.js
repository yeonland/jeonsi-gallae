import { buildListUrl } from './_lib/culture.js'

export default async function handler(request, response) {
  const serviceKey = process.env.CULTURE_API_KEY

  if (!serviceKey) {
    return response.status(500).json({
      message: '문화정보 API 키가 설정되지 않았습니다.',
    })
  }

  try {
    const apiResponse = await fetch(buildListUrl(serviceKey))

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
