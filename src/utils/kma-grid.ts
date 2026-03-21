export interface KmaStation {
  id: string;
  nx: number;
  ny: number;
  name: string;
  lat: number;
  lng: number;
}

// Pre-defined stations at key forest monitoring locations across Korea
export const KMA_STATIONS: KmaStation[] = [
  { id: 'seoul',    nx: 60,  ny: 127, name: '서울', lat: 37.5665, lng: 126.9780 },
  { id: 'chuncheon', nx: 73, ny: 134, name: '춘천', lat: 37.8813, lng: 127.7298 },
  { id: 'daegu',    nx: 89,  ny: 90,  name: '대구', lat: 35.8714, lng: 128.6014 },
  { id: 'ulsan',    nx: 98,  ny: 76,  name: '울산', lat: 35.5384, lng: 129.3114 },
  { id: 'jeju',     nx: 52,  ny: 38,  name: '제주', lat: 33.4996, lng: 126.5312 },
  { id: 'daejeon',  nx: 67,  ny: 100, name: '대전', lat: 36.3504, lng: 127.3845 },
  { id: 'gwangju',  nx: 58,  ny: 74,  name: '광주', lat: 35.1595, lng: 126.8526 },
  { id: 'pohang',   nx: 102, ny: 84,  name: '포항', lat: 36.0190, lng: 129.3435 },
  { id: 'chungju',  nx: 69,  ny: 107, name: '충주', lat: 36.9910, lng: 127.9259 },
  { id: 'changwon', nx: 82,  ny: 71,  name: '창원', lat: 35.2280, lng: 128.6811 },
  { id: 'incheon',  nx: 55,  ny: 124, name: '인천', lat: 37.4563, lng: 126.7052 },
  { id: 'gangneung', nx: 92, ny: 131, name: '강릉', lat: 37.7519, lng: 128.8761 },
  { id: 'jeonju',   nx: 63,  ny: 89,  name: '전주', lat: 35.8242, lng: 127.1480 },
  { id: 'mokpo',    nx: 50,  ny: 67,  name: '목포', lat: 34.8118, lng: 126.3922 },
  { id: 'andong',   nx: 85,  ny: 99,  name: '안동', lat: 36.5684, lng: 128.7294 },
  { id: 'suwon',    nx: 71,  ny: 121, name: '수원', lat: 37.2636, lng: 127.0286 },
  { id: 'icheon',   nx: 74,  ny: 115, name: '이천', lat: 37.2720, lng: 127.4350 },
  { id: 'wonju',    nx: 84,  ny: 123, name: '원주', lat: 37.3422, lng: 127.9202 },
  { id: 'suncheon', nx: 56,  ny: 50,  name: '순천', lat: 34.9506, lng: 127.4872 },
  { id: 'miryang',  nx: 80,  ny: 75,  name: '밀양', lat: 35.5037, lng: 128.7464 },
];
