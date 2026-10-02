import { useState, useSyncExternalStore } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PassengerForecast } from './types'

type Direction = 'departure' | 'arrival'
type Terminal = 't1' | 't2'
type Field = keyof PassengerForecast

interface TerminalFields {
  sum: Field
  gates: [Field, string][]
}

// 방향(출국/입국)별로 어떤 필드를 합계·상세로 보여줄지 정의
const FIELDS: Record<Direction, { label: string } & Record<Terminal, TerminalFields>> = {
  departure: {
    label: '출국',
    t1: {
      sum: 't1dgsum1',
      gates: [
        ['t1dg1', '출국장 1'],
        ['t1dg2', '출국장 2'],
        ['t1dg3', '출국장 3'],
        ['t1dg4', '출국장 4'],
        ['t1dg5', '출국장 5'],
        ['t1dg6', '출국장 6'],
      ],
    },
    t2: {
      sum: 't2dgsum2',
      gates: [
        ['t2dg1', '출국장 1'],
        ['t2dg2', '출국장 2'],
      ],
    },
  },
  arrival: {
    label: '입국',
    t1: {
      sum: 't1egsum1',
      gates: [
        ['t1eg1', '입국장 동편(A,B)'],
        ['t1eg2', '입국장 서편(E,F)'],
        ['t1eg3', '입국심사(C)'],
        ['t1eg4', '입국심사(D)'],
      ],
    },
    t2: {
      sum: 't2egsum1',
      gates: [
        ['t2eg1', '입국장 1'],
        ['t2eg2', '입국장 2'],
      ],
    },
  },
}

const TERMINAL_NAME: Record<Terminal, string> = { t1: '제1터미널', t2: '제2터미널' }

// Recharts는 SVG 속성으로 색을 넣기 때문에 CSS 변수 대신 모드별 hex를 직접 넘긴다
const THEME = {
  light: {
    t1: '#2a78d6',
    t2: '#eb6834',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    muted: '#898781',
    ink: '#0b0b0b',
    surface: '#fcfcfb',
    cursor: 'rgba(11, 11, 11, 0.05)',
  },
  dark: {
    t1: '#3987e5',
    t2: '#d95926',
    grid: '#2c2c2a',
    axis: '#383835',
    muted: '#898781',
    ink: '#ffffff',
    surface: '#1a1a19',
    cursor: 'rgba(255, 255, 255, 0.06)',
  },
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function useIsDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      darkQuery.addEventListener('change', onChange)
      return () => darkQuery.removeEventListener('change', onChange)
    },
    () => darkQuery.matches,
  )
}

// "237.0" → 237 (빈 값이나 이상한 값은 0)
function toNum(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

const fmt = (n: number) => n.toLocaleString('ko-KR')

// "08_09" → "08–09시"
function formatSlot(atime: string): string {
  const [from, to] = atime.split('_')
  return to ? `${from}–${to}시` : atime
}

// "20261001" → "2026.10.01"
function formatDate(adate: string): string {
  return adate.length === 8 ? `${adate.slice(0, 4)}.${adate.slice(4, 6)}.${adate.slice(6)}` : adate
}

function todayYmd(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

export default function CongestionChart({ items }: { items: PassengerForecast[] }) {
  const [direction, setDirection] = useState<Direction>('departure')
  const [picked, setPicked] = useState<string | null>(null)
  const color = THEME[useIsDark() ? 'dark' : 'light']

  // "00_01" 형태의 시간대 행만 사용 (API 마지막에 오는 "합계" 행 제외)
  const slots = items.filter((item) => /^\d{2}_\d{2}$/.test(item.atime))
  const fields = FIELDS[direction]

  const rows = slots.map((item) => ({
    atime: item.atime,
    t1: toNum(item[fields.t1.sum]),
    t2: toNum(item[fields.t2.sum]),
  }))

  if (rows.length === 0) {
    return <p className="status">표시할 시간대 데이터가 없습니다.</p>
  }

  const totalT1 = rows.reduce((sum, r) => sum + r.t1, 0)
  const totalT2 = rows.reduce((sum, r) => sum + r.t2, 0)
  const peak = rows.reduce((best, r) => (r.t1 + r.t2 > best.t1 + best.t2 ? r : best))

  // 선택 안 했으면 오늘 데이터는 현재 시간대, 아니면 가장 붐비는 시간대를 보여줌
  const isToday = slots[0].adate === todayYmd()
  const nowSlot = isToday
    ? slots.find((s) => s.atime.startsWith(String(new Date().getHours()).padStart(2, '0')))?.atime
    : undefined
  const selected = slots.find((s) => s.atime === (picked ?? nowSlot ?? peak.atime)) ?? slots[0]

  const gateRows = (['t1', 't2'] as const).flatMap((term) =>
    fields[term].gates.map(([field, label]) => ({
      name: `${term.toUpperCase()} ${label}`,
      value: toNum(selected[field]),
      terminal: term,
    })),
  )

  const tooltipStyle = {
    contentStyle: {
      background: color.surface,
      border: `1px solid ${color.grid}`,
      borderRadius: 8,
      fontSize: 13,
    },
    labelStyle: { color: color.ink, fontWeight: 600, marginBottom: 4 },
    itemStyle: { color: color.ink, padding: 0 },
  }

  return (
    <section className="board">
      <header className="board-head">
        <p className="board-date">{formatDate(slots[0].adate)} 시간대별 예상 승객 수</p>
        <div className="segmented" role="tablist" aria-label="출국/입국 선택">
          {(Object.keys(FIELDS) as Direction[]).map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={direction === d}
              className={direction === d ? 'active' : ''}
              onClick={() => setDirection(d)}
            >
              {FIELDS[d].label}
            </button>
          ))}
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">T1 {fields.label} 합계</span>
          <span className="stat-value">{fmt(totalT1)}명</span>
        </div>
        <div className="stat">
          <span className="stat-label">T2 {fields.label} 합계</span>
          <span className="stat-value">{fmt(totalT2)}명</span>
        </div>
        <div className="stat">
          <span className="stat-label">가장 붐비는 시간</span>
          <span className="stat-value">{formatSlot(peak.atime)}</span>
        </div>
      </div>

      <div className="charts">
        <figure className="chart-card">
          <figcaption>
            <h2>시간대별 {fields.label} 승객</h2>
            <span className="hint">막대를 누르면 구역별 내역을 볼 수 있어요</span>
          </figcaption>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={rows}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              barGap={2}
              onClick={(state) => {
                if (typeof state.activeLabel === 'string') setPicked(state.activeLabel)
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid vertical={false} stroke={color.grid} />
              <XAxis
                dataKey="atime"
                tickFormatter={(v: string) => v.slice(0, 2)}
                tick={{ fill: color.muted, fontSize: 12 }}
                axisLine={{ stroke: color.axis }}
                tickLine={false}
                minTickGap={4}
              />
              <YAxis
                tickFormatter={fmt}
                tick={{ fill: color.muted, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                {...tooltipStyle}
                cursor={{ fill: color.cursor }}
                labelFormatter={(v) => formatSlot(String(v))}
                formatter={(v) => `${fmt(Number(v))}명`}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconType="square"
                iconSize={10}
                formatter={(v: string) => <span className="legend-text">{v}</span>}
              />
              {(['t1', 't2'] as const).map((term) => (
                <Bar
                  key={term}
                  dataKey={term}
                  name={TERMINAL_NAME[term]}
                  fill={color[term]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={14}
                  isAnimationActive={false}
                >
                  {rows.map((r) => (
                    <Cell key={r.atime} fillOpacity={r.atime === selected.atime ? 1 : 0.45} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </figure>

        <figure className="chart-card">
          <figcaption>
            <h2>
              {formatSlot(selected.atime)} 구역별 {fields.label} 승객
              {selected.atime === nowSlot && <em className="tag now">지금</em>}
              {selected.atime === peak.atime && <em className="tag peak">최대</em>}
            </h2>
          </figcaption>
          {/* 데스크톱에선 옆 차트 높이만큼 늘어나고, 모바일에선 행 수에 맞춘 높이 */}
          <div className="chart-fill" style={{ minHeight: gateRows.length * 32 + 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gateRows} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={128}
                  tick={{ fill: color.muted, fontSize: 12 }}
                  axisLine={{ stroke: color.axis }}
                  tickLine={false}
                />
                <Tooltip
                  {...tooltipStyle}
                  cursor={{ fill: color.cursor }}
                  formatter={(v) => [`${fmt(Number(v))}명`, '예상 승객']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
                  {gateRows.map((g) => (
                    <Cell key={g.name} fill={color[g.terminal]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v) => `${fmt(Number(v))}명`}
                    fill={color.ink}
                    fontSize={13}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </div>

      <details className="table-view">
        <summary>표로 보기</summary>
        <table>
          <thead>
            <tr>
              <th>시간대</th>
              <th>T1 {fields.label}</th>
              <th>T2 {fields.label}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.atime}>
                <td>{formatSlot(r.atime)}</td>
                <td>{fmt(r.t1)}</td>
                <td>{fmt(r.t2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
