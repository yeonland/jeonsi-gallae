import { fetchDetailXml, pickTag } from './_lib/culture.js'

// 목록 API에는 상세 링크가 없어서, 포스터를 누르면
// 상세 API로 공식 페이지 주소를 찾아 그곳으로 이동시킨다
export default async function handler(request, response) {
  const serviceKey = process.env.CULTURE_API_KEY
  const { seq, title = '' } = request.query

  const searchUrl =
    'https://search.naver.com/search.naver?query=' +
    encodeURIComponent(`${title} 전시`)

  if (!serviceKey || !/^\d+$/.test(seq || '')) {
    return response.redirect(302, searchUrl)
  }

  try {
    const xmlText = await fetchDetailXml(serviceKey, seq)

    const pickUrl = (tag) => {
      const value = pickTag(xmlText, tag)

      return /^https?:\/\//.test(value) ? value : ''
    }

    const target = pickUrl('url') || pickUrl('placeUrl') || searchUrl

    // 상세 링크는 자주 바뀌지 않으므로 하루 동안 캐시한다
    response.setHeader(
      'Cache-Control',
      's-maxage=86400, stale-while-revalidate=604800'
    )

    return response.redirect(302, target)
  } catch (error) {
    console.error(error)

    return response.redirect(302, searchUrl)
  }
}
