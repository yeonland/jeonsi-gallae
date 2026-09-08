export default async function handler(request, response) {
  const serviceKey = process.env.CULTURE_API_KEY

  if (!serviceKey) {
    return response.status(500).json({
      message: '문화정보 API 키가 설정되지 않았습니다.',
    })
  }

  const currentYear = new Date().getFullYear()

  const url =
    'https://apis.data.go.kr/B553457/cultureinfo/period2' +
    `?serviceKey=${serviceKey}` +
    '&PageNo=1' +
    '&numOfrows=100' +
    `&from=${currentYear}0101` +
    `&to=${currentYear}1231` +
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

    return response.status(200).send(xmlText)
  } catch (error) {
    console.error(error)

    return response.status(500).json({
      message: '전시 정보를 불러오지 못했습니다.',
    })
  }
}