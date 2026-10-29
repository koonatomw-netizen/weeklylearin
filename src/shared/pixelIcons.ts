/** One colour per character; "." is transparent. Each icon is a 12x12 grid. */
export const ICON_PALETTE: Record<string, string> = {
  k: "#111827", w: "#f9fafb", r: "#ef4444", b: "#3b82f6", g: "#22c55e", y: "#facc15",
  o: "#f97316", p: "#ec4899", n: "#92400e", c: "#67e8f9", a: "#9ca3af", u: "#8b6bd6",
};

/** Halloween sprites (12x12, same palette). Kept apart from SITUATION_ICONS, which is one icon per case. */
export const HALLOWEEN_ICONS: Record<string, readonly string[]> = {
  pumpkin: ["....gg......", ".....gg.....", "..oooooooo..", ".oooooooooo.", "oookkookkooo", "oooooooooooo", "ookooooookoo", "ooookkkkkooo", ".oooooooooo.", "..oooooooo..", "............", "............"],
  ghost: ["....wwww....", "...wwwwww...", "..wwwwwwww..", "..wwkwwkww..", "..wwkwwkww..", "..wwwwwwww..", "..wwwkkwww..", "..wwwwwwww..", "..wwwwwwww..", "..wwwwwwww..", "..ww.ww.ww..", "............"],
  bat: ["............", "u..........u", "uuu..uu..uuu", "uuuuuuuuuuuu", "uuuuruuruuuu", ".uuuuuuuuuu.", "..uu.uu.uu..", "............", "............", "............", "............", "............"],
  skull: ["............", "...wwwwww...", "..wwwwwwww..", ".wwwwwwwwww.", ".wwkkwwkkww.", ".wwkkwwkkww.", ".wwwwkkwwww.", "..wwwwwwww..", "...wkwkwkw..", "...wwwwwww..", "............", "............"],
  candy: ["............", ".....yy.....", "....yyyy....", "...yyyyyy...", "...oooooo...", "..oooooooo..", "..wwwwwwww..", ".wwwwwwwwww.", ".wwwwwwwwww.", "............", "............", "............"],
};

export const SITUATION_ICONS: Record<string, readonly string[]> = {
  "wifi-panic": ["............", "..bbbbbbbb..", ".bb......bb.", "bb..bbbb..bb", "b..bb..bb..b", "....b..b....", ".....bb.....", "............", ".....rr.....", ".....rr.....", "............", "............"],
  "menu-change": ["............", "...aaaaaa...", "..awwwwwwa..", ".awrwwwwrwa.", ".awwrwwrwwa.", ".awwwrrwwwa.", ".awwwrrwwwa.", ".awwrwwrwwa.", ".awrwwwwrwa.", "..awwwwwwa..", "...aaaaaa...", "............"],
  "coupon": ["............", "............", ".yyyyyyyyyy.", "yyyykkkkyyyy", ".yyykyyykyy.", "yyyyyyykyyyy", "yyyyyykkyyyy", ".yyyyykyyyy.", "yyyyyyyyyyyy", "yyyyyykkyyyy", ".yyyyyyyyyy.", "............"],
  "wellness-plan": ["............", "..pp....pp..", ".pwpp..pppp.", "pppppppppppp", "pppppppppppp", "pppppppppppp", ".pppppppppp.", "..pppppppp..", "...pppppp...", "....pppp....", ".....pp.....", "............"],
  "error-message": ["............", "kkkkkkkkkkkk", "kaaaaaaaaaak", "kkkkkkkkkkkk", "kwwwwwwwwwwk", "kwwkwwwwkwwk", "kwwwwwwwwwwk", "kwwwkkkkwwwk", "kwwkwwwwkwwk", "kwwwwwwwwwwk", "kkkkkkkkkkkk", "............"],
  "room-not-ready": ["............", ".bbbbbbbbbb.", ".bbbbbbbbbb.", ".bbbbbwwwwb.", ".bbbbwwkwwwb", ".bbbbwwkkwwb", ".bbbbbwwwwb.", ".bbbbbbbbbb.", ".bkkkkbbbbb.", ".bbbbbbbbbb.", "............", "............"],
  "three-captions": ["............", ".bbbbbbbbbb.", "bbbbbbbbbbbb", "bbbbbbbbbbbb", "bbwbbwbbwbbb", "bbbbbbbbbbbb", "bbbbbbbbbbbb", ".bbbbbbbbbb.", "..bb........", "..b.........", "............", "............"],
  "poster-brief": ["............", "...nnnnnn...", "..nnnnnnnn..", ".nnrrnnyynn.", ".nnrrnnyynn.", ".nnnnnnnnnn.", ".nbbnnnnnn..", ".nbbnnnnn...", "..nnnnnn....", "...nnn......", "............", "............"],
  "sort-the-facts": ["............", "..ccccc.....", ".cwwwwwc....", "cwwwwwwwc...", "cwwwwwwwc...", "cwwwwwwwc...", ".cwwwwwc....", "..ccccc.nn..", ".........nn.", "..........nn", "............", "............"],
  "rainy-day": ["............", "....aaaa....", "..aaaaaaaa..", ".aaaaaaaaaa.", "aaaaaaaaaaaa", ".aaaaaaaaaa.", "............", "..b..b..b...", "..b..b..b...", ".b..b..b....", ".b..b..b....", "............"],
  "run-sheet": ["....kkkk....", ".nnnkaaknnn.", ".nwwwwwwwwn.", ".nwgwkkkkwn.", ".nwwwwwwwwn.", ".nwgwkkkkwn.", ".nwwwwwwwwn.", ".nwgwkkkkwn.", ".nwwwwwwwwn.", ".nnnnnnnnnn.", "............", "............"],
  "workshop-2-days": ["............", "..k......k..", "rrrrrrrrrrrr", "rrrrrrrrrrrr", "wwwwwwwwwwww", "wwwwwoowwwww", "wwwwooooowww", "wwwooyyoowww", "wwwooyyoowww", "wwwwooooowww", "kkkkkkkkkkkk", "............"],
  "wrong-room-photo": ["............", "nnnnnnnnnnnn", "nccccckccccn", "ncccckccwwcn", "nccccckccccn", "nggggkgggggn", "ngggggkggggn", "nggggkgggggn", "nnnnnnnnnnnn", "............", "............", "............"],
  "upset-partner": ["............", "...rrrrrr...", "..rrrrrrrr..", ".rkkrrrrkkr.", ".rrkrrrrkrr.", "rrrrrrrrrrrr", "rrrrrrrrrrrr", "rrrkkkkkkrrr", ".rrkrrrrkrr.", ".rrrrrrrrrr.", "..rrrrrrrr..", "............"],
  "double-booking": ["............", ".yyy....yyy.", "y...y..y...y", "y...y..y...y", ".yyy....yyy.", "..y......y..", "..y......y..", "..yy....yy..", "..y......y..", "..yy....yy..", "............", "............"],
};
