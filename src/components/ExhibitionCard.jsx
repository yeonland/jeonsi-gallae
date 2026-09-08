import { getExhibitionStatus } from '../utils/getExhibitionStatus'

function ExhibitionCard({ exhibition }) {
  const status = getExhibitionStatus(
    exhibition.startDate,
    exhibition.endDate
  )

  const formattedPrice =
    exhibition.price == null
      ? '가격 확인'
      : exhibition.price === 0
        ? '무료'
        : `${exhibition.price.toLocaleString()}원`

  return (
    <article className="exhibition-card">
      <div className="exhibition-card-poster">
        {exhibition.thumbnail ? (
          <img
            src={exhibition.thumbnail}
            alt={`${exhibition.title} 포스터`}
          />
        ) : (
          <strong>{exhibition.title}</strong>
        )}
      </div>

      <div className="exhibition-card-content">
        <div className="exhibition-card-top">
          <span className={`status-badge status-badge-${status.key}`}>
            {status.label}
          </span>

          <button
            type="button"
            className="favorite-button"
            aria-label={`${exhibition.title} 찜하기`}
          >
            ♡
          </button>
        </div>

        <h3>{exhibition.title}</h3>

        <p className="exhibition-card-institution">
          {exhibition.institution}
        </p>

        <p className="exhibition-card-date">
          {exhibition.startDate} – {exhibition.endDate}
        </p>

        <div className="exhibition-card-info">
          <span>{exhibition.region}</span>
          <span>{exhibition.category}</span>
          <span>{formattedPrice}</span>
        </div>
      </div>
    </article>
  )
}

export default ExhibitionCard