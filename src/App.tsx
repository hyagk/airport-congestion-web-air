import { useEffect, useState } from 'react'
import './App.css'
import CongestionChart from './CongestionChart'
import type { PassengerForecast } from './types'

const API_URL = 'https://apis.data.go.kr/B551177/passgrAnncmt/getPassgrAnncmt'
const API_KEY = import.meta.env.VITE_API_KEY

// 실제 응답은 문서와 달리 response로 감싸져 있고 items가 배열임
interface PassengerForecastResponse {
  response: {
    header: { resultCode: string; resultMsg: string }
    body: {
      items: PassengerForecast[]
      numOfRows: number
      pageNo: number
      totalCount: number
    }
  }
}

// selectdate: 오늘 = 0, 내일 = 1
async function fetchCongestion(selectdate: 0 | 1 = 0): Promise<PassengerForecast[]> {
  if (!API_KEY) {
    throw new Error('VITE_API_KEY가 설정되지 않았습니다. .env.local 파일을 확인하세요.')
  }

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    selectdate: String(selectdate),
    type: 'json',
    numOfRows: '100',
    pageNo: '1',
  })

  const res = await fetch(`${API_URL}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data: PassengerForecastResponse = await res.json()
  const { header, body } = data.response
  if (header.resultCode !== '00') {
    throw new Error(`API 오류 ${header.resultCode}: ${header.resultMsg}`)
  }
  return body.items
}

function App() {
  const [items, setItems] = useState<PassengerForecast[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCongestion(0)
      .then((result) => {
        setItems(result)
      })
      .catch((err) => {
        console.error(err)
        setError(String(err))
      })
  }, [])

  return (
    <main>
      <h1>공항 혼잡도</h1>
      {error && <p className="status error">{error}</p>}
      {!error && items.length === 0 && <p className="status">불러오는 중...</p>}
      {items.length > 0 && <CongestionChart items={items} />}
    </main>
  )
}

export default App
