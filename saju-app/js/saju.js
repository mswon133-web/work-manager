/*
 * Saju (사주팔자) calculation + interpretation content.
 * All astronomical/calendar math is delegated to vendor/lunar.js (6tail/lunar-javascript, MIT).
 * This file only reads numeric gan/zhi indices from that engine and renders
 * Korean text on top — no calendar math of its own.
 */
(function (global) {
  'use strict';

  var GAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  var GAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  var ZHI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ZHI_ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

  // 0=목 1=화 2=토 3=금 4=수
  var GAN_OHENG = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  var ZHI_OHENG = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  var OHENG = ['목', '화', '토', '금', '수'];
  var OHENG_HANJA = ['木', '火', '土', '金', '水'];
  var OHENG_COLOR = ['#008300', '#e34948', '#eda100', '#e87ba4', '#2a78d6'];
  var OHENG_COLOR_DARK = ['#008300', '#e66767', '#c98500', '#d55181', '#3987e5'];

  var TEN_GOD = {
    0: ['비견', '겁재'],
    1: ['식신', '상관'],
    2: ['편재', '정재'],
    3: ['편관', '정관'],
    4: ['편인', '정인']
  };

  function ganYY(idx) { return idx % 2 === 0 ? 0 : 1; } // 0=양 1=음
  function zhiYY(idx) { return idx % 2 === 0 ? 0 : 1; }

  var TEN_GOD_GROUP = ['비겁', '식상', '재성', '관성', '인성'];

  // 음양 구분 없이 오행 상생상극 관계만으로 묶은 5분류 (지지 궁위 해석용)
  function tenGodGroupOf(dayGanIdx, targetOhengIdx) {
    var d = GAN_OHENG[dayGanIdx];
    var diff = (targetOhengIdx - d + 5) % 5;
    return TEN_GOD_GROUP[diff];
  }

  function tenGodOf(dayGanIdx, targetGanIdx) {
    var d = GAN_OHENG[dayGanIdx], t = GAN_OHENG[targetGanIdx];
    var diff = (t - d + 5) % 5;
    var sameYY = ganYY(dayGanIdx) === ganYY(targetGanIdx);
    if (diff === 0) return sameYY ? '비견' : '겁재';
    return TEN_GOD[diff][sameYY ? 0 : 1];
  }

  // ---- engine glue -----------------------------------------------------
  function computeChart(input) {
    // input: {y,m,d,hour,minute,calendar:'solar'|'lunar',isLeapMonth,timeUnknown,gender}
    var Solar = global.Solar, Lunar = global.Lunar;
    var lunar;
    var hour = input.timeUnknown ? 12 : input.hour;
    var minute = input.timeUnknown ? 0 : input.minute;

    if (input.calendar === 'lunar') {
      var lm = input.isLeapMonth ? -input.m : input.m;
      lunar = Lunar.fromYmdHms(input.y, lm, input.d, hour, minute, 0);
    } else {
      var solar = Solar.fromYmdHms(input.y, input.m, input.d, hour, minute, 0);
      lunar = solar.getLunar();
    }

    var eightChar = lunar.getEightChar();
    var pillars = {
      year: { gan: lunar.getYearGanIndexExact(), zhi: lunar.getYearZhiIndexExact() },
      month: { gan: lunar.getMonthGanIndexExact(), zhi: lunar.getMonthZhiIndexExact() },
      day: { gan: eightChar.getDayGanIndex(), zhi: eightChar.getDayZhiIndex() },
      time: input.timeUnknown ? null : { gan: lunar.getTimeGanIndex(), zhi: lunar.getTimeZhiIndex() }
    };

    var chars = [pillars.year, pillars.month, pillars.day];
    if (pillars.time) chars.push(pillars.time);

    var ohengCount = [0, 0, 0, 0, 0];
    var yinCount = 0, yangCount = 0;
    chars.forEach(function (p) {
      ohengCount[GAN_OHENG[p.gan]]++;
      ohengCount[ZHI_OHENG[p.zhi]]++;
      ganYY(p.gan) === 0 ? yangCount++ : yinCount++;
      zhiYY(p.zhi) === 0 ? yangCount++ : yinCount++;
    });

    var tenGods = {
      year: tenGodOf(pillars.day.gan, pillars.year.gan),
      month: tenGodOf(pillars.day.gan, pillars.month.gan),
      time: pillars.time ? tenGodOf(pillars.day.gan, pillars.time.gan) : null
    };

    return {
      pillars: pillars,
      ohengCount: ohengCount,
      yinYang: { yin: yinCount, yang: yangCount },
      tenGods: tenGods,
      lunarYmd: { y: lunar.getYear(), m: lunar.getMonth(), d: lunar.getDay() },
      solarYmd: { y: lunar.getSolar().getYear(), m: lunar.getSolar().getMonth(), d: lunar.getSolar().getDay() }
    };
  }

  function pillarLabel(p) {
    if (!p) return { han: '-', ko: '-' };
    return {
      han: GAN_HANJA[p.gan] + ZHI_HANJA[p.zhi],
      ko: GAN[p.gan] + ZHI[p.zhi]
    };
  }

  // ---- content ------------------------------------------------------------
  var DAY_GAN_SHORT = [
    '큰 나무처럼 곧고 리더십이 강한', '유연한 화초처럼 부드럽고 적응력이 좋은',
    '태양처럼 밝고 표현력이 풍부한', '촛불처럼 섬세하고 온화한',
    '큰 산처럼 묵직하고 신뢰감을 주는', '기름진 땅처럼 포용력 있고 실속을 챙기는',
    '무쇠처럼 결단력 있고 원칙적인', '보석처럼 예리하고 섬세한',
    '큰 바다처럼 스케일이 크고 포용력이 있는', '이슬비처럼 유연하고 눈치가 빠른'
  ];

  var DAY_GAN_LONG = [
    '갑목(甲木) 일간은 곧게 뻗은 큰 나무의 기운을 타고났습니다. 자존심이 강하고 앞장서기를 좋아하며, 한번 정한 방향은 쉽게 굽히지 않는 뚝심이 있습니다. 다만 융통성이 부족해 보일 때가 있으니 주변의 의견에 귀 기울이는 연습이 도움이 됩니다.',
    '을목(乙木) 일간은 바람에 흔들려도 꺾이지 않는 화초·넝쿨의 기운입니다. 눈치가 빠르고 처세에 능하며 어떤 환경에서도 살아남는 생존력이 강점입니다. 다만 결정적인 순간에 우유부단해지지 않도록 중심을 잡는 연습이 필요합니다.',
    '병화(丙火) 일간은 온 세상을 비추는 태양의 기운입니다. 밝고 적극적이며 사람을 끌어당기는 매력이 있어 어디서나 주목받습니다. 다만 감정 기복이 크고 쉽게 열정이 식을 수 있어 꾸준함을 기르는 것이 관건입니다.',
    '정화(丁火) 일간은 은은하게 오래 타는 촛불·등불의 기운입니다. 섬세하고 배려심이 깊으며 예술적 감각이 뛰어난 편입니다. 다만 속으로 삭이는 성향이 있어 스트레스를 쌓아두지 않도록 표현하는 습관이 필요합니다.',
    '무토(戊土) 일간은 흔들리지 않는 큰 산의 기운입니다. 믿음직하고 책임감이 강해 주변에서 의지하는 존재가 되지만, 고집이 세고 변화를 받아들이는 데 시간이 걸리는 편입니다. 새로운 시도를 두려워하지 않는 유연함이 성장의 열쇠입니다.',
    '기토(己土) 일간은 만물을 길러내는 옥토·논밭의 기운입니다. 온화하고 포용력이 있으며 실속을 잘 챙기는 현실 감각의 소유자입니다. 다만 지나치게 신중해 기회를 놓칠 수 있으니 과감한 결단이 필요할 때가 있습니다.',
    '경금(庚金) 일간은 제련되지 않은 무쇠·바위의 기운입니다. 의리 있고 추진력이 강하며 옳다고 생각하면 밀어붙이는 힘이 있습니다. 다만 표현이 직설적이라 오해를 살 수 있어 말을 다듬는 노력이 관계에 도움이 됩니다.',
    '신금(辛金) 일간은 잘 다듬어진 보석·장신구의 기운입니다. 예리한 감각과 완벽주의 성향으로 디테일에 강하지만, 예민하고 자존심이 강해 작은 것에도 상처받기 쉽습니다. 스스로에게 너그러워지는 연습이 필요합니다.',
    '임수(壬水) 일간은 거침없이 흐르는 큰 강·바다의 기운입니다. 사고가 유연하고 스케일이 크며 새로운 것을 받아들이는 포용력이 뛰어납니다. 다만 마음이 자주 바뀌고 산만해질 수 있어 한 가지에 집중하는 힘을 기르면 좋습니다.',
    '계수(癸水) 일간은 만물을 적시는 이슬비·샘물의 기운입니다. 감수성이 풍부하고 눈치가 빠르며 사람 마음을 잘 헤아립니다. 다만 여리고 소심해지기 쉬우니 자신의 의견을 당당히 말하는 훈련이 도움이 됩니다.'
  ];

  var OHENG_STRONG_DESC = [
    '목(木)의 기운이 강해 성장과 확장을 추구하는 진취적인 에너지가 넘칩니다. 새로운 일을 벌이는 추진력은 강점이지만, 한 가지를 끝까지 마무리하는 끈기를 함께 기르면 좋습니다.',
    '화(火)의 기운이 강해 표현력이 풍부하고 열정적입니다. 사람들 앞에서 빛나는 재능이 있지만, 감정이 급하게 타올랐다 식지 않도록 페이스 조절이 필요합니다.',
    '토(土)의 기운이 강해 안정감 있고 신뢰를 주는 사람입니다. 중심을 잘 잡지만 지나치면 고집스럽거나 변화에 둔감해질 수 있으니 유연함을 더해보세요.',
    '금(金)의 기운이 강해 원칙적이고 결단력이 뛰어납니다. 옳고 그름이 분명한 것이 강점이지만, 지나치게 날카로우면 주변과 마찰이 생길 수 있어 유연한 태도가 도움이 됩니다.',
    '수(水)의 기운이 강해 사고가 유연하고 지혜롭습니다. 상황 판단이 빠르지만 생각이 너무 많아 결정을 미루는 경향이 있으니 실행력을 보완하면 좋습니다.'
  ];

  var OHENG_WEAK_DESC = [
    '목(木)의 기운이 부족해 결단이나 추진력이 필요한 순간 머뭇거릴 수 있습니다. 계획을 세웠다면 작은 것부터 바로 실행에 옮기는 습관이 도움이 됩니다.',
    '화(火)의 기운이 부족해 자신을 드러내는 데 소극적일 수 있습니다. 표현을 아끼기보다 조금씩 자신의 생각과 감정을 밖으로 꺼내보는 연습이 필요합니다.',
    '토(土)의 기운이 부족해 마음이 쉽게 흔들리거나 계획이 자주 바뀔 수 있습니다. 규칙적인 생활 루틴을 만드는 것이 중심을 잡는 데 도움이 됩니다.',
    '금(金)의 기운이 부족해 결정을 내리거나 맺고 끊는 것을 어려워할 수 있습니다. 기준과 원칙을 미리 정해두면 흔들림 없이 판단하는 데 도움이 됩니다.',
    '수(水)의 기운이 부족해 휴식과 재충전을 놓치기 쉽습니다. 의식적으로 혼자만의 시간을 확보해 에너지를 채우는 습관을 들이면 좋습니다.'
  ];

  var TEN_GOD_CAREER = {
    '비견': '자기 사업이나 전문직처럼 스스로 주도권을 쥐는 일에서 능력을 발휘합니다.',
    '겁재': '동업이나 팀 프로젝트에서 추진력을 발휘하지만, 금전 공동 관리는 신중해야 합니다.',
    '식신': '자신의 재능을 표현하는 창작·기획·요식 분야에서 두각을 나타냅니다.',
    '상관': '틀에 얽매이지 않는 아이디어와 화술이 강점이라 기획·마케팅·방송 계열이 잘 맞습니다.',
    '편재': '기회를 포착하는 감각이 뛰어나 투자, 영업, 유통 등 활동적인 분야에서 성과를 냅니다.',
    '정재': '성실하게 쌓아가는 재무·회계·행정 등 안정적인 분야에서 신뢰를 얻습니다.',
    '편관': '위기 대응력과 추진력이 강해 도전적인 분야나 관리·감독 직무에서 빛을 발합니다.',
    '정관': '체계와 원칙을 따르는 공직·대기업·관리직에서 안정적으로 인정받는 편입니다.',
    '편인': '독특한 전문성이나 연구·기획 분야에서 남다른 통찰력을 발휘합니다.',
    '정인': '가르치거나 돌보는 일, 학문·교육·상담 분야에서 자연스러운 강점을 보입니다.'
  };

  var TEN_GOD_WEALTH = {
    '비견': '스스로 벌어들이는 힘은 있지만 지출도 그만큼 커질 수 있어 계획적인 저축 습관이 중요합니다.',
    '겁재': '주변에 돈이 새어나가기 쉬운 흐름이니 동업·보증·대여는 각별히 신중하게 결정하세요.',
    '식신': '꾸준한 활동을 통해 안정적으로 재물이 들어오는 흐름으로, 여유 있게 재물운이 따르는 편입니다.',
    '상관': '아이디어와 능력으로 큰 수입을 만들 수 있지만 씀씀이도 커질 수 있어 지출 관리가 관건입니다.',
    '편재': '기회를 잘 활용하면 목돈을 만들 가능성이 있지만 그만큼 변동성도 크니 분산 투자로 리스크를 줄이세요.',
    '정재': '차곡차곡 모으는 저축형 재물운으로, 무리한 투자보다 꾸준한 관리가 자산을 키우는 지름길입니다.',
    '편관': '큰돈이 오가는 결정을 내릴 일이 생기지만 스트레스성 지출을 조심할 필요가 있습니다.',
    '정관': '안정적인 소득 기반 위에서 재물이 서서히 쌓이는 편으로, 무리한 확장보다 내실을 다지는 편이 유리합니다.',
    '편인': '갑작스러운 지출이나 예상 밖의 비용이 생길 수 있어 비상금을 넉넉히 마련해두면 좋습니다.',
    '정인': '귀인의 도움이나 뜻밖의 지원으로 재정에 숨통이 트이는 시기가 찾아올 수 있습니다.'
  };

  var TEN_GOD_LOVE_MALE = {
    '비견': '연인을 동등한 친구처럼 대하는 편이라 편안하지만, 배려의 표현을 조금 더 늘리면 좋습니다.',
    '겁재': '애정 표현이 화끈하지만 소유욕이나 경쟁심이 강해질 수 있어 상대의 자유도 존중해 주세요.',
    '식신': '다정하고 자상해 연애에서 편안함을 주는 타입으로, 관계가 안정적으로 오래가는 편입니다.',
    '상관': '매력적이고 표현이 자유분방해 인기가 많지만, 즉흥적인 언행이 오해를 부르지 않도록 주의하세요.',
    '편재': '이성에게 관심이 많고 매력 어필에 능하지만, 여러 인연에 흔들리지 않는 진중함이 필요합니다.',
    '정재': '한 사람에게 정성을 다하는 성실한 스타일로, 결혼과 안정적인 가정을 중요하게 여깁니다.',
    '편관': '강렬하고 주도적인 연애를 하는 편이라 상대를 압도할 수 있으니 부드러움을 더하면 좋습니다.',
    '정관': '책임감 있고 예의 바른 연애 스타일로, 신중하게 관계를 발전시키는 편입니다.',
    '편인': '감성적이고 독특한 매력에 끌리는 편으로, 정신적 교감을 중요하게 여깁니다.',
    '정인': '따뜻하고 헌신적인 사랑을 하는 편이라 상대에게 큰 안정감을 줍니다.'
  };

  var TEN_GOD_LOVE_FEMALE = {
    '비견': '독립적인 연애관을 가지고 있어 상대와 동등한 관계를 추구하는 편입니다.',
    '겁재': '적극적이고 주도적인 연애를 하지만, 지나친 주도권 다툼은 관계에 부담이 될 수 있습니다.',
    '식신': '다정하고 표현이 풍부해 연애에서 행복감을 잘 느끼고 상대에게도 편안함을 줍니다.',
    '상관': '자유분방하고 매력적인 스타일로 인기가 많지만, 구속받는 관계는 답답하게 느낄 수 있습니다.',
    '편재': '활동적인 인간관계 속에서 인연이 자주 생기는 편이라 다양한 만남의 기회가 있습니다.',
    '정재': '실속을 챙기며 안정을 추구하는 연애 스타일로, 결혼을 염두에 둔 진지한 만남을 선호합니다.',
    '편관': '강한 매력을 지닌 상대에게 끌리는 편이며, 연애에서도 확실한 주도권을 원하는 편입니다.',
    '정관': '반듯하고 예의를 갖춘 상대를 선호하며, 결혼과 가정을 중요하게 여기는 안정 지향형입니다.',
    '편인': '독특한 감성과 깊은 대화를 나눌 수 있는 상대에게 끌리는 편입니다.',
    '정인': '자신을 이해하고 품어주는 사람에게 깊은 신뢰와 애정을 느낍니다.'
  };

  var OHENG_HEALTH = [
    '간·담(간장·쓸개) 계통에 해당하는 목(木) 기운이니, 과로와 스트레스로 인한 피로 누적에 유의하고 스트레칭·산책 등으로 몸을 자주 풀어주면 좋습니다.',
    '심장·소장 계통에 해당하는 화(火) 기운이니, 급한 성격으로 인한 긴장과 불면에 유의하고 카페인 섭취를 줄이며 마음을 편히 갖는 습관이 도움이 됩니다.',
    '비장·위장 계통에 해당하는 토(土) 기운이니, 생각이 많아 소화기가 예민해지기 쉬우므로 규칙적인 식사와 충분한 수면을 신경 써주세요.',
    '폐·대장 계통에 해당하는 금(金) 기운이니, 건조한 환경이나 호흡기 관리에 신경 쓰고 스트레스를 안으로만 삭이지 않도록 유의하세요.',
    '신장·방광 계통에 해당하는 수(水) 기운이니, 체력 저하와 만성 피로에 취약할 수 있어 충분한 휴식과 수분 섭취를 챙기는 것이 중요합니다.'
  ];

  function dominantIndex(arr) {
    var maxI = 0;
    for (var i = 1; i < arr.length; i++) if (arr[i] > arr[maxI]) maxI = i;
    return maxI;
  }
  function weakestIndex(arr) {
    var minI = 0;
    for (var i = 1; i < arr.length; i++) if (arr[i] < arr[minI]) minI = i;
    return minI;
  }

  function buildFreeReading(chart) {
    var dayGan = chart.pillars.day.gan;
    var strong = dominantIndex(chart.ohengCount);
    return {
      dayGanShort: DAY_GAN_SHORT[dayGan],
      oneLiner: GAN[dayGan] + '(' + GAN_HANJA[dayGan] + ') 일간, ' + DAY_GAN_SHORT[dayGan] + ' 성향의 소유자입니다. 사주 전체에서는 ' + OHENG[strong] + '(' + OHENG_HANJA[strong] + ') 기운이 가장 두드러집니다.'
    };
  }

  function buildPremiumReading(chart, gender) {
    var dayGan = chart.pillars.day.gan;
    var strong = dominantIndex(chart.ohengCount);
    var weak = weakestIndex(chart.ohengCount);
    var loveTable = gender === 'male' ? TEN_GOD_LOVE_MALE : TEN_GOD_LOVE_FEMALE;
    var monthGod = chart.tenGods.month;
    var yearGod = chart.tenGods.year;

    var personality = DAY_GAN_LONG[dayGan] + ' ' + OHENG_STRONG_DESC[strong] + (chart.ohengCount[weak] === 0 ? ' ' + OHENG_WEAK_DESC[weak] : '');
    var love = loveTable[monthGod] || loveTable[yearGod];
    var career = TEN_GOD_CAREER[monthGod] || TEN_GOD_CAREER[yearGod];
    var wealth = TEN_GOD_WEALTH[yearGod] || TEN_GOD_WEALTH[monthGod];
    var health = OHENG_HEALTH[weak];

    return {
      personality: personality,
      love: love,
      career: career,
      wealth: wealth,
      health: health
    };
  }

  // 2026 병오년(丙午年) 세운 총평 — 일간 대비 십성으로 산출
  function buildYearlyFortune(chart, year) {
    year = year || 2026;
    // 병오년 = 병(2) 오(6). 다른 연도로 확장하려면 아래 표만 넓히면 됨.
    var YEAR_GAN_IDX = { 2025: 4, 2026: 2, 2027: 3, 2028: 4, 2029: 5 };
    var YEAR_ZHI_IDX = { 2025: 5, 2026: 6, 2027: 7, 2028: 8, 2029: 9 };
    var g = YEAR_GAN_IDX[year], z = YEAR_ZHI_IDX[year];
    if (g === undefined) return null;
    var god = tenGodOf(chart.pillars.day.gan, g);
    var TEXT = {
      '비견': '스스로의 힘으로 새로운 시작을 도모하기 좋은 해입니다. 다만 협업보다는 자기 주도적인 계획이 더 잘 맞습니다.',
      '겁재': '경쟁과 변화가 많은 한 해가 될 수 있으니, 동업·보증·대여와 관련된 결정은 신중히 접근하세요.',
      '식신': '그동안 쌓아온 재능이 밖으로 드러나며 성과로 이어지기 좋은 흐름입니다. 여유와 즐거움도 함께 따르는 해입니다.',
      '상관': '새로운 아이디어와 표현력이 빛을 발하는 시기입니다. 다만 말이 앞서 오해를 살 수 있으니 언행에 유의하세요.',
      '편재': '뜻밖의 기회나 활동을 통해 재물이 들어올 가능성이 높은 해입니다. 다만 즉흥적인 지출은 조심하세요.',
      '정재': '꾸준한 노력이 안정적인 결실로 이어지는 해로, 저축과 재테크에 특히 유리한 흐름입니다.',
      '편관': '크고 작은 도전과 변화가 함께 찾아오는 해입니다. 위기를 잘 넘기면 한 단계 성장하는 계기가 됩니다.',
      '정관': '조직 내에서 인정받거나 책임이 커지는 해로, 승진·시험 등에서 좋은 성과를 기대할 수 있습니다.',
      '편인': '배움과 자기계발에 집중하기 좋은 해이며, 예상 밖의 도움을 받을 수도 있습니다.',
      '정인': '귀인의 도움과 좋은 기회가 따르는 해로, 새로운 공부나 자격을 준비하기에도 좋은 시기입니다.'
    };
    return {
      ganzhi: GAN[g] + ZHI[z] + '(' + GAN_HANJA[g] + ZHI_HANJA[z] + ')년',
      tenGod: god,
      text: TEXT[god]
    };
  }

  // 궁위(宮位) 해석: 년주=초년, 월주=청년, 일지=중년(배우자궁), 시주=말년.
  // 각 기둥의 지지(地支) 오행이 일간과 어떤 생극 관계인지로 그 시기의 기운을 읽는 전통적 방식.
  var LIFE_STAGES = [
    { key: 'year', label: '초년운', range: '유년기~20대 초반' },
    { key: 'month', label: '청년운', range: '20대~30대' },
    { key: 'day', label: '중년운', range: '40대~50대' },
    { key: 'time', label: '말년운', range: '60대 이후' }
  ];

  var LIFE_STAGE_GROUP_TEXT = {
    '비겁': '스스로 길을 개척하며 독립적으로 성장하는 흐름이 강하게 나타납니다. 남에게 기대기보다 직접 부딪히고 경험하며 배우게 되는 시기가 될 가능성이 큽니다.',
    '식상': '재능을 표현하고 활동 반경을 넓히는 데 유리한 기운이 흐릅니다. 배우고 익힌 것을 밖으로 펼쳐 보이며 성장하는 시기입니다.',
    '재성': '노력한 만큼 결실이 따르는 흐름으로, 경제적 기반을 다지거나 실질적인 성과를 만드는 데 유리한 시기입니다.',
    '관성': '책임과 역할이 커지는 시기로, 조직이나 사회적 관계 안에서 인정받으며 자리를 잡아가는 흐름입니다.',
    '인성': '배움과 휴식, 주변의 도움이 함께하는 시기로, 내면을 채우고 다음 단계를 준비하는 데 유리한 흐름입니다.'
  };

  function buildLifeStages(chart) {
    var dayGan = chart.pillars.day.gan;
    return LIFE_STAGES.map(function (stage) {
      var pillar = chart.pillars[stage.key];
      if (!pillar) return { label: stage.label, range: stage.range, text: '시간 정보가 없어 말년운은 생략됐어요.' };
      var group = tenGodGroupOf(dayGan, ZHI_OHENG[pillar.zhi]);
      return { label: stage.label, range: stage.range, group: group, text: LIFE_STAGE_GROUP_TEXT[group] };
    });
  }

  var MONTH_TEN_GOD_SHORT = {
    '비견': '주도적으로 움직이기 좋은 달이에요.',
    '겁재': '동업이나 금전 거래는 조심하는 게 좋은 달이에요.',
    '식신': '여유와 즐거움이 따르는 달이에요.',
    '상관': '아이디어는 빛나지만 말은 조심할 달이에요.',
    '편재': '뜻밖의 기회와 지출이 함께 따르는 달이에요.',
    '정재': '차분히 실속을 챙기기 좋은 달이에요.',
    '편관': '크고 작은 변화와 긴장이 있는 달이에요.',
    '정관': '책임이 따르지만 성과로 이어지는 달이에요.',
    '편인': '배움과 재충전이 필요한 달이에요.',
    '정인': '귀인의 도움을 받기 좋은 달이에요.'
  };

  var MONTH_NAME = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // 해당 연도 1~12월(양력) 각 달의 월주를 절기 기준으로 직접 계산해 월별 총평을 만든다.
  // (토정비결 고유의 태세수/월건수 조견표는 신뢬성 있게 확인 가능한 출처를 찾지 못해 사용하지 않음 —
  //  대신 이미 검증된 절기 기반 만세력 엔진으로 달마다의 월주-일간 관계를 직접 산출한다.)
  function buildMonthlyFortune(chart, year) {
    var Solar = global.Solar;
    var dayGan = chart.pillars.day.gan;
    var months = [];
    for (var m = 1; m <= 12; m++) {
      var lunar = Solar.fromYmdHms(year, m, 15, 12, 0, 0).getLunar();
      var monthGan = lunar.getMonthGanIndexExact();
      var god = tenGodOf(dayGan, monthGan);
      months.push({ label: MONTH_NAME[m - 1], tenGod: god, text: MONTH_TEN_GOD_SHORT[god] });
    }
    return months;
  }

  global.SajuEngine = {
    GAN: GAN, GAN_HANJA: GAN_HANJA, ZHI: ZHI, ZHI_HANJA: ZHI_HANJA, ZHI_ANIMAL: ZHI_ANIMAL,
    OHENG: OHENG, OHENG_HANJA: OHENG_HANJA, OHENG_COLOR: OHENG_COLOR, OHENG_COLOR_DARK: OHENG_COLOR_DARK,
    computeChart: computeChart,
    pillarLabel: pillarLabel,
    buildFreeReading: buildFreeReading,
    buildPremiumReading: buildPremiumReading,
    buildYearlyFortune: buildYearlyFortune,
    buildLifeStages: buildLifeStages,
    buildMonthlyFortune: buildMonthlyFortune
  };
})(window);
