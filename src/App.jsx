import { useEffect, useState } from 'react'
import './App.css'
import ExhibitionCard from './components/ExhibitionCard'
import { getCultureExhibitions } from './api/cultureApi'

function App() {
  const [exhibitions, setExhibitions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  useEffect(() => {
    async function loadExhibitions() {
      try {
        const data = await getCultureExhibitions()

        setExhibitions(data)
      } catch (error) {
        console.error(error)

        setError(
          '전시 정보를 불러오지 못했습니다.'
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadExhibitions()
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
  }
  
  const filteredExhibitions = exhibitions.filter(
    (exhibition) => {
      const keyword =
        searchKeyword.trim().toLowerCase()

      return (
        exhibition.title
          .toLowerCase()
          .includes(keyword) ||

        exhibition.institution
          .toLowerCase()
          .includes(keyword) ||

        exhibition.region
          .toLowerCase()
          .includes(keyword) ||

        exhibition.category
          .toLowerCase()
          .includes(keyword)
      )
    }
  )

  return (
    <div className="app" id="top">
      <header className="header">
        <a href="#top" className="logo">
          전시갈래
        </a>

        <nav className="nav" aria-label="주요 메뉴">
          <a href="#exhibitions">전시 찾기</a>
          <a href="#favorites">찜한 전시</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="hero-eyebrow">이번 주말, 어디 갈래?</p>

          <h1>갈 만한 전시를 1분 안에 찾아보세요.</h1>

          <p className="hero-description">
            지역과 날짜를 선택해 지금 볼 수 있는 전시와 공식 예매처를
            한 번에 확인해 보세요.
          </p>

          <form className="search-box" onSubmit={handleSubmit}>
            <label htmlFor="search" className="sr-only">
              전시명 또는 미술관 검색
            </label>

            <input
              id="search"
              type="search"
              placeholder="전시명이나 미술관을 검색해 보세요"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />

            <button type="submit">전시 찾기</button>
          </form>

          <div className="quick-filter">
            <button type="button">이번 주말</button>
            <button type="button">서울</button>
            <button type="button">무료 전시</button>
            <button type="button">전시 중</button>
          </div>
        </section>

        <section
          id="exhibitions"
          className="exhibition-section"
        >
          <div className="section-heading">
            <div>
              <p className="section-heading-eyebrow">
                WEEKEND PICK
              </p>

              <h2>이번 주말 추천 전시</h2>
            </div>

            <a href="#exhibitions">전체 보기</a>
          </div>

          <div className="exhibition-grid">
            {isLoading && (
              <p>전시 정보를 불러오는 중입니다.</p>
            )}

            {error && (
              <p>{error}</p>
            )}

            {!isLoading &&
              !error &&
              filteredExhibitions.map((exhibition) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                />
              ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App