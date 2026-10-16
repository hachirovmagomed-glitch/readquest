# ReadQuest · скины под главы «Пути читателя» (II Ламанча, III Петербург, IV Модерн) — генератор макетов 390×844 @2x.
# Все рисунки наши, простые силуэты. Запуск: python3 gen.py  (нужен node + playwright)
import os, math, subprocess, json
D = os.path.dirname(os.path.abspath(__file__))
OUT = D + '/out'; os.makedirs(OUT, exist_ok=True)
W, H = 390, 844

# ---------------- данные Пути ----------------
CH = {
 'II': dict(t='Странники и рыцари', rank='Странствующий рыцарь', books=[
   dict(t='Ад', a='Данте Алигьери', kind='', st='started', pct=40, hrs='≈ 3 часа'),
   dict(t='Гамлет', a='Уильям Шекспир', kind='', st='done', hrs='≈ 2 часа'),
   dict(t='Дон Кихот', a='Мигель де Сервантес', kind='boss', st='', hrs='≈ 24 часа')]),
 'III': dict(t='Век романа', rank='Знаток века', books=[
   dict(t='Шинель', a='Н. В. Гоголь', kind='side', st='done', hrs='≈ 50 мин'),
   dict(t='Капитанская дочка', a='А. С. Пушкин', kind='', st='started', pct=65, hrs='≈ 3 часа'),
   dict(t='Рождественская песнь', a='Чарльз Диккенс', kind='side', st='', hrs='≈ 2 часа'),
   dict(t='Преступление и наказание', a='Ф. М. Достоевский', kind='boss', st='', hrs='≈ 13 часов')]),
 'IV': dict(t='На пороге нового века', rank='Хранитель классики', books=[
   dict(t='Дама с собачкой', a='А. П. Чехов', kind='side', st='done', hrs='≈ 25 мин'),
   dict(t='Машина времени', a='Герберт Уэллс', kind='', st='started', pct=30, hrs='≈ 2 часа'),
   dict(t='Портрет Дориана Грея', a='Оскар Уайльд', kind='', st='', hrs='≈ 5 часов'),
   dict(t='Анна Каренина', a='Л. Н. Толстой', kind='boss', st='', hrs='≈ 21 час')]),
}
LIB = {  # вымышленные книги на полке (как в паках скинов)
 'lamancha': [('Рыцарь печального облика','П. Ветряков','EPUB',53),('Песнь о трёх башнях','Л. Замкова','FB2',12),('Дорога на Тобосо','И. Пыльцова','TXT',100),
              ('Щит без герба','Р. Оружейников','PDF',0),('Мельница у реки','М. Жерновой','EPUB',4),('Осёл и звёзды','С. Панса','PDF',67)],
 'peterburg': [('Белые ночи на Мойке','А. Невская','EPUB',53),('Фонарщик','Г. Огнев','FB2',12),('Доходный дом','П. Колодцев','TXT',100),
              ('Записки с Сенной','Д. Мостовой','PDF',0),('Шпиль и кораблик','Е. Адмиралова','EPUB',4),('Метель на Невском','С. Вьюгина','PDF',67)],
 'modern': [('Павлинье перо','О. Ирисова','EPUB',53),('Последний поезд','А. Вокзальная','FB2',12),('Часы без стрелок','Г. Временщиков','TXT',100),
              ('Лилии в оранжерее','Д. Стеклова','PDF',0),('Семафор','Н. Путейцев','EPUB',4),('Вечер ламп','В. Лампова','PDF',67)],
}

# ---------------- палитры (токены) ----------------
P = {
 'lamancha': dict(
   name='Ламанча', ch='II', fonts=dict(disp="'Bona Nova SC'", ui="'Spectral'", num="'Spectral SC'", book="'Bona Nova'"),
   day=dict(bg='#efe6d2', surf='#fbf6ea', surf2='#f3ead6', ink='#1d1a17', t2='#55483a', acc='#9e2a1c', acc2='#7f2015', onacc='#ffffff',
            ok='#3d5a2a', coin='#7a4a10', deco1='#2a4a9a', deco2='#d9a521', deco3='#b8321f', line='#1d1a17', road='#9e2a1c', mapbg='#f6eedb', hatch='#b9a888',
            hdr='#fbf6ea', hdrink='#1d1a17', nav='#fbf6ea', track='#e2d6bd'),
   night=dict(bg='#11141f', surf='#1b1f2d', surf2='#242a3b', ink='#efe6d2', t2='#bfb5a2', acc='#f08a6e', acc2='#f6a58e', onacc='#1d1a17',
            ok='#b7d39a', coin='#f2c76a', deco1='#7f9be0', deco2='#e8bd4a', deco3='#f08a6e', line='#d8cdb6', road='#f08a6e', mapbg='#151a28', hatch='#3a4258',
            hdr='#1b1f2d', hdrink='#efe6d2', nav='#1b1f2d', track='#323a50')),
 'peterburg': dict(
   name='Петербург', ch='III', fonts=dict(disp="'Sofia Sans Extra Condensed'", ui="'Onest'", num="'Sofia Sans Extra Condensed'", ttl="'Noto Serif Display'", book="'Piazzolla'"),
   day=dict(bg='#eceae4', surf='#fbfaf6', surf2='#f1efe8', ink='#1b1f24', t2='#4c535c', acc='#1d5a5b', acc2='#164748', onacc='#ffffff',
            ok='#2f6a3a', coin='#7b4a1e', deco1='#e2b85c', deco2='#9fb8c4', deco3='#ffffff', line='#1b1f24', road='#1b1f24', mapbg='#f4f2ec', hatch='#c9c5bb',
            hdr='#e6bd62', hdrink='#1b1f24', nav='#fbfaf6', track='#dcd8cf', water='#cfdde3', water2='#a9c1cc'),
   night=dict(bg='#0e1419', surf='#18212a', surf2='#212c37', ink='#eef0f1', t2='#b6bec6', acc='#f2c14e', acc2='#f7d47c', onacc='#1b1f24',
            ok='#a8d5a0', coin='#f2c14e', deco1='#f2c14e', deco2='#4a6272', deco3='#dfe8ee', line='#c9d1d8', road='#dfe4e8', mapbg='#121b23', hatch='#2a3642',
            hdr='#2a2416', hdrink='#f6e7c0', nav='#18212a', track='#2c3844', water='#1a2a36', water2='#25394a')),
 'modern': dict(
   name='Модерн', ch='IV', fonts=dict(disp="'Ysabeau SC'", ui="'Ysabeau Infant'", num="'Jura'", book="'Brygada 1918'"),
   day=dict(bg='#f3eee2', surf='#fcf9f1', surf2='#efe8d8', ink='#1f1a22', t2='#544a58', acc='#0f5e63', acc2='#0b4a4e', onacc='#ffffff',
            ok='#3f6a3a', coin='#7a5a14', deco1='#b08d3e', deco2='#7b9a74', deco3='#8a6b94', line='#1f1a22', road='#4a3a2e', mapbg='#f8f4ea', hatch='#d9cfb8',
            hdr='#0f4c50', hdrink='#f6efdc', nav='#fcf9f1', track='#e3dccb'),
   night=dict(bg='#150f19', surf='#221a28', surf2='#2c2234', ink='#f3ecf4', t2='#c4b6c8', acc='#7fd1c7', acc2='#a3e0d8', onacc='#11201f',
            ok='#b5d6a3', coin='#e7c56f', deco1='#d4b05a', deco2='#6f8f6a', deco3='#b996c4', line='#d9cfe0', road='#cbb9a4', mapbg='#1b1420', hatch='#3a2e42',
            hdr='#0b2c2f', hdrink='#f6efdc', nav='#221a28', track='#3a3044')),
}

# ---------------- мотивы (силуэты, viewBox 64) ----------------
def svg(inner, sz, vb=64, cls='', style=''):
    return f'<svg class="{cls}" width="{sz}" height="{sz}" viewBox="0 0 {vb} {vb}" style="{style}">{inner}</svg>'

M = {}
# Ламанча — раскрашенная вручную гравюра: чёрный контур, ультрамарин, охра, киноварь
M['lam_tower'] = '''<path d="M20 58V24h24v34z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.4"/>
<path d="M17 24V15h5v4h5v-4h5v4h5v-4h5v4h5v-4h0v9z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M28 58V47a4 4 0 0 1 8 0v11z" fill="var(--line)"/><path d="M29 32h6v7h-6z" fill="var(--deco1)" stroke="var(--line)" stroke-width="1.6"/>
<path d="M23 44h3M23 49h3M38 44h3M38 52h3M23 28h3M38 28h3" stroke="var(--line)" stroke-width="1.4"/>
<path d="M32 15V3" stroke="var(--line)" stroke-width="2"/><path d="M32 3l12 3.5L32 10z" fill="var(--deco3)" stroke="var(--line)" stroke-width="1.4" stroke-linejoin="round"/>'''
M['lam_mill'] = '''<path d="M24 58l3-28h10l3 28z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M25 30l7-9 7 9z" fill="var(--deco3)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/>
<g stroke="var(--line)" stroke-width="2" fill="var(--surf)" stroke-linejoin="round"><path d="M32 27L13 8l4-4 19 19z"/><path d="M32 27L51 8l-4-4-19 19z" /><path d="M32 27L13 46l4 4 19-19z" fill="none"/><path d="M32 27l19 19-4 4-19-19z" fill="none"/></g>
<path d="M17 8l4 4M21 4l4 4M47 4l-4 4M51 8l-4 4" stroke="var(--line)" stroke-width="1.2"/>
<circle cx="32" cy="27" r="3" fill="var(--deco2)" stroke="var(--line)" stroke-width="1.6"/><path d="M30 58v-7a2 2 0 0 1 4 0v7z" fill="var(--line)"/>'''
M['lam_castle'] = '''<path d="M6 58V30h12v28zM46 58V30h12v28z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.4"/>
<path d="M18 58V38h28v20z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.4"/>
<path d="M4 30v-7h4v3h3v-3h3v3h3v-3h4v7zM44 30v-7h4v3h3v-3h3v3h3v-3h4v7zM16 38v-5h4v3h4v-3h4v3h4v-3h4v3h4v-3h4v5z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M26 58V48a6 6 0 0 1 12 0v10z" fill="var(--line)"/><path d="M28 50h8M28 54h8" stroke="var(--surf)" stroke-width="1"/>
<path d="M12 23V8M52 23V8" stroke="var(--line)" stroke-width="2"/><path d="M12 8l11 4-11 4zM52 8l11 4-11 4z" fill="var(--deco3)" stroke="var(--line)" stroke-width="1.3" stroke-linejoin="round"/>
<path d="M10 37h4v6h-4zM50 37h4v6h-4z" fill="var(--deco1)" stroke="var(--line)" stroke-width="1.4"/>
<path d="M8 50h3M8 54h3M53 50h3M53 54h3M20 44h3M41 44h3" stroke="var(--line)" stroke-width="1.3"/>'''
M['lam_shield'] = '''<path d="M10 8h44v20c0 15-10 24-22 30C20 52 10 43 10 28z" fill="var(--deco1)" stroke="var(--line)" stroke-width="2.6" stroke-linejoin="round"/>
<path d="M10 30l22-12 22 12v8L32 26 10 38z" fill="var(--deco2)" stroke="var(--line)" stroke-width="2" stroke-linejoin="round"/>'''
M['lam_tree'] = '''<path d="M32 60V36" stroke="var(--line)" stroke-width="3"/><circle cx="32" cy="24" r="16" fill="var(--surf)" stroke="var(--line)" stroke-width="2.4"/>
<path d="M22 20q4-6 10-6M20 28q6-4 10-2M34 30q6 0 10-6M36 18q4 0 6 4" stroke="var(--line)" stroke-width="1.4" fill="none"/>'''
M['lam_hill'] = '''<path d="M2 58Q22 22 44 58z" fill="var(--surf)" stroke="var(--line)" stroke-width="2"/><path d="M14 52l5-8M20 54l6-11M27 55l5-10M34 56l4-7" stroke="var(--line)" stroke-width="1.3"/>'''
M['lam_star'] = '''<path d="M32 4L36 28 60 32 36 36 32 60 28 36 4 32 28 28z" fill="var(--deco2)" stroke="var(--line)" stroke-width="1.5" stroke-linejoin="round"/><path d="M32 18l3 11 11 3-11 3-3 11-3-11-11-3 11-3z" fill="var(--surf)" opacity=".5"/>'''
M['lam_coin'] = '''<circle cx="32" cy="32" r="28" fill="var(--deco2)" stroke="var(--line)" stroke-width="2.6"/><circle cx="32" cy="32" r="21" fill="none" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="1.5 3"/>
<path d="M32 33L21 22l3-3 11 11zM32 33l11-11-3-3-11 11zM32 33L21 44l3 3 11-11zM32 33l11 11-3 3-11-11z" fill="var(--surf)" stroke="var(--line)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="32" cy="33" r="3" fill="var(--deco3)" stroke="var(--line)" stroke-width="1.3"/>'''
M['lam_donkey'] = '''<circle cx="32" cy="32" r="30" fill="var(--deco1)" stroke="var(--line)" stroke-width="2.4"/>
<path d="M14 50V38c0-6 4-9 10-9h12l6-9-3-9 5 5 2-6 2 8c3 2 4 6 3 9l-4 3-4-1-3 6v13h-4V44H22v6h-4V42" fill="var(--surf)" stroke="var(--line)" stroke-width="2" stroke-linejoin="round"/>
<circle cx="46" cy="22" r="1.4" fill="var(--line)"/><path d="M14 38l-4 6" stroke="var(--line)" stroke-width="2"/><path d="M22 29h14v6H22z" fill="var(--deco3)" stroke="var(--line)" stroke-width="1.6"/>'''

# Петербург — гравированный план города, фасад охры, чугунные решётки, газовые фонари
M['spb_house'] = '''<path d="M10 58V20h44v38z" fill="var(--deco1)" stroke="var(--line)" stroke-width="2.2"/><path d="M8 20h48l-24-12z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M8 20h48v3H8z" fill="var(--surf)" stroke="var(--line)" stroke-width="1.6"/>
<g fill="var(--surf)" stroke="var(--line)" stroke-width="1.4"><path d="M15 27h6v8h-6zM29 27h6v8h-6zM43 27h6v8h-6zM15 40h6v8h-6zM43 40h6v8h-6z"/></g>
<path d="M28 58V46a4 4 0 0 1 8 0v12z" fill="var(--line)"/><path d="M10 52h44" stroke="var(--line)" stroke-width="1.2"/>'''
M['spb_lamp'] = '''<path d="M32 62V24" stroke="var(--line)" stroke-width="3.2"/><path d="M26 62h12M28 56h8" stroke="var(--line)" stroke-width="2.4"/>
<path d="M22 12h20l-4 14H26z" fill="var(--deco1)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/><path d="M24 12l8-8 8 8z" fill="var(--line)"/><path d="M32 12v14M26 19h12" stroke="var(--line)" stroke-width="1.2"/>
<path d="M18 30q14 6 28 0" stroke="var(--line)" stroke-width="2" fill="none"/>'''
M['spb_spire'] = '''<path d="M4 60V38h56v22z" fill="var(--deco1)" stroke="var(--line)" stroke-width="2.2"/><path d="M2 38h60v3H2z" fill="var(--surf)" stroke="var(--line)" stroke-width="1.6"/>
<path d="M22 38V24h20v14z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.2"/><path d="M24 24l8-6 8 6z" fill="var(--deco1)" stroke="var(--line)" stroke-width="2" stroke-linejoin="round"/>
<path d="M32 18l-1.6 0L32 1l1.6 17z" fill="var(--deco1)" stroke="var(--line)" stroke-width="1.6" stroke-linejoin="round"/><path d="M31 4l5-1.5 1 2.5-6 1z" fill="var(--line)"/>
<path d="M27 38v-8a5 5 0 0 1 10 0v8z" fill="var(--line)"/>
<g fill="var(--surf)" stroke="var(--line)" stroke-width="1.3"><path d="M8 45h5v8H8zM17 45h5v8h-5zM42 45h5v8h-5zM51 45h5v8h-5z"/></g><path d="M28 60V48h8v12z" fill="var(--line)"/>'''
M['spb_bridge'] = '''<path d="M2 34h60v5H2z" fill="var(--surf)" stroke="var(--line)" stroke-width="2"/><path d="M6 39q26 22 52 0" fill="none" stroke="var(--line)" stroke-width="2.2"/>
<path d="M2 26h60" stroke="var(--line)" stroke-width="2"/><path d="M6 26v8M14 26v8M22 26v8M30 26v8M38 26v8M46 26v8M54 26v8" stroke="var(--line)" stroke-width="1.4"/><circle cx="10" cy="30" r="2" fill="none" stroke="var(--line)" stroke-width="1"/><circle cx="34" cy="30" r="2" fill="none" stroke="var(--line)" stroke-width="1"/><circle cx="50" cy="30" r="2" fill="none" stroke="var(--line)" stroke-width="1"/>'''
M['spb_snow'] = '''<g stroke="var(--deco3)" stroke-width="3" stroke-linecap="round"><path d="M32 6v52M9 19l46 26M9 45l46-26"/><path d="M26 10l6 6 6-6M26 54l6-6 6 6"/></g>'''
M['spb_coin'] = '''<circle cx="32" cy="32" r="28" fill="#b87333" stroke="var(--line)" stroke-width="2.6"/><circle cx="32" cy="32" r="22" fill="none" stroke="#5e3410" stroke-width="1.4"/>
<path d="M18 38q14-12 28 0" fill="none" stroke="#3b200a" stroke-width="2.4"/><path d="M16 38h32" stroke="#3b200a" stroke-width="2.4"/><path d="M22 34v4M27 31v7M32 30v8M37 31v7M42 34v4" stroke="#3b200a" stroke-width="1.2"/><path d="M32 30V15" stroke="#3b200a" stroke-width="2"/><path d="M32 15l6 3-6 2z" fill="#3b200a"/>'''
M['spb_cat'] = '''<circle cx="32" cy="32" r="30" fill="var(--acc)" stroke="var(--line)" stroke-width="2.4"/>
<path d="M18 54V34c0-8 4-12 8-14l-2-10 7 7h2l7-7-2 10c4 2 8 6 8 14v20z" fill="var(--line)"/>
<path d="M44 52q10-2 8-14" fill="none" stroke="var(--line)" stroke-width="3.5" stroke-linecap="round"/><circle cx="28" cy="30" r="2.6" fill="var(--deco1)"/><circle cx="36" cy="30" r="2.6" fill="var(--deco1)"/>
<path d="M14 54h36" stroke="var(--deco1)" stroke-width="2"/>'''

# Модерн — плавные «удары бича», ирисы, павлинье перо, железная дорога и вокзалы
M['mod_station'] = '''<path d="M8 58V30h48v28z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.2"/><path d="M4 30q28-24 56 0z" fill="var(--deco2)" stroke="var(--line)" stroke-width="2.2" stroke-linejoin="round"/>
<circle cx="32" cy="22" r="6" fill="var(--surf)" stroke="var(--line)" stroke-width="1.8"/><path d="M32 22v-3.5M32 22l2.5 1.5" stroke="var(--line)" stroke-width="1.4" stroke-linecap="round"/>
<path d="M14 58V42q4-6 8 0v16M42 58V42q4-6 8 0v16" fill="var(--deco1)" stroke="var(--line)" stroke-width="1.8"/><path d="M27 58V40q5-8 10 0v18z" fill="var(--line)"/>'''
M['mod_lamp'] = '''<path d="M32 62V30" stroke="var(--line)" stroke-width="3"/><path d="M32 30q-12-8-6-20" fill="none" stroke="var(--line)" stroke-width="2.4"/><path d="M32 30q12-8 6-20" fill="none" stroke="var(--line)" stroke-width="2.4"/>
<path d="M32 26c-6-4-6-12 0-18 6 6 6 14 0 18z" fill="var(--deco1)" stroke="var(--line)" stroke-width="2" stroke-linejoin="round"/><path d="M24 62h16" stroke="var(--line)" stroke-width="2.4"/>
<path d="M32 46q-10 0-12-8M32 46q10 0 12-8" fill="none" stroke="var(--line)" stroke-width="1.8"/>'''
M['mod_hall'] = '''<path d="M4 60V30h56v30z" fill="var(--surf)" stroke="var(--line)" stroke-width="2.2"/>
<path d="M8 30q24-30 48 0z" fill="var(--deco2)" stroke="var(--line)" stroke-width="2.2"/><path d="M14 30q18-20 36 0M20 30q12-12 24 0M32 8v22M22 13l4 17M42 13l-4 17" fill="none" stroke="var(--line)" stroke-width="1.2"/>
<circle cx="32" cy="40" r="6" fill="var(--deco1)" stroke="var(--line)" stroke-width="1.8"/><path d="M32 40v-3.5M32 40l2.6 1.4" stroke="var(--line)" stroke-width="1.4" stroke-linecap="round"/>
<path d="M10 60V46q4-6 8 0v14M46 60V46q4-6 8 0v14" fill="var(--deco1)" stroke="var(--line)" stroke-width="1.8"/><path d="M24 60V50q8-8 16 0v10z" fill="var(--line)"/>
<path d="M2 30h60" stroke="var(--line)" stroke-width="2.6"/>'''
M['mod_iris'] = '''<path d="M32 62C30 48 34 40 32 30" fill="none" stroke="var(--deco2)" stroke-width="2.6"/><path d="M32 52c-10-2-16-10-18-20 8 4 14 10 18 20zM32 46c8-2 14-8 16-16-8 3-13 9-16 16z" fill="var(--deco2)"/>
<path d="M32 30c-4-6-4-14 0-22 4 8 4 16 0 22z" fill="var(--deco3)" stroke="var(--line)" stroke-width="1.4"/><path d="M32 30c-8 2-14-2-16-8 6-2 12 0 16 8zM32 30c8 2 14-2 16-8-6-2-12 0-16 8z" fill="var(--deco3)" stroke="var(--line)" stroke-width="1.4"/>
<path d="M30 24h4" stroke="var(--deco1)" stroke-width="2"/>'''
M['mod_feather'] = '''<path d="M32 62V30" stroke="var(--deco1)" stroke-width="2"/><path d="M32 4C16 10 14 34 32 44 50 34 48 10 32 4z" fill="var(--deco2)" opacity=".55"/>
<ellipse cx="32" cy="24" rx="11" ry="14" fill="var(--deco1)"/><ellipse cx="32" cy="25" rx="7.5" ry="10" fill="var(--acc)"/><ellipse cx="32" cy="27" rx="4" ry="5.5" fill="var(--deco3)"/>'''
M['mod_loco'] = '''<path d="M6 46V30h22v-8h10v8h10l8 10v6z" fill="var(--line)"/><path d="M40 22v-8h6v8" fill="var(--line)"/><path d="M8 32h16v8H8z" fill="var(--deco1)"/>
<circle cx="16" cy="50" r="6" fill="var(--surf)" stroke="var(--line)" stroke-width="3"/><circle cx="34" cy="50" r="6" fill="var(--surf)" stroke="var(--line)" stroke-width="3"/><circle cx="50" cy="51" r="4" fill="var(--surf)" stroke="var(--line)" stroke-width="2.6"/>
<path d="M16 50h34" stroke="var(--line)" stroke-width="2"/><path d="M44 12q-6-6 2-10M48 10q0-8 8-6" fill="none" stroke="var(--hatch)" stroke-width="3" stroke-linecap="round"/>'''
M['mod_clock'] = '''<circle cx="32" cy="32" r="26" fill="var(--surf)" stroke="var(--deco1)" stroke-width="3"/><circle cx="32" cy="32" r="20" fill="none" stroke="var(--line)" stroke-width="1"/>
<g stroke="var(--line)" stroke-width="2" stroke-linecap="round"><path d="M32 14v4M32 46v4M14 32h4M46 32h4"/><path d="M32 32V20M32 32l8 5"/></g><circle cx="32" cy="32" r="2" fill="var(--deco3)"/>'''
M['mod_coin'] = '''<circle cx="32" cy="32" r="28" fill="var(--deco1)" stroke="var(--line)" stroke-width="2.4"/><circle cx="32" cy="32" r="22" fill="none" stroke="var(--surf)" stroke-width="1.2" opacity=".8"/>
<path d="M32 50C30 40 34 34 32 26" fill="none" stroke="var(--line)" stroke-width="2"/><path d="M32 26c-3-5-3-10 0-15 3 5 3 10 0 15zM32 26c-6 1-10-1-12-6 5-1 9 1 12 6zM32 26c6 1 10-1 12-6-5-1-9 1-12 6z" fill="var(--surf)" stroke="var(--line)" stroke-width="1.4"/>'''
M['mod_peacock'] = '''<circle cx="32" cy="32" r="30" fill="var(--acc)" stroke="var(--deco1)" stroke-width="2.4"/>
<g fill="var(--deco1)" opacity=".9"><ellipse cx="14" cy="22" rx="4" ry="6"/><ellipse cx="24" cy="14" rx="4" ry="6"/><ellipse cx="40" cy="14" rx="4" ry="6"/><ellipse cx="50" cy="22" rx="4" ry="6"/></g>
<g fill="var(--onacc)"><ellipse cx="14" cy="22" rx="2" ry="3"/><ellipse cx="24" cy="14" rx="2" ry="3"/><ellipse cx="40" cy="14" rx="2" ry="3"/><ellipse cx="50" cy="22" rx="2" ry="3"/></g>
<path d="M26 56c-2-10 0-18 6-22 0-6 2-10 6-10 3 0 4 3 2 5l-4 2c2 6 2 12-2 25z" fill="var(--surf)" stroke="var(--line)" stroke-width="1.8" stroke-linejoin="round"/><circle cx="38.5" cy="27" r="1.2" fill="var(--line)"/><path d="M38 20l-1-5M40 20l2-5" stroke="var(--line)" stroke-width="1.4"/>'''

ICON = {  # интерфейс: тонкие линии, как Lucide
 'menu': '<path d="M4 6h16M4 12h16M4 18h16"/>',
 'book': '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
 'map': '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 'shield': '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
 'feather': '<path d="M20 4C12 4 6 10 6 18v2M6 18l10-10M9 15h6"/>',
 'flower': '<path d="M12 21v-8"/><path d="M12 13c-3-2-4-6-2-10 1 3 2 4 2 4s1-1 2-4c2 4 1 8-2 10z"/><path d="M12 16c-3 0-5-2-6-4M12 16c3 0 5-2 6-4"/>',
 'check': '<path d="M5 12l4 4 10-10"/>',
}
def ic(n, sz=22, w=1.8):
    return f'<svg width="{sz}" height="{sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round">{ICON[n]}</svg>'

# ---------------- общий CSS ----------------
def css(sk, night):
    p = P[sk]; c = p['night' if night else 'day']; f = p['fonts']
    v = ';'.join(f'--{k}:{val}' for k, val in c.items())
    return f'''@import url(../fonts/fonts.css);
:root{{{v};--disp:{f['disp']};--ui:{f['ui']};--num:{f['num']};--ttl:{f.get('ttl', f['disp'])};--bookf:{f['book']}}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}px;min-height:{H}px;background:var(--bg);color:var(--ink);font-family:var(--ui);-webkit-font-smoothing:antialiased;font-variant-numeric:lining-nums}}
.abs{{position:absolute}} .scr{{position:relative;width:{W}px;min-height:{H}px;overflow:hidden;padding:114px 16px 96px}} .col{{display:flex;flex-direction:column;gap:14px}} .col .card{{position:relative;left:auto;right:auto}}
.nav{{position:absolute;left:0;right:0;bottom:0;height:76px;background:var(--nav);display:flex;gap:4px;padding:8px 10px 12px;z-index:5}}
.nav a{{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--t2);font-weight:700;font-size:12.5px;border-radius:var(--navr,10px)}}
.nav a.on{{background:var(--acc);color:var(--onacc)}}
.card{{position:absolute;left:16px;right:16px;background:var(--surf)}}
.bar{{height:8px;background:var(--track);border-radius:var(--barr,4px);overflow:hidden}} .bar i{{display:block;height:100%;background:var(--acc)}}
.sumt{{font-size:17px}} .sumt b{{font-family:var(--num);font-size:22px;font-weight:700}}
.sums{{font-size:14px;color:var(--t2);margin-top:8px}} .sums b{{color:var(--ink)}}
.chh{{display:flex;gap:14px;align-items:center}} .cht{{font-family:var(--disp);font-size:25px;font-weight:700;line-height:1.05}} .chs{{font-size:13.5px;color:var(--t2);margin-top:4px}}
.lab{{position:absolute;width:200px;z-index:2}} .lab.r{{text-align:right}}
.tag{{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--t2)}}
.bt{{font-family:var(--ttl);font-size:20px;font-weight:700;line-height:1.08;margin-top:2px}} .ba{{font-size:14px;color:var(--t2);margin-top:3px}}
.bs{{font-size:14px;font-weight:700;margin-top:5px;color:var(--acc)}} .bs.mute{{color:var(--t2);font-weight:600}}
.node{{position:absolute;z-index:1}} .ok{{position:absolute;width:24px;height:24px;background:var(--acc);color:var(--onacc);display:flex;align-items:center;justify-content:center;border:2px solid var(--surf);border-radius:var(--okr,4px)}}
.pb{{position:absolute;height:7px;background:var(--surf);border:1.5px solid var(--line);border-radius:4px;overflow:hidden}} .pb i{{display:block;height:100%;background:var(--acc)}}
.hdr{{position:absolute;left:0;right:0;top:0;height:100px;background:var(--hdr);color:var(--hdrink);z-index:4}}
.htitle{{position:absolute;left:62px;top:44px;font-family:var(--disp);font-size:30px;font-weight:700;line-height:1}}
.hmenu{{position:absolute;left:18px;top:45px}}
.chips{{display:flex;gap:8px}} .chip{{padding:7px 14px;font-size:14.5px;font-weight:700;background:var(--surf);border:1.5px solid var(--hatch);color:var(--ink);border-radius:var(--chipr,6px)}} .chip.on{{background:var(--acc);border-color:var(--acc);color:var(--onacc)}}
.pill{{position:absolute;right:14px;top:42px;height:38px;padding:0 14px 0 6px;display:flex;align-items:center;gap:8px;background:var(--surf);color:var(--ink);border-radius:20px;border:1.5px solid var(--hatch)}} .pill b{{font-family:var(--num);font-size:19px}} .pill span{{font-size:13px;color:var(--t2)}}
.grid{{position:absolute;left:16px;right:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}}
.bk{{background:var(--surf);padding:6px 6px 8px;border:1.5px solid var(--hatch);border-radius:var(--bkr,6px)}} .cv{{height:150px;position:relative;overflow:hidden;border-radius:var(--cvr,3px)}}
.bkt{{font-size:13px;font-weight:800;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}} .bka{{font-size:12px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}}
.bk .bar{{height:5px;margin-top:6px}}
'''

def road_path(a, b, R=18):
    (ax, ay), (bx, by) = a, b
    my = (ay + by) / 2; d = 1 if bx > ax else -1
    R = min(R, abs(bx - ax) / 2, my - ay, by - my)
    return f'M{ax} {ay} V{my-R} Q{ax} {my} {ax+d*R} {my} H{bx-d*R} Q{bx} {my} {bx} {my+R} V{by}'

def page(sk, night, body, extra=''):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{css(sk, night)}{extra}</style></head><body><div class="scr">{body}</div></body></html>'

def nav(sk, active):
    rew = {'lamancha': 'shield', 'peterburg': 'feather', 'modern': 'flower'}[sk]
    items = [('book', 'Библиотека'), ('map', 'Путь'), (rew, 'Награды'), ('user', 'Профиль')]
    return '<div class="nav">' + ''.join(f'<a class="{"on" if l == active else ""}">{ic(i, 22)}<span>{l}</span></a>' for i, l in items) + '</div>'

# ---------------- шапка, рамки и фон карты по скинам ----------------
def deco(sk, night):
    """Возвращает словарь: hdr (html шапки), extra css, card-рамки, бейдж главы, фон карты, дорога, узлы."""
    if sk == 'lamancha':
        # шапка: ультрамарин с охряными ромбами (геральдика) + зубцы стены снизу
        hdr = f'''<svg class="abs" width="{W}" height="26" style="top:0"><defs><pattern id="lz" width="20" height="26" patternUnits="userSpaceOnUse"><path d="M10 3l7 10-7 10-7-10z" fill="var(--deco2)" stroke="var(--line)" stroke-width="1.2"/></pattern></defs><rect width="{W}" height="26" fill="var(--deco1)"/><rect width="{W}" height="26" fill="url(#lz)"/><path d="M0 25.5H{W}" stroke="var(--line)" stroke-width="2"/></svg>
<svg class="abs" width="{W}" height="12" style="top:92px"><path d="{''.join(f'M{x} 0h12v6h-12z' for x in range(0, W, 24))}" fill="var(--hdr)"/><path d="M0 0{''.join(f'H{x}V6H{x+12}V0' for x in range(12, W+24, 24))}" fill="none" stroke="var(--line)" stroke-width="2"/></svg>'''
        x = '''.hdr{border-bottom:none}.card{border:2.4px solid var(--line);outline:1.2px solid var(--line);outline-offset:-6px;border-radius:0}.mapc{outline:none}
.nav{border-top:2.4px solid var(--line)}.nav a.on{border:2px solid var(--line)}
.bar{border:1.4px solid var(--line);height:10px}.cht{font-weight:700}.bt{font-weight:700}
.pill{border:2px solid var(--line);border-radius:0}.chip{border:2px solid var(--line);border-radius:0}.bk{border:2px solid var(--line);border-radius:0}.cv{border:1.5px solid var(--line)}'''
        badge = lambda n: f'<div style="position:relative;width:56px;height:62px;flex:none">{svg(M["lam_shield"], 62, cls="abs", style="left:-3px;top:0")}<b style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding-bottom:12px;font-family:var(--disp);font-size:22px;color:#fff;text-shadow:0 0 0 #000;-webkit-text-stroke:3px var(--line);paint-order:stroke fill">{n}</b></div>'
        return dict(hdr=hdr, css=x, badge=badge, node={'': 'lam_tower', 'side': 'lam_mill', 'boss': 'lam_castle'}, road='dash')
    if sk == 'peterburg':
        rail = ''.join(f'M{x} 0V14' for x in range(4, W, 9))
        hdr = f'''<svg class="abs" width="{W}" height="100" style="top:0">
<rect width="{W}" height="100" fill="var(--hdr)"/>{''.join(f'<rect x="{x}" y="0" width="14" height="80" fill="var(--deco3)" opacity="{0.07 if night else 0.35}"/>' for x in range(18, W, 120))}
<path d="M0 80H{W}" stroke="var(--deco3)" stroke-width="6" opacity="{0.25 if night else 0.9}"/><path d="M0 84H{W}" stroke="var(--line)" stroke-width="1.2" opacity=".6"/>
{''.join(f'<rect x="{x}" y="77" width="5" height="4" fill="var(--line)" opacity=".45"/>' for x in range(2, W, 10))}
<rect y="86" width="{W}" height="14" fill="var(--bg)"/><path d="{rail}" stroke="var(--line)" stroke-width="1.6"/><path d="M0 88H{W}M0 98H{W}" stroke="var(--line)" stroke-width="2"/>
{''.join(f'<circle cx="{x}" cy="93" r="2.6" fill="none" stroke="var(--line)" stroke-width="1.2"/>' for x in range(8, W, 18))}</svg>'''
        x = '''.card{border:1.2px solid var(--line);border-top:4px double var(--line);border-radius:0}
.nav{border-top:4px double var(--line)}.nav a{border-radius:0}.cht{font-size:30px;text-transform:uppercase;letter-spacing:.01em;font-weight:800}
.htitle{font-size:36px;text-transform:uppercase;font-weight:800;top:40px}.bt{font-size:20px;font-weight:700}.tag{letter-spacing:.14em}
.sumt b{font-size:26px}.pill{border-radius:0;border:1.2px solid var(--line)}.chip{border-radius:0;border-color:var(--line)}.bk{border-radius:0;border-color:var(--line)}'''
        badge = lambda n: f'<div style="flex:none;width:58px;height:44px;background:#1d3d7a;border-radius:6px;border:2px solid #fff;outline:1.5px solid #1d3d7a;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--num);font-weight:800;font-size:26px">{n}</div>'
        return dict(hdr=hdr, css=x, badge=badge, node={'': 'spb_house', 'side': 'spb_lamp', 'boss': 'spb_spire'}, road='street')
    # modern
    hdr = f'''<svg class="abs" width="{W}" height="104" style="top:0"><rect width="{W}" height="100" fill="var(--hdr)"/>
<path d="M0 92C60 70 90 104 150 86S250 60 300 84 370 96 {W} 76" fill="none" stroke="var(--deco1)" stroke-width="2"/>
<path d="M0 98C70 84 110 110 170 94S270 72 320 92 370 100 {W} 88V104H0z" fill="var(--bg)"/>
<path d="M0 98C70 84 110 110 170 94S270 72 320 92 370 100 {W} 88" fill="none" stroke="var(--deco1)" stroke-width="2.4"/>
<g transform="translate(318 8) scale(.95)" opacity=".95">{M['mod_iris']}</g><g transform="translate(286 30) scale(.62)" opacity=".8">{M['mod_iris']}</g></svg>'''
    x = '''.card{border:1.4px solid var(--deco1);border-radius:16px;box-shadow:inset 0 0 0 4px var(--surf),inset 0 0 0 5px var(--hatch)}
.nav{border-top:1.4px solid var(--deco1);border-radius:22px 22px 0 0}.nav a{border-radius:18px}
.cht{font-size:26px}.htitle{font-size:31px}.bar{border-radius:8px}--x{}
.pill{border-color:var(--deco1)}.chip{border-radius:20px;border-color:var(--deco1)}.bk{border-radius:14px;border-color:var(--hatch)}.cv{border-radius:10px 10px 4px 4px}'''
    badge = lambda n: f'<div style="flex:none;width:56px;height:56px;border-radius:50%;background:var(--acc);border:3px solid var(--deco1);box-shadow:0 0 0 2px var(--surf),0 0 0 3.5px var(--deco1);display:flex;align-items:center;justify-content:center;color:var(--onacc);font-family:var(--disp);font-weight:700;font-size:21px">{n}</div>'
    return dict(hdr=hdr, css=x, badge=badge, node={'': 'mod_station', 'side': 'mod_lamp', 'boss': 'mod_hall'}, road='rail')

def map_bg(sk, night, w, h):
    """Фон карты внутри карточки главы (только декор, под текстом светлый/спокойный)."""
    if sk == 'lamancha':
        s = f'<rect width="{w}" height="{h}" fill="var(--mapbg)"/>'
        # штриховка «гравюры» мелкими рядами
        s += f'<defs><pattern id="ht" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><path d="M0 4.5H9" stroke="var(--hatch)" stroke-width=".7"/></pattern></defs>'
        s += f'<rect width="{w}" height="{h}" fill="url(#ht)" opacity="{.35 if night else .45}"/>'
        if night:
            import random; r = random.Random(3)
            for _ in range(26):
                x, y = r.uniform(8, w-8), r.uniform(8, h-8); z = r.uniform(5, 10)
                s += f'<g transform="translate({x-z/2:.0f} {y-z/2:.0f}) scale({z/64:.3f})" opacity=".55">{M["lam_star"]}</g>'
        return s
    if sk == 'peterburg':
        s = f'<rect width="{w}" height="{h}" fill="var(--mapbg)"/>'
        # кварталы плана: тонкая сетка улиц
        s += f'<defs><pattern id="bl" width="46" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><rect x="3" y="3" width="40" height="28" fill="none" stroke="var(--hatch)" stroke-width="1"/></pattern></defs>'
        s += f'<rect width="{w}" height="{h}" fill="url(#bl)" opacity=".8"/>'
        # Нева и канал — широкие плавные ленты
        s += f'<path d="M-10 {h*.30} C{w*.3} {h*.22} {w*.55} {h*.40} {w+10} {h*.33} V{h*.33+30} C{w*.55} {h*.40+30} {w*.3} {h*.22+30} -10 {h*.30+34}z" fill="var(--water)"/>'
        s += f'<path d="M-10 {h*.30} C{w*.3} {h*.22} {w*.55} {h*.40} {w+10} {h*.33}M-10 {h*.30+34} C{w*.3} {h*.22+30} {w*.55} {h*.40+30} {w+10} {h*.33+30}" fill="none" stroke="var(--water2)" stroke-width="2"/>'
        s += f'<path d="M-10 {h*.74} C{w*.4} {h*.70} {w*.6} {h*.80} {w+10} {h*.72}" fill="none" stroke="var(--water)" stroke-width="14"/><path d="M-10 {h*.74} C{w*.4} {h*.70} {w*.6} {h*.80} {w+10} {h*.72}" fill="none" stroke="var(--water2)" stroke-width="1.4" stroke-dasharray="6 5"/>'
        if night:
            import random; r = random.Random(5)
            for _ in range(34):
                x, y = r.uniform(4, w-4), r.uniform(4, h-4); z = r.uniform(4, 8)
                s += f'<g transform="translate({x-z/2:.0f} {y-z/2:.0f}) scale({z/64:.3f})" opacity=".45">{M["spb_snow"]}</g>'
        return s
    s = f'<rect width="{w}" height="{h}" fill="var(--mapbg)"/>'
    for i in range(5):
        y = 40 + i * h / 5
        s += f'<path d="M-10 {y:.0f}C{w*.25:.0f} {y-30:.0f} {w*.45:.0f} {y+40:.0f} {w*.7:.0f} {y+6:.0f}S{w+10:.0f} {y-26:.0f} {w+20:.0f} {y+10:.0f}" fill="none" stroke="var(--hatch)" stroke-width="1.2"/>'
    return s

def road_svg(kind, pts, done_pairs):
    s = ''
    for i in range(1, len(pts)):
        d = road_path(pts[i-1], pts[i]); on = done_pairs[i-1]
        if kind == 'dash':
            s += f'<path d="{d}" fill="none" stroke="var(--line)" stroke-width="6" stroke-linecap="round" opacity=".18"/>'
            s += f'<path d="{d}" fill="none" stroke="var(--road)" stroke-width="3.2" stroke-dasharray="{"0" if on else "9 7"}" stroke-linecap="round"/>'
        elif kind == 'street':
            s += f'<path d="{d}" fill="none" stroke="var(--line)" stroke-width="13" stroke-linecap="round"/>'
            s += f'<path d="{d}" fill="none" stroke="{"var(--deco1)" if on else "var(--surf)"}" stroke-width="9" stroke-linecap="round"/>'
            s += f'<path d="{d}" fill="none" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="3 6" opacity=".55"/>'
        else:  # rail: шпалы + два рельса
            s += f'<path d="{d}" fill="none" stroke="var(--road)" stroke-width="15" stroke-dasharray="2.4 5.6" opacity=".75"/>'
            s += f'<path d="{d}" fill="none" stroke="{"var(--acc)" if on else "var(--line)"}" stroke-width="8"/>'
            s += f'<path d="{d}" fill="none" stroke="var(--mapbg)" stroke-width="4.4"/>'
    return s

# ---------------- экран «Путь» ----------------
def lab_h(b):
    lines = 1 if len(b['t']) <= 14 else 2
    return (16 if b['kind'] in ('boss', 'side') else 0) + lines * 22 + 22 + 26

def scr_map(sk, night):
    p = P[sk]; dc = deco(sk, night); ch = CH[p['ch']]
    body = f'<div class="hdr">{dc["hdr"]}<div class="hmenu">{ic("menu", 26, 2)}</div><div class="htitle">Путь читателя</div></div><div class="col">'
    body += f'''<div class="card" style="padding:16px 18px"><div class="sumt"><b>6 из 14</b> книг прочитано</div>
<div class="bar" style="margin-top:10px"><i style="width:43%"></i></div><div class="sums">Звание: <b>Слушатель рапсодов</b></div></div>'''
    n = len(ch['books']); cw = W - 32
    ch_done = sum(1 for b in ch['books'] if b['st'] == 'done')
    head = f'<div class="chh" style="padding:16px 16px 0;position:relative;z-index:2">{dc["badge"](p["ch"])}<div><div class="cht">{ch["t"]}</div><div class="chs">{ch_done} из {n} · звание «{ch["rank"]}»</div></div></div>'
    pts = []; nodes = ''; y = 70
    for i, b in enumerate(ch['books']):
        sz = 92 if b['kind'] == 'boss' else (58 if b['kind'] == 'side' else 72)
        lh = lab_h(b); blk = max(sz + 14, lh)
        cy = y + blk / 2; y += blk + 58
        left = i % 2 == 0; cx = 74 if left else cw - 74
        pts.append((cx, cy))
        art = svg(M[dc['node'][b['kind']]], sz)
        halo = f'<div style="position:absolute;left:-8px;top:-8px;width:{sz+16}px;height:{sz+16}px;border-radius:50%;background:var(--mapbg);opacity:.85"></div>'
        badge = ''
        if b['st'] == 'done':
            badge = f'<div class="ok" style="left:-6px;top:{sz-20}px">{ic("check", 15, 3)}</div>'
        elif b['st'] == 'started':
            badge = f'<div class="pb" style="left:{sz/2-30}px;top:{sz+3}px;width:60px"><i style="width:{b["pct"]}%"></i></div>'
        nodes += f'<div class="node" style="left:{cx-sz/2}px;top:{cy-sz/2}px;width:{sz}px;height:{sz}px">{halo}<div style="position:relative">{art}</div>{badge}</div>'
        tag = 'Главная книга главы' if b['kind'] == 'boss' else ('Рассказ' if b['kind'] == 'side' else '')
        st = 'Прочитано' if b['st'] == 'done' else (f'{b["pct"]}%' if b['st'] == 'started' else b['hrs'])
        lx = cx + sz / 2 + 14 if left else cx - sz / 2 - 14 - 200
        nodes += f'<div class="lab {"" if left else "r"}" style="left:{lx}px;top:{cy-lh/2}px">{f"<div class=tag>{tag}</div>" if tag else ""}<div class="bt">{b["t"]}</div><div class="ba">{b["a"]}</div><div class="bs {"" if b["st"] else "mute"}">{st}</div></div>'
    mh = y + 40
    done_pairs = [ch['books'][i]['st'] == 'done' and ch['books'][i+1]['st'] == 'done' for i in range(n-1)]
    bg = map_bg(sk, night, cw, mh)
    yb = pts[-1][1]; last_left = (n-1) % 2 == 0
    if sk == 'lamancha':
        dec = (f'<g transform="translate({cw-96} {yb+20}) scale(.95)">{M["lam_mill"]}</g><g transform="translate({cw-160} {yb+66}) scale(.55)">{M["lam_hill"]}</g><g transform="translate({cw-40} {yb+60}) scale(.45)">{M["lam_tree"]}</g>' if last_left
               else f'<g transform="translate(14 {yb+20}) scale(.95)">{M["lam_mill"]}</g><g transform="translate(74 {yb+66}) scale(.45)">{M["lam_tree"]}</g>')
        dec += f'<g transform="translate({cw-150} {pts[1][1]-70}) scale(.5)">{M["lam_hill"]}</g><g transform="translate({cw-120} {pts[1][1]-78}) scale(.4)">{M["lam_tree"]}</g>'
        dec += f'<g transform="translate(26 {pts[1][1]-30}) scale(.55)">{M["lam_hill"]}</g>'
    elif sk == 'peterburg':
        dec = f'<g transform="translate({cw-96} {yb+34}) scale(1.2)">{M["spb_bridge"]}</g>' if last_left else f'<g transform="translate(12 {yb+40}) scale(1.2)">{M["spb_bridge"]}</g>'
    else:
        dec = (f'<g transform="translate({cw-130} {yb+40}) scale(1.5)">{M["mod_loco"]}</g>' if last_left else f'<g transform="translate(10 {yb+40}) scale(1.5)">{M["mod_loco"]}</g>')
        dec += f'<g transform="translate({cw-70} {pts[0][1]-30}) scale(.8)">{M["mod_clock"]}</g><g transform="translate({cw-80} {yb+44}) scale(1.0)" opacity=".9">{M["mod_iris"]}</g>'
    mapsvg = f'<svg class="abs" style="left:0;top:0" width="{cw}" height="{mh}">{bg}{dec}{road_svg(dc["road"], pts, done_pairs)}</svg>'
    body += f'<div class="card mapc" style="overflow:hidden;background:var(--mapbg)">{head}<div style="position:relative;height:{mh}px;margin-top:-56px">{mapsvg}{nodes}</div></div>'
    body += '</div>' + nav(sk, 'Путь')
    return page(sk, night, body, dc['css'])

# ---------------- обложки ----------------
def cover(sk, i, t, a, fmt):
    motifs = {'lamancha': ['lam_mill', 'lam_castle', 'lam_tree', 'lam_shield', 'lam_mill', 'lam_star'],
              'peterburg': ['spb_bridge', 'spb_lamp', 'spb_house', 'spb_house', 'spb_spire', 'spb_snow'],
              'modern': ['mod_feather', 'mod_loco', 'mod_clock', 'mod_iris', 'mod_lamp', 'mod_lamp']}[sk]
    kinds = ['a', 'b', 'c', 'b', 'a', 'c'][i]
    if sk == 'lamancha':
        bgc = {'a': 'var(--deco1)', 'b': 'var(--surf2)', 'c': 'var(--deco3)'}[kinds]; fg = '#fff' if kinds != 'b' else 'var(--ink)'
        top = f'<div style="background:{bgc};height:100%;border-bottom:2px solid var(--line)"></div>'
    elif sk == 'peterburg':
        bgc = {'a': 'var(--hdr)', 'b': 'var(--acc)', 'c': '#1b1f24'}[kinds]; fg = 'var(--ink)' if kinds == 'a' else '#fff'
    else:
        bgc = {'a': 'var(--acc)', 'b': 'var(--surf2)', 'c': '#3d2a48'}[kinds]; fg = 'var(--ink)' if kinds == 'b' else '#fff'
    art = svg(M[motifs[i]], 54, style='position:absolute;left:50%;bottom:10px;transform:translateX(-50%)')
    frame = {'lamancha': 'inset 0 0 0 4px rgba(255,255,255,.0)', 'peterburg': f'inset 0 0 0 5px {bgc}, inset 0 0 0 6px rgba(255,255,255,.55)', 'modern': 'inset 0 0 0 5px rgba(0,0,0,0),inset 0 0 0 6px var(--deco1)'}[sk]
    ttlf = 'var(--ttl)' if sk != 'peterburg' else "'Noto Serif Display'"
    return f'''<div class="cv" style="background:{bgc};color:{fg};box-shadow:{frame}"><div style="position:absolute;top:10px;left:0;right:0;text-align:center;font-size:9.5px;font-weight:800;letter-spacing:.12em;opacity:.85">{fmt}</div>
<div style="position:absolute;top:26px;left:8px;right:8px;text-align:center;font-family:{ttlf};font-size:15px;font-weight:700;line-height:1.1">{t}</div>
<div style="position:absolute;top:84px;left:0;right:0;text-align:center;font-size:10px;font-weight:700;opacity:.9;display:none">{a}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:70px;{"background:var(--surf2);border-top:2px solid var(--line)" if sk=="lamancha" and kinds=="c" else ""}"></div>{art}</div>'''

def scr_lib(sk, night=False):
    p = P[sk]; dc = deco(sk, night)
    coin = {'lamancha': 'lam_coin', 'peterburg': 'spb_coin', 'modern': 'mod_coin'}[sk]
    mascot = {'lamancha': 'lam_donkey', 'peterburg': 'spb_cat', 'modern': 'mod_peacock'}[sk]
    body = f'<div class="hdr">{dc["hdr"]}<div class="htitle" style="left:18px">Библиотека</div><div class="pill">{svg(M[coin], 28)}<b>390</b><span>монет</span></div></div>'
    body += '<div class="chips" style="position:absolute;left:16px;top:120px"><span class="chip on">Все</span><span class="chip">Читаю</span><span class="chip">Хочу</span><span class="chip">Прочитано</span></div>'
    cells = ''
    for i, (t, a, f, pc) in enumerate(LIB[sk]):
        stt = 'прочитано' if pc == 100 else ('не начата' if pc == 0 else f'{pc}%')
        cells += f'<div class="bk">{cover(sk, i, t, a, f)}<div class="bkt">{t}</div><div class="bka">{a} · {stt}</div><div class="bar"><i style="width:{pc}%"></i></div></div>'
    body += f'<div class="grid" style="top:172px">{cells}</div>'
    body += f'<div class="abs" style="right:16px;bottom:92px;z-index:3">{svg(M[mascot], 76)}</div>'
    body += nav(sk, 'Библиотека')
    return page(sk, night, body, dc['css'])

if __name__ == '__main__':
    jobs = []
    for sk in P:
        for night in (False, True):
            fn = f'{OUT}/{sk}-put-{"noch" if night else "den"}'
            open(fn + '.html', 'w').write(scr_map(sk, night)); jobs += [fn + '.png', fn + '.html']
        for night in (False, True):
            fn = f'{OUT}/{sk}-biblioteka-{"noch" if night else "den"}'
            open(fn + '.html', 'w').write(scr_lib(sk, night)); jobs += [fn + '.png', fn + '.html']
    subprocess.run(['node', D + '/render.cjs'] + jobs, check=True)
    print('ok', len(jobs) // 2)
