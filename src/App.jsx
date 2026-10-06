import { useEffect, useState } from 'react'
import './App.css'
import ExhibitionCard from './components/ExhibitionCard'
import { getCultureExhibitions } from './api/cultureApi'
import { useFavorites } from './hooks/useFavorites'
import {
  SORT_OPTIONS,
  STATUS_FILTERS,
  filterExhibitions,
  getRegions,
} from './utils/exhibitionFilters'

const PAGE_SIZE = 12

const INITIAL_FILTERS = {
  keyword: '',
  status: 'all',
  region: 'all',
  weekendOnly: false,
  sort: 'recommended',
}

function App() {
  const [exhibitions, setExhibitions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [view, setView] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const { favorites, favoriteIds, toggleFavorite } = useFavorites()

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

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
    setVisibleCount(PAGE_SIZE)
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS)
    setVisibleCount(PAGE_SIZE)
  }

  function showView(nextView) {
    setView(nextView)
    setVisibleCount(PAGE_SIZE)
  }

  const regions = getRegions(exhibitions)

  const baseList = view === 'favorites' ? favorites : exhibitions

  // 찜 목록은 종료된 전시도 남겨 두고, 나머지 조건만 적용
  const filteredExhibitions = filterExhibitions(baseList, {
    ...filters,
    status:
      view === 'favorites' && filters.status === 'all'
        ? 'any'
        : filters.status,
  })

  const visibleExhibitions = filteredExhibitions.slice(0, visibleCount)

  const isFiltered =
    JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS)

  let emptyMessage = '조건에 맞는 전시가 없습니다. 필터를 바꿔 보세요.'

  if (view === 'favorites' && favorites.length === 0) {
    emptyMessage = '아직 찜한 전시가 없습니다. 마음에 드는 전시의 ♡를 눌러 보세요.'
  } else if (view === 'all' && exhibitions.length === 0) {
    emptyMessage = '지금 볼 수 있는 전시 정보가 없습니다.'
  }

  return (
    <div className="app" id="top">
      <header className="header">
        <a href="#top" className="logo">
          전시갈래
        </a>

        <nav className="nav" aria-label="주요 메뉴">
          <a href="#exhibitions" onClick={() => showView('all')}>
            전시 찾기
          </a>
          <a href="#exhibitions" onClick={() => showView('favorites')}>
            찜한 전시
            {favorites.length > 0 && (
              <span className="nav-count">{favorites.length}</span>
            )}
          </a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="hero-eyebrow">이번 주말, 어디 갈래?</p>

          <h1>가려던 전시, 여기서 바로 찾아보세요.</h1>

          <form
            className="search-box"
            role="search"
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="search" className="sr-only">
              전시명, 미술관, 지역 검색
            </label>

            <input
              id="search"
              type="search"
              placeholder="전시명, 미술관, 지역으로 검색"
              value={filters.keyword}
              onChange={(event) =>
                updateFilter('keyword', event.target.value)
              }
            />

            <button type="submit">검색</button>
          </form>
        </section>

        <section
          id="exhibitions"
          className="exhibition-section"
        >
          <div className="view-tabs" role="tablist" aria-label="전시 목록 보기">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'all'}
              className={view === 'all' ? 'is-active' : ''}
              onClick={() => showView('all')}
            >
              전체 전시
              {!isLoading && <span>{exhibitions.length}</span>}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === 'favorites'}
              className={view === 'favorites' ? 'is-active' : ''}
              onClick={() => showView('favorites')}
            >
              찜한 전시
              <span>{favorites.length}</span>
            </button>
          </div>

          <div className="filter-bar">
            <div className="filter-chips" aria-label="전시 상태">
              {STATUS_FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={filters.status === option.key}
                  className={filters.status === option.key ? 'is-active' : ''}
                  onClick={() => updateFilter('status', option.key)}
                >
                  {option.label}
                </button>
              ))}

              <button
                type="button"
                aria-pressed={filters.weekendOnly}
                className={filters.weekendOnly ? 'is-active' : ''}
                onClick={() =>
                  updateFilter('weekendOnly', !filters.weekendOnly)
                }
              >
                이번 주말 관람 가능
              </button>
            </div>

            <div className="filter-selects">
              <label className="sr-only" htmlFor="region">지역</label>
              <select
                id="region"
                value={filters.region}
                onChange={(event) =>
                  updateFilter('region', event.target.value)
                }
              >
                <option value="all">전체 지역</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="sort">정렬</label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(event) =>
                  updateFilter('sort', event.target.value)
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isLoading && !error && (
            <p className="result-summary" aria-live="polite">
              <strong>{filteredExhibitions.length}</strong>개의 전시
              {isFiltered && (
                <button type="button" onClick={resetFilters}>
                  필터 초기화
                </button>
              )}
            </p>
          )}

          <div className="exhibition-grid">
            {isLoading && (
              <p className="exhibition-empty">전시 정보를 불러오는 중입니다.</p>
            )}

            {error && (
              <p className="exhibition-empty">{error}</p>
            )}

            {!isLoading &&
              !error &&
              filteredExhibitions.length === 0 && (
                <p className="exhibition-empty">{emptyMessage}</p>
              )}

            {!isLoading &&
              !error &&
              visibleExhibitions.map((exhibition) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                  isFavorite={favoriteIds.has(exhibition.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
          </div>

          {!isLoading &&
            !error &&
            visibleCount < filteredExhibitions.length && (
              <button
                type="button"
                className="load-more-button"
                onClick={() =>
                  setVisibleCount((count) => count + PAGE_SIZE)
                }
              >
                더보기
                <span>
                  {visibleCount} / {filteredExhibitions.length}
                </span>
              </button>
            )}
        </section>
      </main>
    </div>
  )
}

export default App
