# Единый источник токенов этапа 1. Пишет ../tokens.css и ../tokens.json.  python3 tokens.py
import json, os
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D)

# (имя, день, ночь, назначение)
COLORS = [
 ('bg',             '#faf6ec', '#0c1719', 'Фон экранов приложения (Библиотека, Награды, Профиль, Настройки)'),
 ('surface',        '#ffffff', '#13232a', 'Карточки, поля ввода, панели читалки'),
 ('surface-2',      '#f1e9d6', '#1a2f36', 'Утопленные элементы: сегменты, чипы, дорожки слайдера, KPI'),
 ('sheet',          '#faf6ec', '#13232a', 'Шторки, модалки (итог сессии), нижнее меню'),
 ('line',           '#e3d8bf', '#2a3d42', 'Разделители и рамки карточек (декоративные)'),
 ('border-strong',  '#8c7c62', '#5a7a76', 'Контур полей, выключенного переключателя, вторичных кнопок (≥3:1 к фону)'),
 ('text',           '#3b3226', '#d6e2e0', 'Основной текст'),
 ('text-2',         '#6e5d43', '#93aaa7', 'Вторичный текст, подписи, номера страниц в оглавлении'),
 ('text-disabled',  '#a8987a', '#5e7470', 'Только для disabled (WCAG не требует контраста)'),
 ('accent',         '#1f6f6b', '#5fb8ae', 'Акцент: заливка главной кнопки, слайдер, активная вкладка, кольцо цели'),
 ('accent-pressed', '#17524f', '#7fcac1', 'Акцент в нажатом состоянии'),
 ('accent-text',    '#1f6f6b', '#5fb8ae', 'Акцентный текст на bg/surface/surface-2/accent-tint'),
 ('on-accent',      '#ffffff', '#0c1719', 'Текст и иконки на заливке accent'),
 ('control-on',     '#ffffff', '#17363a', 'Выбранный сегмент (seg .on), под accent-text'),
 ('accent-tint',    '#dcebe7', '#17363a', 'Фон выбранного: текущая глава, активный пункт меню, аватар'),
 ('accent-border',  '#9fc3bd', '#2f6862', 'Рамка акцентных пилюль (декор; смысл несёт текст)'),
 ('coin',           '#7a4f10', '#e2b866', 'Монеты: иконка coins и цифры «+30 монет»'),
 ('coin-tint',      '#f3e6c8', '#2a2618', 'Фон чипа баланса и цен'),
 ('success',        '#2f6a22', '#9fd68c', 'Выполнено (галочка дня/недели в тексте)'),
 ('success-tint',   '#e6efdc', '#1d3324', 'Фон плашки «выполнено»'),
 ('danger',         '#b3392a', '#ff8a80', 'Ошибка, «Сбросить весь прогресс»'),
 ('danger-tint',    '#fbe3dd', '#3d1d1a', 'Фон плашки ошибки'),
 ('focus',          '#1f6f6b', '#7fcac1', 'Кольцо фокуса клавиатуры (outline 2px, offset 2px)'),
 ('scrim',          'rgba(28,22,12,.42)', 'rgba(0,0,0,.58)', 'Затемнение под шторкой/модалкой'),
 ('badge-bg',       '#3b3226', '#d6e2e0', 'Плашка «N из M» над слайдером'),
 ('badge-text',     '#ffffff', '#0c1719', 'Текст плашки «N из M»'),
 # тосты flashMsg(text,{kind})
 ('toast-game-bg',   '#1f6f6b', '#5fb8ae', "Тост kind:'game' (монеты, XP) — фон"),
 ('toast-game-fg',   '#ffffff', '#0c1719', "Тост 'game' — текст и иконка coins"),
 ('toast-info-bg',   '#ffffff', '#1f363d', "Тост kind:'info' — фон"),
 ('toast-info-fg',   '#3b3226', '#d6e2e0', "Тост 'info' — текст"),
 ('toast-info-icon', '#1f6f6b', '#5fb8ae', "Тост 'info' — иконка info"),
 ('toast-info-border','#e3d8bf', '#2f4a50', "Тост 'info' — рамка"),
 ('toast-error-bg',  '#b3392a', '#ff8a80', "Тост kind:'error' — фон"),
 ('toast-error-fg',  '#ffffff', '#2a0d0a', "Тост 'error' — текст и иконка circle-alert"),
]
# Страница читалки: data-page на #reader. Имена --r-* уже есть в app.html (applySet пишет их inline).
PAGE = {
 'sepia': {'r-bg':'#f4ecd8','r-txt':'#5b4636','r-txt-2':'#725f4a','r-dim':'0'},
 'day':   {'r-bg':'#fbfaf6','r-txt':'#26241f','r-txt-2':'#6b6658','r-dim':'0'},
 'night': {'r-bg':'#0f1c1f','r-txt':'#c2d0cd','r-txt-2':'#7f938f','r-dim':'.35'},
}
SCALAR = [
 # типографика
 ('font-ui',   'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif', 'Интерфейс. Системный шрифт, 0 КБ загрузки (Android: Roboto)'),
 ('font-read', 'Georgia,"Noto Serif","Times New Roman",serif', 'Текст книги по умолчанию (FONTS[0]); на Android без Georgia → Noto Serif. Веб-шрифтов нет'),
 ('fs-caption','clamp(0.6875rem, calc(0.6875rem + (100vmin - 390px) * 0.03), 0.75rem)','Подписи кнопок панели читалки, номер в углу, бейдж формата'),
 ('fs-small',  'clamp(0.75rem, calc(0.8125rem + (100vmin - 390px) * 0.03), 0.9375rem)','Подписи, вторичный текст, чипы'),
 ('fs-body',   'clamp(0.875rem, calc(0.9375rem + (100vmin - 390px) * 0.03), 1.0625rem)','Основной текст интерфейса, строки списков'),
 ('fs-title',  'clamp(1rem, calc(1.0625rem + (100vmin - 390px) * 0.03), 1.1875rem)','Заголовки карточек, шапка читалки'),
 ('fs-h1',     'clamp(1.3125rem, calc(1.375rem + (100vmin - 390px) * 0.03), 1.5rem)','Заголовок экрана'),
 ('fs-display','clamp(1.6875rem, calc(1.75rem + (100vmin - 390px) * 0.03), 1.875rem)','Крупные цифры (KPI, монеты в итоге)'),
 ('fs-read',   '1.1875rem','Текст книги по умолчанию (SETDEF.size = 19px), не плавает: размер задаёт читатель в «Вид страницы»'),
 ('fw-regular','400',''),('fw-semibold','600',''),('fw-bold','700',''),
 ('lh-tight',  '1.2','Цифры, заголовки'),('lh-ui','1.4','Интерфейс'),('lh-read','1.65','Текст книги (SETDEF.lh)'),
 # отступы
 ('space-1','4px',''),('space-2','8px',''),('space-3','12px',''),('space-4','16px',''),('space-5','20px',''),('space-6','24px',''),('space-7','32px',''),('space-8','40px',''),
 # радиусы
 ('radius-xs','6px','Обложки, бейдж формата'),('radius-sm','10px','Сегменты, мелкие кнопки'),('radius-md','14px','Карточки, кнопки, тосты'),('radius-lg','18px','Шторки, модалки (= текущий --radius)'),('radius-pill','999px','Чипы, плашка «N из M», «< на стр. N»'),
 # иконки и зоны
 ('icon-s','16px','Иконка в чипе/цене'),('icon-m','20px','Иконка в строке, тосте'),('icon-l','22px','Кнопки панелей, нижнее меню'),('icon-stroke','1.8','stroke-width Lucide'),
 ('tap','44px','Минимальная зона нажатия (в т.ч. невидимая через ::after)'),
 ('topbar-h','56px','Верхняя панель читалки и шапки экранов без safe-area'),('rbar-slots','5','Максимум кнопок в нижней панели читалки'),('nav-h','64px','Нижнее меню без safe-area'),
 # движение
 ('dur-press','100ms','Отклик нажатия'),('dur-fast','150ms','Ховер/фокус, переключатели'),('dur-base','200ms','Появление панелей читалки, тосты'),('dur-sheet','260ms','Шторка/модалка'),
 ('ease','cubic-bezier(.2,.8,.2,1)','Стандартная кривая'),('ease-in','cubic-bezier(.4,0,1,1)','Уход панелей/тостов'),
 ('panel-autohide','3200ms','Панели читалки прячутся сами'),('toast-hold','3000ms','Сколько висит тост game/info'),('toast-hold-error','5000ms','Сколько висит тост error'),
 # тосты — размеры
 ('toast-radius','14px',''),('toast-max-w','358px','Ширина тоста на телефоне (390 − 2×16)'),('toast-min-h','48px',''),('toast-pad','12px 16px',''),('toast-gap','12px','Отступ над нижним меню / над краем'),
 # PDF ночью
 ('pdf-night-dim','.35','По умолчанию для rq_set.pdfDim: чёрный слой поверх холста PDF ночью, rgba(0,0,0,.35) ≡ brightness(.65). Живое значение пишет JS в --rq-pdf-dim'),
 ('pdf-dim-max','.5','Потолок ползунка «Затемнение PDF ночью»: при .5 чёрный текст на белом 5.28:1, при .55 уже 4.41:1, при .6 — 3.66:1'),
 ('pdf-dim-step','.05','Шаг ползунка (5 %)'),
 # режим фокуса
 ('focus-auto-delay','10000ms','«Авто»: через 10 с чтения без касания панелей включается фокус'),
 ('tapzone-side','30%','Ширина левой/правой зоны тапа (листание); центр 40 % — панели и выход из фокуса'),
 # автопрокрутка
 ('as-speed-min','1','Автопрокрутка: нижний уровень скорости'),('as-speed-max','20','Верхний уровень скорости'),
 ('as-speed-default','6','Скорость по умолчанию (SET.autoscroll.speed)'),
 ('as-lines-per-level','3','Строк в минуту на один уровень: px/с = уровень × 3 × line-height / 60 (уровень 6 ≈ 18 строк/мин, 20 ≈ 60 строк/мин); не зависит от размера шрифта'),
 ('as-pdf-px-per-level','1.6px','PDF: px/с на уровень при масштабе «по ширине» (≈ та же скорость, что текст 19 px × 1.65)'),
 ('as-pdf-gap','12px','PDF в автопрокрутке: зазор между страницами в ленте'),
 ('as-pill-h','56px','Высота плавающей панели автопрокрутки (кнопки внутри 44×44)'),
 ('as-pill-bottom','36px','Отступ панели от низа поверх safe-area: над полосой статуса и счётчика 18 px, тень панели не ложится на их текст'),
 ('as-pill-autohide','3000ms','Панель гаснет через 3 с после запуска, продолжения или последнего касания; на паузе не гаснет'),
 ('as-resume-ramp','400ms','Плавный разгон до скорости после паузы или ручного сдвига'),
 ('as-lock-badge','48px','Значок замка в углу (зона нажатия ≥ 44)'),
 ('as-unlock-hold','1000ms','Удержание значка для разблокировки; кольцо заполняется за это время'),
 ('as-pause-idle','120000ms','Пауза дольше 2 мин — время чтения перестаёт считаться (как обычный простой)'),
 # адаптивность
 ('read-max','680px','Максимальная ширина колонки текста (вместе с полями), по центру'),
 ('card-max','480px','Шторки и итог сессии на широком/альбомном экране — карточка по центру не шире'),
 ('grid-min','104px','Ширина обложки для auto-fill в альбомной ориентации'),
 ('bp-grid4','400px','С этой ширины полка в 4 колонки (до — 3)'),
 ('safe-top','env(safe-area-inset-top, 0px)',''),('safe-right','env(safe-area-inset-right, 0px)',''),
 ('safe-bottom','env(safe-area-inset-bottom, 0px)',''),('safe-left','env(safe-area-inset-left, 0px)',''),
]
SHADOWS = [
 ('shadow-1','0 1px 2px rgba(0,0,0,.10)','0 1px 2px rgba(0,0,0,.40)','Сегмент «вкл», мелкие карточки'),
 ('shadow-2','0 2px 8px rgba(0,0,0,.08)','0 2px 8px rgba(0,0,0,.45)','Панели читалки, тосты'),
 ('shadow-3','0 10px 40px rgba(0,0,0,.28)','0 10px 40px rgba(0,0,0,.60)','Шторки, модалки'),
]
# Старые имена из app.html → новые токены (Фронт может перевести классы постепенно)
ALIASES = {'bg':'bg','card':'surface','card2':'surface-2','txt':'text','muted':'text-2','accent':'accent','accent2':'coin','good':'success','bar':'surface','sheet':'sheet','drawer':'sheet','radius':'radius-lg'}

def css():
    o = ['/* ReadQuest · токены этапа 1 (Интерфейс, 08.10.2026). Сгенерировано src/tokens.py — правьте там. */',
         '/* День = :root, ночь = [data-theme="night"] на <html>. Страница читалки = [data-page] на #reader. */', ':root{']
    for n,v,_ in SCALAR: o.append(f'  --rq-{n}:{v};')
    for n,d,_,_ in COLORS: o.append(f'  --rq-{n}:{d};')
    for n,d,_,_ in SHADOWS: o.append(f'  --rq-{n}:{d};')
    o.append('  color-scheme:light;')
    o.append('  /* совместимость со старыми именами app.html */')
    for a,t in ALIASES.items(): o.append(f'  --{a}:var(--rq-{t});')
    o.append('}')
    o.append('[data-theme="night"]{')
    for n,_,nv,_ in COLORS: o.append(f'  --rq-{n}:{nv};')
    for n,_,nv,_ in SHADOWS: o.append(f'  --rq-{n}:{nv};')
    o.append('  color-scheme:dark;\n}')
    o.append('/* Страница читалки. По умолчанию сепия (SETDEF.theme). */')
    o.append(':where(#reader){'+''.join(f'--{k}:{v};' for k,v in PAGE['sepia'].items())+'}')
    for p,vals in PAGE.items(): o.append(f'[data-page="{p}"]{{'+''.join(f'--{k}:{v};' for k,v in vals.items())+'}')
    o.append('/* PDF ночью: слой выше холста, но НИЖЕ текстового слоя pdf.js (z-index ≥ 2), чтобы выделение и «Цитата» работали. Холст не трогаем (вариант B, без инверсии) */')
    o.append('[data-page="night"] .rq-pdf-page::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,var(--rq-pdf-dim,var(--rq-pdf-night-dim)));pointer-events:none;z-index:1}')
    o.append('@media (prefers-reduced-motion:reduce){:root{--rq-dur-base:0ms;--rq-dur-sheet:0ms;--rq-dur-fast:0ms}}')
    return '\n'.join(o)+'\n'

def js():
    return {'meta':{'version':'stage1-2026-10-08','prefix':'--rq-','themes':['day','night'],'note':'day = :root, night = [data-theme=night]'},
            'color':{n:{'day':d,'night':nv,'use':u} for n,d,nv,u in COLORS},
            'page':PAGE,
            'shadow':{n:{'day':d,'night':nv,'use':u} for n,d,nv,u in SHADOWS},
            'scalar':{n:{'value':v,'use':u} for n,v,u in SCALAR},
            'aliases':{('--'+a):('--rq-'+t) for a,t in ALIASES.items()}}

if __name__=='__main__':
    open(f'{OUT}/tokens.css','w').write(css())
    json.dump(js(), open(f'{OUT}/tokens.json','w'), ensure_ascii=False, indent=1)
    print('tokens ok')
