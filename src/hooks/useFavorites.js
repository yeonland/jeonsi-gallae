import { useEffect, useState } from 'react'

const STORAGE_KEY = 'jeonsi-gallae:favorites'

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))

    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

// 찜한 전시는 API 목록에서 빠져도 보이도록 전시 정보째 저장한다
export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavorites)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // 저장소를 쓸 수 없는 환경에서는 새로고침 전까지만 유지
    }
  }, [favorites])

  const favoriteIds = new Set(favorites.map((exhibition) => exhibition.id))

  function toggleFavorite(exhibition) {
    setFavorites((current) =>
      current.some((item) => item.id === exhibition.id)
        ? current.filter((item) => item.id !== exhibition.id)
        : [exhibition, ...current]
    )
  }

  return { favorites, favoriteIds, toggleFavorite }
}
