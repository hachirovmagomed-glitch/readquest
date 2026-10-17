#!/usr/bin/env python3
# ReadQuest · скины глав «Пути читателя» (Джессика 16–17.10: свой скин под каждый роадмап; открывается бесплатно, когда глава дочитана).
# Writes handoff/skins/{lamancha,peterburg,modern}/tokens.css and the generated block 4 of source/skins/skins.css.
# Drawings = handoff/roadmap-skins (макеты): our own simple silhouettes. Run: python3 source/tools/gen-chapter-skins.py

# ---------------- art palettes (decor colours, from the mockups) ----------------
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


# ---------------- motifs (64×64) ----------------
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


# ---------------- tokens (stage1-final names) ----------------
TOK = {
 'lamancha': dict(
  title='«Ламанча» (глава II «Странники и рыцари»): раскрашенная от руки гравюра — чернила, ультрамарин, охра, киноварь',
  fonts=('--rq-font-ui:"Spectral",Georgia,serif', '--rq-font-display:"Bona Nova SC","Spectral",Georgia,serif', '--rq-font-num:"Spectral SC","Spectral",Georgia,serif', '--rq-font-read:Georgia,serif'),
  radius='--rq-radius-xs:0; --rq-radius-sm:2px; --rq-radius-md:2px; --rq-radius-lg:4px;',
  day=dict(bg='#efe6d2', surface='#fbf6ea', surface2='#f3ead6', line='#cbbd9f', strong='#6b5a44', text='#1d1a17', text2='#55483a', dis='#a3957c',
           accent='#9e2a1c', pressed='#7f2015', on='#ffffff', tint='#f5ddd5', aborder='#d48b7e', coin='#7a4a10', cointint='#f6e7c8', ok='#3d5a2a', oktint='#e3ebd6',
           danger='#a3281f', dangertint='#f8dedb', scrim='rgba(29,26,23,.45)', badge=('#1d1a17', '#fbf6ea'), game=('#1d1a17', '#fbf6ea'), info=('#fbf6ea', '#1d1a17', '#9e2a1c', '#6b5a44'),
           sh2='0 0 0 2px #1d1a17,0 0 0 5px #fbf6ea,0 0 0 6px #1d1a17,0 8px 18px rgba(29,26,23,.14)', page=('#fbf7ee', '#1d1a17', '#55483a', '0')),
  night=dict(bg='#11141f', surface='#1b1f2d', surface2='#242a3b', line='#333a4f', strong='#6d7590', text='#efe6d2', text2='#bfb5a2', dis='#5f6680',
           accent='#f08a6e', pressed='#f6a58e', on='#1d1a17', tint='#2c2226', aborder='#a0503f', coin='#f2c76a', cointint='#2c2818', ok='#b7d39a', oktint='#1f2a1c',
           danger='#ff9c8f', dangertint='#3a1a1c', scrim='rgba(5,6,10,.7)', badge=('#efe6d2', '#11141f'), game=('#242a3b', '#f08a6e'), info=('#242a3b', '#efe6d2', '#f08a6e', '#333a4f'),
           sh2='0 0 0 2px #d8cdb6,0 0 0 5px #1b1f2d,0 0 0 6px #4a5268,0 12px 32px rgba(0,0,0,.6)', page=('#10131c', '#e6dcc8', '#a99f8c', '.35'))),
 'peterburg': dict(
  title='«Петербург» (глава III «Век романа»): гравированный план города, охристый фасад, чугунная решётка, газовый свет',
  fonts=('--rq-font-ui:"Onest",system-ui,sans-serif', '--rq-font-display:"Sofia Sans Extra Condensed","Onest",sans-serif', '--rq-font-num:"Sofia Sans Extra Condensed","Onest",sans-serif', '--rq-font-read:Georgia,serif', '--pb-font-title:"Noto Serif Display",Georgia,serif'),
  radius='--rq-radius-xs:0; --rq-radius-sm:2px; --rq-radius-md:2px; --rq-radius-lg:4px;',
  day=dict(bg='#eceae4', surface='#fbfaf6', surface2='#f1efe8', line='#cfcac0', strong='#5d646c', text='#1b1f24', text2='#4c535c', dis='#a3a7ab',
           accent='#1d5a5b', pressed='#164748', on='#ffffff', tint='#dde9e8', aborder='#8fb5b5', coin='#7b4a1e', cointint='#f5e8d6', ok='#2f6a3a', oktint='#e0ecdf',
           danger='#a3281f', dangertint='#f8dedb', scrim='rgba(27,31,36,.45)', badge=('#1b1f24', '#fbfaf6'), game=('#1d5a5b', '#ffffff'), info=('#fbfaf6', '#1b1f24', '#1d5a5b', '#5d646c'),
           sh2='0 0 0 1.2px #1b1f24,0 -3px 0 0 #fbfaf6,0 -4.2px 0 0 #1b1f24,0 8px 18px rgba(27,31,36,.10)', page=('#fbfaf6', '#1b1f24', '#4c535c', '0')),
  night=dict(bg='#0e1419', surface='#18212a', surface2='#212c37', line='#2c3844', strong='#5f7080', text='#eef0f1', text2='#b6bec6', dis='#5a6672',
           accent='#f2c14e', pressed='#f7d47c', on='#1b1f24', tint='#2a2616', aborder='#8c7230', coin='#f2c14e', cointint='#2a2616', ok='#a8d5a0', oktint='#1c2a1f',
           danger='#ff9c8f', dangertint='#3a1a1c', scrim='rgba(4,6,8,.7)', badge=('#eef0f1', '#0e1419'), game=('#212c37', '#f2c14e'), info=('#212c37', '#eef0f1', '#f2c14e', '#2c3844'),
           sh2='0 0 0 1.2px #c9d1d8,0 -3px 0 0 #18212a,0 -4.2px 0 0 #c9d1d8,0 12px 32px rgba(0,0,0,.6)', page=('#0f151a', '#e3e7ea', '#a9b2ba', '.35'))),
 'modern': dict(
  title='«Модерн» (глава IV «На пороге нового века»): ирисы, павлинье перо, золото по бирюзе, железная дорога и вокзалы',
  fonts=('--rq-font-ui:"Ysabeau Infant",system-ui,sans-serif', '--rq-font-display:"Ysabeau SC","Ysabeau Infant",sans-serif', '--rq-font-num:"Jura","Ysabeau Infant",sans-serif', '--rq-font-read:Georgia,serif'),
  radius='--rq-radius-xs:8px; --rq-radius-sm:12px; --rq-radius-md:16px; --rq-radius-lg:22px;',
  day=dict(bg='#f3eee2', surface='#fcf9f1', surface2='#efe8d8', line='#d9cfb8', strong='#7a6a50', text='#1f1a22', text2='#544a58', dis='#a89ea8',
           accent='#0f5e63', pressed='#0b4a4e', on='#ffffff', tint='#dcebe9', aborder='#86b5b3', coin='#7a5a14', cointint='#f4ead0', ok='#3f6a3a', oktint='#e2eddc',
           danger='#a3281f', dangertint='#f8dedb', scrim='rgba(31,26,34,.45)', badge=('#1f1a22', '#fcf9f1'), game=('#0f4c50', '#f6efdc'), info=('#fcf9f1', '#1f1a22', '#0f5e63', '#7a6a50'),
           sh2='0 0 0 1.4px #b08d3e,0 0 0 4px #fcf9f1,0 0 0 5px #d9cfb8,0 8px 18px rgba(31,26,34,.10)', page=('#fbf8f0', '#1f1a22', '#544a58', '0')),
  night=dict(bg='#150f19', surface='#221a28', surface2='#2c2234', line='#3a3044', strong='#77688a', text='#f3ecf4', text2='#c4b6c8', dis='#6a5e70',
           accent='#7fd1c7', pressed='#a3e0d8', on='#11201f', tint='#1b2b2b', aborder='#4f8d86', coin='#e7c56f', cointint='#2c2616', ok='#b5d6a3', oktint='#1f2a1c',
           danger='#ff9c8f', dangertint='#3a1a22', scrim='rgba(6,4,8,.7)', badge=('#f3ecf4', '#150f19'), game=('#2c2234', '#7fd1c7'), info=('#2c2234', '#f3ecf4', '#7fd1c7', '#3a3044'),
           sh2='0 0 0 1.4px #d4b05a,0 0 0 4px #221a28,0 0 0 5px #3a3044,0 12px 32px rgba(0,0,0,.6)', page=('#140f17', '#ebe2ec', '#b4a6b8', '.35'))),
}

def tokens_css(sk):
    t = TOK[sk]
    def block(c, night):
        sel = f'[data-skin="{sk}"]' + ('[data-theme="night"]' if night else '')
        L = [f'{sel}{{']
        if not night:
            L.append('  ' + '; '.join(t['fonts']) + ';')
            L.append('  ' + t['radius'] + ' --rq-icon-stroke:1.8;')
        L.append(f"  --rq-bg:{c['bg']}; --rq-surface:{c['surface']}; --rq-surface-2:{c['surface2']}; --rq-sheet:{c['surface']};")
        L.append(f"  --rq-line:{c['line']}; --rq-border-strong:{c['strong']};")
        L.append(f"  --rq-text:{c['text']}; --rq-text-2:{c['text2']}; --rq-text-disabled:{c['dis']};")
        L.append(f"  --rq-accent:{c['accent']}; --rq-accent-pressed:{c['pressed']}; --rq-accent-text:{c['accent']};")
        L.append(f"  --rq-on-accent:{c['on']}; --rq-control-on:{c['on']};")
        L.append(f"  --rq-accent-tint:{c['tint']}; --rq-accent-border:{c['aborder']};")
        L.append(f"  --rq-coin:{c['coin']}; --rq-coin-tint:{c['cointint']};")
        L.append(f"  --rq-success:{c['ok']}; --rq-success-tint:{c['oktint']};")
        L.append(f"  --rq-danger:{c['danger']}; --rq-danger-tint:{c['dangertint']};")
        L.append(f"  --rq-focus:{c['accent']}; --rq-scrim:{c['scrim']};")
        L.append(f"  --rq-badge-bg:{c['badge'][0]}; --rq-badge-text:{c['badge'][1]};")
        L.append(f"  --rq-toast-game-bg:{c['game'][0]}; --rq-toast-game-fg:{c['game'][1]};")
        L.append(f"  --rq-toast-info-bg:{c['info'][0]}; --rq-toast-info-fg:{c['info'][1]}; --rq-toast-info-icon:{c['info'][2]}; --rq-toast-info-border:{c['info'][3]};")
        L.append(f"  --rq-toast-error-bg:{c['danger']}; --rq-toast-error-fg:{'#ffffff' if not night else '#2a0a08'};")
        L.append(f"  --rq-shadow-1:{'0 2px 8px rgba(0,0,0,.12)' if not night else '0 1px 2px rgba(0,0,0,.5)'}; --rq-shadow-2:{c['sh2']}; --rq-shadow-3:{'0 14px 40px rgba(0,0,0,.28)' if not night else '0 12px 40px rgba(0,0,0,.75)'};")
        L.append('}')
        return '\n'.join(L)
    d, n = t['day'], t['night']
    return (f'/* ReadQuest · скин {t["title"]}. Скин главы «Пути читателя»: открывается бесплатно, когда глава дочитана (16–17.10.2026).\n'
            f'   Генерируется source/tools/gen-chapter-skins.py — правьте там. Имена токенов = stage1-final/tokens.css. Шрифты (OFL) — source/fonts/{sk}-*.woff2. */\n'
            + block(d, False) + '\n' + block(n, True) + '\n'
            f'/* Страница книги: чистая, без декора. */\n'
            f'[data-skin="{sk}"] [data-page="day"]{{--r-bg:{d["page"][0]};--r-txt:{d["page"][1]};--r-txt-2:{d["page"][2]};--r-dim:{d["page"][3]};}}\n'
            f'[data-skin="{sk}"] [data-page="night"]{{--r-bg:{n["page"][0]};--r-txt:{n["page"][1]};--r-txt-2:{n["page"][2]};--r-dim:{n["page"][3]};}}\n'
            f'@media (prefers-reduced-motion:reduce){{\n  [data-skin="{sk}"] *,[data-skin="{sk}"] *::before,[data-skin="{sk}"] *::after{{animation:none!important;transition:none!important}}\n}}\n')

# ---------------- art → data URI ----------------
import re, urllib.parse
def art(name, pal, vb=64, extra=''):
    s = M[name]
    s = re.sub(r'var\(--(\w+)\)', lambda m: pal[m.group(1)], s)
    return f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {vb} {vb}'>{extra}{s}</svg>"
def uri(svg_text):
    svg_text = svg_text.replace('"', "'")
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg_text, safe=" /=:;,.'()-#") .replace('#', '%23') + '")'

def raw_uri(svg_text):
    return uri(svg_text)

# ---------------- per-skin decor ----------------
FONTFACES = {
 'lamancha': [('Bona Nova SC', 700, 'lamancha-bonanovasc-bold'), ('Spectral', 500, 'lamancha-spectral-medium'), ('Spectral', 700, 'lamancha-spectral-bold'), ('Spectral SC', 700, 'lamancha-spectralsc-bold')],
 'peterburg': [('Sofia Sans Extra Condensed', 800, 'peterburg-sofiasansxc-extrabold'), ('Onest', 500, 'peterburg-onest-medium'), ('Onest', 700, 'peterburg-onest-bold'), ('Noto Serif Display', 700, 'peterburg-notoserifdisplay-bold')],
 'modern': [('Ysabeau SC', 700, 'modern-ysabeausc-bold'), ('Ysabeau Infant', 500, 'modern-ysabeauinfant-medium'), ('Ysabeau Infant', 800, 'modern-ysabeauinfant-extrabold'), ('Jura', 700, 'modern-jura-bold')],
}
NODES = {'lamancha': ('lam_tower', 'lam_mill', 'lam_castle'), 'peterburg': ('spb_house', 'spb_lamp', 'spb_spire'), 'modern': ('mod_station', 'mod_lamp', 'mod_hall')}
COIN = {'lamancha': 'lam_coin', 'peterburg': 'spb_coin', 'modern': 'mod_coin'}
MASCOT = {'lamancha': 'lam_donkey', 'peterburg': 'spb_cat', 'modern': 'mod_peacock'}
COVER_ART = {'lamancha': ['lam_mill', 'lam_castle', 'lam_tree', 'lam_shield', 'lam_tower', 'lam_star'],
             'peterburg': ['spb_bridge', 'spb_lamp', 'spb_house', 'spb_spire', 'spb_house', 'spb_snow'],
             'modern': ['mod_feather', 'mod_loco', 'mod_clock', 'mod_iris', 'mod_lamp', 'mod_station']}
CORNER = {'lamancha': 'lam_mill', 'peterburg': 'spb_bridge', 'modern': 'mod_loco'}

def patterns(sk, c):
    """Background tiles (day/night palette c): screen texture and the chapter map."""
    if sk == 'lamancha':
        hatch = f"<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M-3 9L9 -3M3 15L15 3' stroke='{c['hatch']}' stroke-width='.8' stroke-opacity='.55'/></svg>"
        lz = f"<svg xmlns='http://www.w3.org/2000/svg' width='20' height='16' viewBox='0 0 20 16'><rect width='20' height='16' fill='{c['deco1']}'/><path d='M10 2l6 6-6 6-6-6z' fill='{c['deco2']}' stroke='{c['line'] if not c is None else '#000'}' stroke-width='1'/></svg>"
        crenel = f"<svg xmlns='http://www.w3.org/2000/svg' width='24' height='10' viewBox='0 0 24 10'><path d='M0 0H12V5H24V10H0z' fill='{c['surf']}'/><path d='M0 .8H11.2V5.8H24' fill='none' stroke='{c['line']}' stroke-width='1.6'/></svg>"
        return dict(tex=hatch, band=lz, edge=crenel)
    if sk == 'peterburg':
        blocks = f"<svg xmlns='http://www.w3.org/2000/svg' width='46' height='34' viewBox='0 0 46 34'><rect x='3' y='3' width='40' height='28' fill='none' stroke='{c['hatch']}' stroke-width='1' stroke-opacity='.55'/></svg>"
        rail = (f"<svg xmlns='http://www.w3.org/2000/svg' width='18' height='14' viewBox='0 0 18 14'><rect width='18' height='14' fill='{c['bg']}'/><path d='M0 2H18M0 12H18' stroke='{c['line']}' stroke-width='2'/>"
                f"<path d='M4 2V12M13 2V12' stroke='{c['line']}' stroke-width='1.4'/><circle cx='8.5' cy='7' r='2.4' fill='none' stroke='{c['line']}' stroke-width='1.1'/></svg>")
        river = (f"<svg xmlns='http://www.w3.org/2000/svg' width='400' height='80' viewBox='0 0 400 80' preserveAspectRatio='none'><path d='M0 30C120 8 220 52 400 22V58C220 88 120 44 0 66z' fill='{c['water']}'/>"
                 f"<path d='M0 30C120 8 220 52 400 22M0 66C120 44 220 88 400 58' fill='none' stroke='{c['water2']}' stroke-width='2'/></svg>")
        return dict(tex=None, band=None, edge=rail, blocks=blocks, river=river)
    whip = f"<svg xmlns='http://www.w3.org/2000/svg' width='240' height='120' viewBox='0 0 240 120'><path d='M-10 40C50 10 90 80 150 46S230 20 250 50' fill='none' stroke='{c['hatch']}' stroke-width='1.3'/><path d='M-10 100C60 76 100 128 170 100S230 84 250 104' fill='none' stroke='{c['hatch']}' stroke-width='1.1'/></svg>"
    wave = f"<svg xmlns='http://www.w3.org/2000/svg' width='120' height='16' viewBox='0 0 120 16'><path d='M0 9C20 0 40 16 60 8S100 0 120 9' fill='none' stroke='{c['deco1']}' stroke-width='2.2'/><path d='M0 14C20 6 40 18 60 13S100 6 120 14' fill='none' stroke='{c['deco1']}' stroke-width='1.1' opacity='.7'/></svg>"
    return dict(tex=whip, band=None, edge=wave)

def chapter_css(sk):
    p = P[sk]; d, n = p['day'], p['night']
    S = f'html[data-skin="{sk}"]'; SN = f'html[data-skin="{sk}"][data-theme="night"]'
    out = [f'/* ----- «{p["name"]}» (handoff/skins/{sk}, глава {p["ch"]}) ----- */']
    for fam, w, f in FONTFACES[sk]:
        out.append(f'@font-face{{font-family:"{fam}";src:url(../fonts/{f}.woff2) format("woff2");font-weight:{w};font-display:swap}}')
    def vars_for(c):
        pt = patterns(sk, c); v = []
        for i, k in enumerate(('', '-side', '-boss')):
            v.append(f'--cs-node{k}:{uri(art(NODES[sk][i], c))}')
        v.append(f'--cs-coin:{uri(art(COIN[sk], c))}')
        v.append(f'--cs-mascot:{uri(art(MASCOT[sk], c))}')
        v.append(f'--cs-corner:{uri(art(CORNER[sk], c))}')
        for i, m in enumerate(COVER_ART[sk]):
            v.append(f'--cs-cv{i}:{uri(art(m, c))}')
        for k, val in pt.items():
            if val: v.append(f'--cs-{k}:{uri(val)}')
        if sk == 'modern':
            v.append(f'--cs-iris:{uri(art("mod_iris", c))}')
        if sk == 'lamancha':
            v.append(f'--cs-shield:{uri(art("lam_shield", c))}')
        return ';'.join(v)
    out.append(f'{S}{{{vars_for(d)};--cs-mapbg:{d["mapbg"]};--cs-ink:{d["line"]};--cs-road:{d["road"]};--cs-d1:{d["deco1"]};--cs-d2:{d["deco2"]};--cs-d3:{d["deco3"]};--cs-hdr:{d["hdr"]};--cs-hdrink:{d["hdrink"]}}}')
    out.append(f'{SN}{{{vars_for(n)};--cs-mapbg:{n["mapbg"]};--cs-ink:{n["line"]};--cs-road:{n["road"]};--cs-d1:{n["deco1"]};--cs-d2:{n["deco2"]};--cs-d3:{n["deco3"]};--cs-hdr:{n["hdr"]};--cs-hdrink:{n["hdrink"]}}}')
    R = []  # rules
    R.append(f'{S} body{{font-weight:500;font-variant-numeric:lining-nums}}')
    # titles and numbers
    R.append(f'{S} :is(#libTitle,.wrap > .row > h1,#rewardsSheet h3,.shopname,.pathch-h b){{font-family:var(--rq-font-display);font-weight:{800 if sk=="peterburg" else 700};letter-spacing:.01em}}')
    R.append(f'{S} :is(.libgold,.bigxp,#ringTxt,.shopprice,.pathsum-t b){{font-family:var(--rq-font-num);font-weight:{800 if sk=="peterburg" else 700}}}')
    # library header
    if sk == 'lamancha':
        R.append(f'{S} body{{background:var(--cs-tex) 0 0/12px 12px repeat,var(--rq-bg);background-attachment:fixed}}')
        R.append(f'{S} #libHead{{position:relative;margin:-20px -18px 20px;padding:34px 14px 24px;background:var(--rq-surface);color:var(--rq-text)}}')
        R.append(f'{S} #libHead::before{{content:"";position:absolute;left:0;right:0;top:0;height:16px;background:var(--cs-band) 0 0/20px 16px repeat-x;box-shadow:0 2px 0 var(--cs-ink);pointer-events:none}}')
        R.append(f'{S} #libHead::after{{content:"";position:absolute;left:0;right:0;bottom:-10px;height:10px;background:var(--cs-edge) 0 0/24px 10px repeat-x;pointer-events:none}}')
        R.append(f'{S} #botnav{{border-top:2px solid var(--cs-ink)}}')
        R.append(f'{S} .botnav-btn.on{{box-shadow:inset 0 0 0 2px var(--cs-ink)}}')
        R.append(f'{S} :is(.fchip,.lsortbtn,#btnAdd.addicon,.stepbtn,.ghostbtn,.searchinp){{border-radius:0}}')
        R.append(f'{S} .fchip{{box-shadow:inset 0 0 0 2px var(--cs-ink)}}')
    elif sk == 'peterburg':
        R.append(f'{S} body{{background:var(--rq-bg)}}')
        R.append(f'{S} #libHead{{position:relative;margin:-20px -18px 26px;padding:30px 14px 20px;color:var(--cs-hdrink);background:repeating-linear-gradient(90deg,transparent 0 22px,rgba(255,255,255,.28) 22px 36px,transparent 36px 120px),var(--cs-hdr);box-shadow:inset 0 -6px 0 rgba(255,255,255,.55),inset 0 -7.5px 0 rgba(27,31,36,.35)}}')
        R.append(f'{SN} #libHead{{background:repeating-linear-gradient(90deg,transparent 0 22px,rgba(255,255,255,.05) 22px 36px,transparent 36px 120px),var(--cs-hdr);box-shadow:inset 0 -6px 0 rgba(242,193,78,.18),inset 0 -7.5px 0 rgba(0,0,0,.4)}}')
        R.append(f'{S} #libHead::after{{content:"";position:absolute;left:0;right:0;bottom:-14px;height:14px;background:var(--cs-edge) 0 0/18px 14px repeat-x;pointer-events:none}}')
        R.append(f'{S} #libHead :is(h1,.libgold,button,.iconbtn44){{color:var(--cs-hdrink)}}')
        R.append(f'{S} #libTitle{{text-transform:uppercase;font-size:32px;line-height:1}}')
        R.append(f'{S} #botnav{{border-top:0;box-shadow:0 -1.2px 0 var(--cs-ink),0 -4px 0 var(--rq-surface),0 -5.2px 0 var(--cs-ink)}}')
        R.append(f'{S} :is(.fchip,.lsortbtn,#btnAdd.addicon,.stepbtn,.ghostbtn,.searchinp,.botnav-btn){{border-radius:0}}')
        R.append(f'{S} .fchip{{box-shadow:inset 0 0 0 1.2px var(--cs-ink)}}')
    else:
        R.append(f'{S} body{{background:var(--cs-tex) 0 0/240px 120px repeat,var(--rq-bg);background-attachment:fixed}}')
        R.append(f'{S} #libHead{{position:relative;margin:-20px -18px 24px;padding:30px 14px 26px;color:var(--cs-hdrink);background:var(--cs-hdr)}}')
        R.append(f'{S} #libHead::after{{content:"";position:absolute;left:0;right:0;bottom:-8px;height:16px;background:var(--cs-edge) 0 0/120px 16px repeat-x;pointer-events:none}}')
        R.append(f'{S} #libHead :is(h1,.libgold,button,.iconbtn44){{color:var(--cs-hdrink)}}')
        R.append(f'{S} #botnav{{border-top:1.4px solid var(--cs-d1);border-radius:22px 22px 0 0}}')
        R.append(f'{S} .botnav-btn{{border-radius:18px}}')
        R.append(f'{S} :is(.fchip,.lsortbtn,#btnAdd.addicon,.stepbtn,.ghostbtn){{border-radius:999px}}')
        R.append(f'{S} .fchip{{box-shadow:inset 0 0 0 1.4px var(--cs-d1)}}')
    R.append(f'{S} #libTitle{{line-height:1.1;flex-shrink:0}}')
    R.append(f'@media (max-width:374px){{{S} #libTitle{{font-size:{28 if sk=="peterburg" else 24}px;letter-spacing:0}}{S} #libHead{{padding-left:10px;padding-right:10px}}}}')
    R.append(f'{S} .botnav-btn{{font-weight:700}}')
    # cards
    R.append(f'{S} :is(.bookcard,.goalcard,.continuecard,.kpi,.qcard,.pcard,.shopcard,.herocard){{border-radius:var(--rq-radius-md);border-color:transparent;box-shadow:var(--rq-shadow-2)}}')
    R.append(f'{S} :is(.bookcard,.continuecard){{margin-bottom:14px}}')
    R.append(f'{S} .sheet{{border-radius:var(--rq-radius-lg) var(--rq-radius-lg) 0 0}}')
    # coin + mascot
    R.append(f'{S} #goldChip{{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}}')
    R.append(f'{S} #goldChip::before{{content:"";flex:none;width:20px;height:20px;background:var(--cs-coin) center/contain no-repeat}}')
    R.append(f'{S} .emptyhint::before{{content:"";display:block;width:88px;height:88px;margin:0 auto 12px;background:var(--cs-mascot) center/contain no-repeat}}')
    # covers
    R.append(f'{S} .cover{{border-radius:var(--rq-radius-xs);background:none;box-shadow:0 0 0 1.4px var(--cs-ink)}}')
    # path map
    R.append(f'{S} #path .pathsum{{border-radius:var(--rq-radius-md);background:var(--rq-surface);box-shadow:var(--rq-shadow-2);margin:10px 0 12px}}')
    R.append(f'{S} #path .pathch{{position:relative;isolation:isolate;margin-top:26px;padding:18px 12px 84px;border-radius:var(--rq-radius-md);box-shadow:var(--rq-shadow-2);background:var(--cs-mapbg)}}')
    if sk == 'lamancha':
        R.append(f'{S} #path .pathch{{background:var(--cs-tex) 0 0/12px 12px repeat,var(--cs-mapbg)}}')
        R.append(f'{S} #path .pathch-n{{width:46px;height:52px;border-radius:0;background:var(--cs-shield) center/contain no-repeat;color:#fff;font-family:var(--rq-font-display);font-size:18px;padding-bottom:8px;-webkit-text-stroke:3px var(--cs-ink);paint-order:stroke fill}}')
        R.append(f'{S} #path .pathch.full .pathch-n{{color:var(--cs-d2)}}')
        line = (f'{S} #path .pathline path{{stroke:var(--cs-ink);stroke-opacity:.18;stroke-width:7}}',
                f'{S} #path .pathline path.pl2{{display:inline;stroke:var(--cs-road);stroke-opacity:1;stroke-width:3.2;stroke-dasharray:9 7}}',
                f'{S} #path .pathline path.pl2.on{{stroke-dasharray:none}}')
    elif sk == 'peterburg':
        R.append(f'{S} #path .pathch{{background:var(--cs-river) 0 38%/100% 80px no-repeat,var(--cs-blocks) 0 0/46px 34px repeat,var(--cs-mapbg)}}')
        R.append(f'{S} #path .pathch-n{{width:52px;height:38px;border-radius:5px;background:#1d3d7a;color:#fff;box-shadow:0 0 0 2px #fff,0 0 0 3.5px #1d3d7a;font-family:var(--rq-font-num);font-size:22px}}')
        R.append(f'{S} #path .pathch.full .pathch-n{{background:var(--rq-accent);color:var(--rq-on-accent);box-shadow:0 0 0 2px var(--rq-surface),0 0 0 3.5px var(--rq-accent)}}')
        R.append(f'{S} #path .pathch-h b{{text-transform:uppercase;font-size:24px;line-height:1}}')
        R.append(f'{S} #path .pn-lab b{{font-family:var(--pb-font-title);font-weight:700}}')
        line = (f'{S} #path .pathline path{{stroke:var(--cs-ink);stroke-opacity:1;stroke-width:13;stroke-linecap:round}}',
                f'{S} #path .pathline path.pl2{{display:inline;stroke:var(--rq-surface);stroke-opacity:1;stroke-width:9;stroke-dasharray:none}}',
                f'{S} #path .pathline path.pl2.on{{stroke:var(--cs-d1)}}',
                f'{S} #path .pathline path.pl3{{display:inline;stroke:var(--cs-ink);stroke-opacity:.55;stroke-width:1.2;stroke-dasharray:3 6}}')
    else:
        R.append(f'{S} #path .pathch{{background:var(--cs-tex) 0 0/240px 120px repeat,var(--cs-mapbg)}}')
        R.append(f'{S} #path .pathch-n{{width:46px;height:46px;border-radius:50%;background:var(--rq-accent);color:var(--rq-on-accent);box-shadow:0 0 0 3px var(--cs-d1),0 0 0 5px var(--rq-surface),0 0 0 6.5px var(--cs-d1);font-family:var(--rq-font-display)}}')
        R.append(f'{S} #path .pathch.full .pathch-n{{background:var(--cs-d1);color:#1f1a22}}')
        line = (f'{S} #path .pathline path{{stroke:var(--cs-road);stroke-opacity:.75;stroke-width:15;stroke-dasharray:2.4 5.6;stroke-linecap:butt}}',
                f'{S} #path .pathline path.pl2{{display:inline;stroke:var(--cs-ink);stroke-opacity:1;stroke-width:8;stroke-linecap:butt;stroke-dasharray:none}}',
                f'{S} #path .pathline path.pl2.on{{stroke:var(--rq-accent)}}',
                f'{S} #path .pathline path.pl3{{display:inline;stroke:var(--cs-mapbg);stroke-opacity:1;stroke-width:4.4;stroke-linecap:butt;stroke-dasharray:none}}')
    R.extend(line)
    R.append(f'{S} #path .pathch::after{{content:"";position:absolute;{"left:14px" if sk=="modern" else "right:14px"};bottom:12px;width:{96 if sk=="modern" else 64}px;height:{60 if sk=="modern" else 64}px;background:var(--cs-corner) center/contain no-repeat;pointer-events:none}}')
    # nodes: the skin drawing instead of the ring + icon; status by shape (check badge, bar)
    R.append(f'{S} #path .pn-dot{{background:none;box-shadow:none}}')
    R.append(f'{S} #path .pn-dot > svg{{display:none}}')
    R.append(f'{S} #path .pn-dot::before{{content:"";position:absolute;inset:-14%;z-index:1;border-radius:50%;background:var(--cs-mapbg);opacity:.85;pointer-events:none}}')
    R.append(f'{S} #path .pn-dot::after{{content:"";position:absolute;inset:-8%;z-index:2;background:var(--cs-node) center/contain no-repeat;pointer-events:none}}')
    R.append(f'{S} #path .pathnode.side .pn-dot::after{{background-image:var(--cs-node-side)}}')
    R.append(f'{S} #path .pathnode.boss .pn-dot::after{{background-image:var(--cs-node-boss);inset:-18%}}')
    R.append(f'{S} #path .pathnode.l{{padding-left:{"40px" if sk!="modern" else "40px"}}}')
    R.append(f'{S} #path .pathnode.r{{padding-right:40px}}')
    R.append(f'{S} #path .pn-ok{{display:flex;position:absolute;left:-26%;bottom:-14%;z-index:3;width:20px;height:20px;align-items:center;justify-content:center;border-radius:var(--rq-radius-xs);background:var(--rq-accent);color:var(--rq-on-accent);box-shadow:0 0 0 1.5px var(--rq-surface)}}')
    R.append(f'{S} #path .pathnode.r .pn-ok{{left:auto;right:-26%}}')
    R.append(f'{S} #path .pn-ok svg{{display:block;stroke-width:3}}')
    R.append(f'{S} #path .pn-bar{{display:block;position:absolute;left:0;right:0;bottom:-22%;z-index:3;height:6px;border-radius:3px;background:var(--rq-surface);box-shadow:0 0 0 1.2px var(--cs-ink);overflow:hidden}}')
    R.append(f'{S} #path .pn-bar b{{display:block;height:100%;background:var(--rq-accent)}}')
    R.append(f'{S} #path .pn-lab{{position:relative;z-index:3;text-shadow:0 0 3px var(--cs-mapbg),0 0 6px var(--cs-mapbg)}}')
    R.append(f'{S} #path .pn-lab b{{font-size:18px;line-height:1.15}}')
    R.append(f'{S} #path .pn-tag{{color:var(--rq-text-2);font-weight:700}}')
    R.append(f'{S} #path :is(.pn-a,.pn-p){{color:var(--rq-text-2)}}')
    R.append(f'{S} #path :is(.pathnode.started,.pathnode.done) .pn-p{{color:var(--rq-accent-text);font-weight:700}}')
    # covers (chapterCover in js/library.js): coloured panel + skin drawing at the bottom
    bgs = {'lamancha': [('#2a4a9a', '#fff'), ('#f3ead6', '#1d1a17'), ('#b8321f', '#fff'), ('#f3ead6', '#1d1a17'), ('#2a4a9a', '#fff'), ('#1d1a17', '#f3ead6')],
           'peterburg': [('#e6bd62', '#1b1f24'), ('#1d5a5b', '#fff'), ('#1b1f24', '#fff'), ('#1d5a5b', '#fff'), ('#e6bd62', '#1b1f24'), ('#1b1f24', '#fff')],
           'modern': [('#0f5e63', '#fff'), ('#efe8d8', '#1f1a22'), ('#3d2a48', '#fff'), ('#efe8d8', '#1f1a22'), ('#0f5e63', '#fff'), ('#3d2a48', '#fff')]}[sk]
    for i, (bg, fg) in enumerate(bgs):
        R.append(f'{S} .cs-cover.cs-k{i}{{background:{bg};color:{fg}}}')
        R.append(f'{S} .cs-cover.cs-k{i}::after{{background-image:var(--cs-cv{i})}}')
    return '\n'.join(out + R)

COMMON = '''/* chapter-skin covers (chapterCover in js/library.js) */
.cs-cover{position:relative;display:flex;flex-direction:column;align-items:center;width:100%;height:100%;overflow:hidden}
.cs-cover i{font:700 8px/1 var(--rq-font-ui,sans-serif);font-style:normal;letter-spacing:.1em;padding-top:6px}
.cs-cover::after{content:"";position:absolute;left:50%;bottom:4px;width:34px;height:34px;margin-left:-17px;background:center/contain no-repeat}
/* the road has three strokes; only the chapter skins show the 2nd and 3rd */
.pathline path.pl2,.pathline path.pl3{display:none}
/* the chapter's skin under its heading (path.js); «Надеть» once the chapter is read */
.pathch-sk{margin:2px 0 6px 52px;font-size:13px;line-height:1.5;color:var(--muted)}
.pathch-sk b{color:var(--txt)}
.pathch-sk button{min-height:36px;margin-left:10px;padding:0 14px;border-radius:var(--radius);background:var(--accent);color:var(--bg);font-weight:700;font-size:13px;vertical-align:middle}
.pathch-sk .on{font-weight:700;color:var(--accent)}'''

def main():
    import os
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    for sk in TOK:
        dd = os.path.join(root, 'handoff', 'skins', sk); os.makedirs(dd, exist_ok=True)
        open(os.path.join(dd, 'tokens.css'), 'w').write(tokens_css(sk))
    css_path = os.path.join(root, 'source', 'skins', 'skins.css')
    css = open(css_path).read()
    B = '/* ===== 4. Скины глав «Пути читателя»: «Ламанча» (II), «Петербург» (III), «Модерн» (IV). Generated by source/tools/gen-chapter-skins.py — edit there. Decor never in the reader. ===== */'
    E = '/* ===== end of chapter skins ===== */'
    block = B + '\n' + COMMON + '\n' + '\n'.join(chapter_css(sk) for sk in TOK) + '\n' + E
    if B in css:
        a = css.index(B); b = css.index(E) + len(E); css = css[:a] + block + css[b:]
    else:
        css = css.rstrip('\n') + '\n\n' + block + '\n'
    open(css_path, 'w').write(css)
    print('ok', len(block))

if __name__ == '__main__':
    main()
