// 시간대별 예상 승객 수 (값은 "237.0" 같은 문자열로 옴)
export interface PassengerForecast {
  adate: string // 표출일자 (YYYYMMDD)
  atime: string // 시간대 (예: "00_01")
  t1eg1: string // T1 입국장 동편(A,B)
  t1eg2: string // T1 입국장 서편(E,F)
  t1eg3: string // T1 입국심사(C)
  t1eg4: string // T1 입국심사(D)
  t1egsum1: string // T1 입국장 합계
  t1dg1: string // T1 출국장1
  t1dg2: string // T1 출국장2
  t1dg3: string // T1 출국장3
  t1dg4: string // T1 출국장4
  t1dg5: string // T1 출국장5
  t1dg6: string // T1 출국장6
  t1dgsum1: string // T1 출국장 합계
  t2eg1: string // T2 입국장1
  t2eg2: string // T2 입국장2
  t2egsum1: string // T2 입국장 합계
  t2dg1: string // T2 출국장1
  t2dg2: string // T2 출국장2
  t2dgsum2: string // T2 출국장 합계
}
