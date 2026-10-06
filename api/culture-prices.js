import { buildListUrl, fetchDetailXml, pickTag } from './_lib/culture.js'

// 목록 API에는 관람료가 없어서, 전시마다 상세 API를 호출해 관람료를 모은다.
// 상세 API는 초당 요청 제한이 있어 한 건씩 천천히 요청해야 하므로
// 전시를 PAGE_SIZE개씩 나눠 요청받고, 페이지별 결과를 12시간 동안 캐시한다.

const PAGE_SIZE = 30
const REQUEST_GAP_MS = 250
const TIME_LIMIT_MS = 45 * 1000

export default async function handler(request, response) {
  const serviceKey = process.env.CULTURE_API_KEY
  const page = Math.max(0, Number.parseInt(request.query.page, 10) || 0)

  if (!serviceKey) {
    return response.status(500).json({
      message: '문화정보 API 키가 설정되지 않았습니다.',
    })
  }

  try {
    const listResponse = await fetch(buildListUrl(serviceKey))

    if (!listResponse.ok) {
      throw new Error(`문화정보 API 오류: ${listResponse.status}`)
    }

    const listXml = await listResponse.text()

    const allSeqs = [
      ...listXml.matchAll(
        /<serviceName>전시<\/serviceName><seq>(\d+)<\/seq>/g
      ),
    ].map((match) => match[1])

    const totalPages = Math.ceil(allSeqs.length / PAGE_SIZE)
    const seqs = allSeqs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const startedAt = Date.now()
    const prices = {}
    let isComplete = true

    for (const seq of seqs) {
      if (Date.now() - startedAt > TIME_LIMIT_MS) {
        isComplete = false
        break
      }

      try {
        const detailXml = await fetchDetailXml(serviceKey, seq)
        prices[seq] = pickTag(detailXml, 'price')
      } catch (error) {
        console.error(seq, error.message)
        isComplete = false
      }

      await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS))
    }

    // 일부만 모았으면 짧게 캐시해 다음 요청에서 다시 채운다
    response.setHeader(
      'Cache-Control',
      isComplete
        ? 's-maxage=43200, stale-while-revalidate=172800'
        : 's-maxage=300, stale-while-revalidate=3600'
    )

    return response.status(200).json({ page, totalPages, prices, isComplete })
  } catch (error) {
    console.error(error)

    return response.status(500).json({
      message: '관람료 정보를 불러오지 못했습니다.',
    })
  }
}
