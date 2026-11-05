const $ = (s) => document.querySelector(s);
let toilets = [];
const status = (message) => { $('#status').textContent = message; };
const rad = (n) => n * Math.PI / 180;
function distance(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function navUrl(t) {
  const q = encodeURIComponent(t.name + ' ' + (t.address || ''));
  return `https://map.naver.com/p/search/${q}`;
}
function show(items) {
  $('#count').textContent = `${items.length}곳`;
  if (!items.length) {
    $('#results').innerHTML = '<div class="empty">이 반경 안에 좌표가 확인된 화장실이 없습니다.<br>반경을 넓히거나 좌표 변환 결과를 확인해 주세요.</div>';
    return;
  }
  $('#results').innerHTML = items.map(({t, meters}) => {
    const dist = meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
    const hours = [t.hours, t.hoursDetail].filter(Boolean).join(' · ') || '운영시간 정보 없음';
    const access = [t.disabledMen ? `남성 장애인용 대변기 ${esc(t.disabledMen)}개` : '', t.disabledWomen ? `여성 장애인용 대변기 ${esc(t.disabledWomen)}개` : '', t.emergencyBell === 'Y' ? `비상벨 ${esc(t.emergencyBellPlace || '설치')}` : ''].filter(Boolean);
    const diaper = t.diaper === 'Y' ? '기저귀 교환대 있음' : t.diaper === 'N' ? '기저귀 교환대 없음' : '';
    return `<article class="card"><div class="card-top"><h3 class="name">${esc(t.name)}</h3><span class="distance">${dist}</span></div><div class="meta"><span class="tag">${esc(t.category || '분류 미상')}</span>${access.map(a => `<span class="tag">${a}</span>`).join('')}${diaper ? `<span class="tag">${diaper}</span>` : ''}</div><p class="detail">${esc(t.address || '주소 정보 없음')}</p><p class="detail">운영 ${esc(hours)}</p>${t.phone ? `<p class="detail">전화 ${esc(t.phone)}</p>` : ''}${t.manager ? `<p class="detail">관리 ${esc(t.manager)}</p>` : ''}<div class="actions"><a class="nav" href="${navUrl(t)}" target="_blank" rel="noopener">네이버 지도에서 찾기 ↗</a></div></article>`;
  }).join('');
}
async function loadData() {
  try {
    const response = await fetch('./data/toilets.json');
    if (!response.ok) throw new Error('data/toilets.json이 아직 없습니다.');
    toilets = await response.json();
    const located = toilets.filter(t => Number.isFinite(t.lat) && Number.isFinite(t.lon)).length;
    status(located ? `전체 ${toilets.length.toLocaleString()}건 중 좌표가 있는 ${located.toLocaleString()}건을 검색합니다.` : `전체 ${toilets.length.toLocaleString()}건을 불러왔어요. 주소 좌표 변환 후 주변 검색이 가능합니다.`);
  } catch (error) {
    status('데이터 파일이 없습니다. README의 prepare_data.py 절차를 먼저 실행해 주세요.');
  }
}
$('#find').addEventListener('click', () => {
  if (!toilets.length) { status('먼저 prepare_data.py로 화장실 데이터 파일을 만들어 주세요.'); return; }
  const available = toilets.filter(t => Number.isFinite(t.lat) && Number.isFinite(t.lon));
  if (!available.length) { status('이 데이터에는 아직 좌표가 없습니다. prepare_data.py를 Kakao Local API 키와 함께 실행해 주소를 좌표로 변환해 주세요.'); return; }
  if (!navigator.geolocation) { status('이 브라우저에서 위치 확인 기능을 사용할 수 없습니다.'); return; }
  status('현재 위치를 확인하고 있어요. 위치 권한을 허용해 주세요.');
  navigator.geolocation.getCurrentPosition(({coords}) => {
    const here = {lat: coords.latitude, lon: coords.longitude};
    const radius = Number($('#radius').value);
    const found = available.map(t => ({t, meters: distance(here, t)})).filter(x => x.meters <= radius).sort((a,b) => a.meters-b.meters);
    status(`반경 ${(radius >= 1000 ? `${radius/1000} km` : `${radius} m`)} · 가까운 순 · 직선거리`);
    show(found);
  }, error => {
    status(error.code === 1 ? '위치 권한이 거부됐어요. 브라우저 설정에서 위치 접근을 허용해 주세요.' : '위치를 확인하지 못했어요. GPS와 HTTPS 연결을 확인한 뒤 다시 시도해 주세요.');
  }, {enableHighAccuracy:true, timeout:15000, maximumAge:60000});
});
loadData();
