import { getExhibitionStatus } from '../utils/getExhibitionStatus'
import { getDaysLeft, getPriceLabel } from '../utils/exhibitionFilters'

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`

  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`
}

function ExhibitionCard({
  exhibition,
  isFavorite,
  onToggleFavorite,
  distance = null,
}) {
  const status = getExhibitionStatus(
    exhibition.startDate,
    exhibition.endDate
  )

  const daysLeft = getDaysLeft(exhibition.endDate)
  const priceLabel = getPriceLabel(exhibition)

  const linkUrl =
    `/api/culture-link?seq=${encodeURIComponent(exhibition.id)}` +
    `&title=${encodeURIComponent(exhibition.title)}`

  return (
    <article className="exhibition-card">
      <a
        className="exhibition-card-poster"
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${exhibition.title} 상세 페이지 열기 (새 창)`}
      >
        {exhibition.thumbnail ? (
          <img
            src={exhibition.thumbnail}
            alt=""
            loading="lazy"
          />
        ) : (
          <strong>{exhibition.title}</strong>
        )}
      </a>

      <div className="exhibition-card-content">
        <div className="exhibition-card-top">
          <div className="exhibition-card-badges">
            <span className={`status-badge status-badge-${status.key}`}>
              {status.label}
            </span>

            {status.key === 'ongoing' && daysLeft <= 14 && (
              <span className="status-badge status-badge-closing">
                {daysLeft === 0 ? '오늘 종료' : `D-${daysLeft}`}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`favorite-button${isFavorite ? ' is-active' : ''}`}
            aria-label={`${exhibition.title} ${isFavorite ? '찜 해제' : '찜하기'}`}
            aria-pressed={isFavorite}
            onClick={() => onToggleFavorite(exhibition)}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        </div>

        <h3>
          <a href={linkUrl} target="_blank" rel="noopener noreferrer">
            {exhibition.title}
          </a>
        </h3>

        <p className="exhibition-card-institution">
          {exhibition.institution}
        </p>

        <p className="exhibition-card-date">
          {exhibition.startDate} – {exhibition.endDate}
        </p>

        <div className="exhibition-card-info">
          {distance !== null && (
            <span className="distance">{formatDistance(distance)}</span>
          )}
          <span>{exhibition.region}</span>
          {exhibition.sigungu && <span>{exhibition.sigungu}</span>}
          {priceLabel && (
            <span
              className={priceLabel === '무료' ? 'price-free' : ''}
              title={exhibition.price || undefined}
            >
              {priceLabel}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export default ExhibitionCard
