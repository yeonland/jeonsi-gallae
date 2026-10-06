import { useEffect, useState } from 'react'
import './App.css'
import ExhibitionCard from './components/ExhibitionCard'
import {
  getCultureExhibitions,
  getExhibitionPrices,
} from './api/cultureApi'
import { useFavorites } from './hooks/useFavorites'
import {
  SORT_OPTIONS,
  QUICK_FILTERS,
  filterExhibitions,
  getExhibitionDistance,
  getQuickFilterConditions,
  getRegions,
  getTodayString,
} from './utils/exhibitionFilters'

const PAGE_SIZE = 12

const INITIAL_FILTERS = {
  keyword: '',
  quick: 'all',
  region: 'all',
  visitDate: '',
  sort: 'recommended',
}

function App() {
  const [exhibitions, setExhibitions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [prices, setPrices] = useState({})
  const [priceProgress, setPriceProgress] = useState(null)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [view, setView] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
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

  // 목록을 먼저 보여주고, 관람료는 뒤에서 이어서 받아 합친다
  useEffect(() => {
    const controller = new AbortController()

    getExhibitionPrices((pagePrices, progress) => {
      setPrices((current) => ({ ...current, ...pagePrices }))
      setPriceProgress(progress)
    }, controller.signal).catch((error) => {
      if (error.name !== 'AbortError') {
        console.error(error)
        setPriceProgress({ failed: true })
      }
    })

    return () => controller.abort()
  }, [])

  const isPriceLoading =
    !priceProgress ||
    (!priceProgress.failed &&
      priceProgress.page < priceProgress.totalPages)

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }))
    setVisibleCount(PAGE_SIZE)
  }

  // 가까운 순을 고를 때만 위치 권한을 요청한다
  function requestLocation() {
    if (location) return

    if (!navigator.geolocation) {
      setLocationStatus('unsupported')
      return
    }

    setLocationStatus('loading')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationStatus('ready')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
  }

  function changeSort(nextSort) {
    updateFilter('sort', nextSort)

    if (nextSort === 'distance') requestLocation()
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

  const withPrice = (exhibition) =>
    exhibition.id in prices
      ? { ...exhibition, price: prices[exhibition.id] }
      : exhibition

  const baseList = (view === 'favorites' ? favorites : exhibitions).map(
    withPrice
  )

  // 찜 목록은 종료된 전시도 남겨 두고, 나머지 조건만 적용
  const quickConditions = getQuickFilterConditions(filters.quick)

  const filteredExhibitions = filterExhibitions(baseList, {
    ...filters,
    ...quickConditions,
    status:
      view === 'favorites' && quickConditions.status === 'all'
        ? 'any'
        : quickConditions.status,
    favorites,
    location,
  })

  const isDistanceSort = filters.sort === 'distance' && Boolean(location)

  const locationMessage = {
    loading: '현재 위치를 확인하는 중이에요',
    denied: '위치 권한이 없어 거리순으로 정렬할 수 없어요. 브라우저에서 위치 권한을 허용해 주세요',
    unsupported: '이 브라우저는 위치 정보를 지원하지 않아요',
  }[locationStatus]

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
            onSubmit={(event) => {
              // 검색은 입력하는 대로 바로 반영되므로, 버튼은 결과 목록으로 이동시킨다
              event.preventDefault()
              showView('all')
              document
                .getElementById('exhibitions')
                ?.scrollIntoView({ behavior: 'smooth' })
            }}
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
            <div
              className="filter-chips"
              role="radiogroup"
              aria-label="빠른 필터"
            >
              {QUICK_FILTERS.map((option) => {
                const isActive = filters.quick === option.key

                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={isActive ? 'is-active' : ''}
                    // 선택된 칩을 다시 누르면 전체로 돌아간다
                    onClick={() =>
                      updateFilter('quick', isActive ? 'all' : option.key)
                    }
                  >
                    {option.label}
                    {option.key === 'free' && isPriceLoading && (
                      <span className="chip-note">
                        {priceProgress
                          ? `확인 중 ${priceProgress.page}/${priceProgress.totalPages}`
                          : '확인 중'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="filter-selects">
              <div className="date-field">
                <label htmlFor="visit-date">관람일</label>
                <input
                  id="visit-date"
                  type="date"
                  min={getTodayString()}
                  value={filters.visitDate}
                  onChange={(event) =>
                    updateFilter('visitDate', event.target.value)
                  }
                />
                {filters.visitDate && (
                  <button
                    type="button"
                    className="date-clear"
                    aria-label="관람일 선택 해제"
                    onClick={() => updateFilter('visitDate', '')}
                  >
                    ×
                  </button>
                )}
              </div>

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
                  changeSort(event.target.value)
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
              {filters.quick === 'free' && isPriceLoading && (
                <span className="result-note">
                  관람료를 확인하는 중이라 결과가 늘어날 수 있어요
                </span>
              )}
              {filters.quick === 'free' && priceProgress?.failed && (
                <span className="result-note">
                  관람료 정보를 일부 불러오지 못했어요
                </span>
              )}
              {filters.sort === 'distance' && locationMessage && (
                <span className="result-note">{locationMessage}</span>
              )}
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
                  distance={
                    isDistanceSort
                      ? getExhibitionDistance(exhibition, location)
                      : null
                  }
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
