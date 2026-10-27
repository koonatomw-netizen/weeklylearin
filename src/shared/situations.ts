import { WEEK01_CHALLENGE } from "./challenge";
import type { Challenge } from "./deck";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Situation {
  id: string;
  rarity: Rarity;
  challenge: Challenge;
}

export const RARITY_ORDER: readonly Rarity[] = ["common", "rare", "epic", "legendary"];
export const RARITY_WEIGHTS: Record<Rarity, number> = { common: 50, rare: 30, epic: 15, legendary: 5 };

const situation = (id: string, rarity: Rarity, titleEn: string, titleTh: string, scenarioEn: string, scenarioTh: string, taskEn: string, taskTh: string): Situation =>
  ({ id, rarity, challenge: { titleEn, titleTh, scenarioEn, scenarioTh, taskEn, taskTh } });

/** The case-opening pool. Order matters: it fixes which situation a given random number picks. */
export const SITUATIONS: readonly Situation[] = [
  situation("wifi-panic", "common", "Wi-Fi Panic", "Wi-Fi ล่ม",
    "A co-living resident cannot connect to the Wi-Fi, and an important video call starts in 10 minutes.",
    "ผู้พักที่ co-living เชื่อมต่อ Wi-Fi ไม่ได้ และอีก 10 นาทีมีวิดีโอคอลสำคัญ",
    "Write a prompt for an AI assistant to create a calm, step-by-step reply that tells the resident what to try and who to contact.",
    "เขียนพรอมป์สั่งให้ AI เขียนข้อความตอบกลับที่ใจเย็น บอกวิธีลองแก้ทีละขั้น และบอกว่าควรติดต่อใคร"),
  situation("menu-change", "common", "Menu Change", "เมนูเปลี่ยน",
    "The most popular lunch dish at the canteen has run out.",
    "เมนูอาหารกลางวันที่ขายดีที่สุดของโรงอาหารหมดแล้ว",
    "Write a prompt for an AI assistant to create a short announcement in Thai and English that offers two alternatives.",
    "เขียนพรอมป์สั่งให้ AI สร้างประกาศสั้น ๆ เป็นภาษาไทยและอังกฤษ พร้อมเสนอเมนูทางเลือกสองอย่าง"),
  situation("coupon", "common", "Coupon", "คูปองอาหาร",
    "A co-living resident asks for a food coupon, but Sherrie, who gives them out, is not in today.",
    "ผู้พักที่ co-living มาขอคูปองอาหาร แต่วันนี้ Sherrie ซึ่งเป็นคนแจกคูปองไม่อยู่",
    "Write a prompt for an AI assistant to create a polite reply that tells the resident what happens next, without promising the coupon on the spot.",
    "เขียนพรอมป์สั่งให้ AI เขียนข้อความตอบกลับที่สุภาพ บอกว่าขั้นตอนต่อไปคืออะไร โดยไม่สัญญาว่าจะได้คูปองทันที"),
  situation("wellness-plan", "common", "Wellness Plan", "แผนสุขภาพ",
    "A longevity member asks for a simple weekly wellness routine.",
    "สมาชิกโปรแกรม longevity ขอตารางดูแลสุขภาพประจำสัปดาห์แบบเรียบง่าย",
    "Write a prompt for an AI assistant to create a friendly 7-day plan with no more than 5 lines per day.",
    "เขียนพรอมป์สั่งให้ AI สร้างแผน 7 วันที่เป็นกันเอง วันละไม่เกิน 5 บรรทัด"),
  situation("error-message", "common", "Error Message", "ข้อความผิดพลาด",
    "A colleague sees \"Something went wrong\" on the booking page and does not know what to do.",
    "เพื่อนร่วมงานเห็นข้อความ \"Something went wrong\" ในหน้าจอง และไม่รู้ว่าต้องทำอย่างไร",
    "Write a prompt for an AI assistant to create a plain-language reply that gives the likely cause and one thing to try.",
    "เขียนพรอมป์สั่งให้ AI เขียนคำตอบด้วยภาษาง่าย ๆ บอกสาเหตุที่น่าจะเป็นและสิ่งหนึ่งที่ลองทำได้"),
  situation("room-not-ready", "common", "Room Not Ready", "ห้องพักยังไม่พร้อม",
    WEEK01_CHALLENGE.scenarioEn, WEEK01_CHALLENGE.scenarioTh, WEEK01_CHALLENGE.taskEn, WEEK01_CHALLENGE.taskTh),
  situation("three-captions", "rare", "Three Captions", "แคปชัน 3 แบบ",
    "Toto needs a caption for a social post about an upcoming 4Seas event.",
    "Toto ต้องการแคปชันสำหรับโพสต์โซเชียลเกี่ยวกับอีเวนต์ที่กำลังจะมาถึงของ 4Seas",
    "Write a prompt for an AI assistant to create 3 caption options in different tones, each under 25 words.",
    "เขียนพรอมป์สั่งให้ AI สร้างแคปชัน 3 แบบด้วยน้ำเสียงต่างกัน แต่ละแบบไม่เกิน 25 คำ"),
  situation("poster-brief", "rare", "Poster Brief", "บรีฟโปสเตอร์",
    "Nalika needs a poster for a morning yoga session at 4Seas.",
    "Nalika ต้องการโปสเตอร์สำหรับคลาสโยคะตอนเช้าที่ 4Seas",
    "Write a prompt describing the poster so an image AI gets it right the first time. Cover style, colours, text and size.",
    "เขียนพรอมป์อธิบายโปสเตอร์ให้ AI สร้างภาพได้ถูกต้องตั้งแต่ครั้งแรก ระบุสไตล์ สี ข้อความ และขนาด"),
  situation("sort-the-facts", "rare", "Sort the Facts", "คัดข้อเท็จจริง",
    "Three articles disagree about a wellness trend, and Bear needs a quick summary for the team.",
    "บทความสามชิ้นขัดแย้งกันเรื่องเทรนด์สุขภาพ และ Bear ต้องการสรุปสั้น ๆ ให้ทีม",
    "Write a prompt that asks an AI assistant to report only what all three articles agree on and to flag anything it is unsure of.",
    "เขียนพรอมป์สั่งให้ AI รายงานเฉพาะสิ่งที่บทความทั้งสามชิ้นเห็นตรงกัน และบอกด้วยหากไม่แน่ใจเรื่องใด"),
  situation("rainy-day", "rare", "Rainy Day", "วันฝนตก",
    "A sudden storm cancels a group trip, and Bow needs to tell the residents.",
    "พายุกะทันหันทำให้ทริปกลุ่มต้องยกเลิก และ Bow ต้องแจ้งผู้พัก",
    "Write a prompt for an AI assistant to create a message that offers a plan B for the same afternoon.",
    "เขียนพรอมป์สั่งให้ AI เขียนข้อความที่เสนอแผนสำรองสำหรับช่วงบ่ายวันเดียวกัน"),
  situation("run-sheet", "epic", "Run Sheet", "รันชีต",
    "A messy 3-page brief for a big event arrives the night before, and GIGI needs a clear plan.",
    "บรีฟอีเวนต์ใหญ่ 3 หน้าที่ยุ่งเหยิงมาถึงคืนก่อนงาน และ GIGI ต้องการแผนที่ชัดเจน",
    "Write a prompt that turns the brief into a one-page run sheet with times and owners.",
    "เขียนพรอมป์สั่งให้ AI เปลี่ยนบรีฟเป็นรันชีตหนึ่งหน้า ระบุเวลาและผู้รับผิดชอบ"),
  situation("workshop-2-days", "epic", "Workshop in 2 Days", "เวิร์กชอปใน 2 วัน",
    "A client asks Saki for a 30-person workshop in 2 days.",
    "ลูกค้าขอให้ Saki จัดเวิร์กชอปสำหรับ 30 คนภายใน 2 วัน",
    "Write a prompt for an AI assistant to create a checklist with deadlines and a short email that confirms the plan.",
    "เขียนพรอมป์สั่งให้ AI สร้างเช็กลิสต์พร้อมกำหนดส่ง และอีเมลสั้น ๆ ที่ยืนยันแผน"),
  situation("wrong-room-photo", "epic", "Wrong Room Photo", "ห้องไม่ตรงรูป",
    "A resident tells Bow that the room does not look like the photos on the website.",
    "ผู้พักบอก Bow ว่าห้องไม่เหมือนรูปในเว็บไซต์",
    "Write a prompt for an AI assistant to create a reply that apologises, explains and offers a fix.",
    "เขียนพรอมป์สั่งให้ AI เขียนข้อความตอบกลับที่ขอโทษ อธิบาย และเสนอวิธีแก้ไข"),
  situation("upset-partner", "legendary", "Upset Partner", "พาร์ตเนอร์ไม่พอใจ",
    "A partner is angry about a cancelled event, and Aunya must answer today.",
    "พาร์ตเนอร์โกรธที่อีเวนต์ถูกยกเลิก และ Aunya ต้องตอบภายในวันนี้",
    "Write a prompt for an AI assistant to create a short, respectful reply that takes responsibility and makes no promises that cannot be kept.",
    "เขียนพรอมป์สั่งให้ AI เขียนข้อความตอบกลับสั้น ๆ สุภาพ ที่รับผิดชอบต่อเรื่องที่เกิดขึ้น และไม่สัญญาในสิ่งที่ทำไม่ได้"),
  situation("double-booking", "legendary", "Double Booking", "จองซ้ำ",
    "Two groups are booked into the same hall on the same night, and GIGI and Saki must tell both.",
    "มีสองกลุ่มจองห้องจัดงานเดียวกันในคืนเดียวกัน และ GIGI กับ Saki ต้องแจ้งทั้งสองกลุ่ม",
    "Write a prompt for an AI assistant to create two messages, one for each group, with the same facts and different tones.",
    "เขียนพรอมป์สั่งให้ AI เขียนข้อความสองฉบับ ฉบับละกลุ่ม ข้อเท็จจริงเหมือนกันแต่น้ำเสียงต่างกัน"),
];

export function situationById(id: string | null | undefined): Situation | undefined {
  return id ? SITUATIONS.find((item) => item.id === id) : undefined;
}

/**
 * Weighted draw: the first random number picks the rarity, the second picks within it.
 * `excludeId` (the situation currently shown) is never returned, so a re-roll always changes it.
 */
export function pickSituation(random: () => number, excludeId?: string): Situation {
  const total = RARITY_ORDER.reduce((sum, rarity) => sum + RARITY_WEIGHTS[rarity], 0);
  const roll = random() * total;
  let start = 0;
  let cumulative = 0;
  for (let index = 0; index < RARITY_ORDER.length; index += 1) {
    cumulative += RARITY_WEIGHTS[RARITY_ORDER[index]];
    if (roll < cumulative) { start = index; break; }
    start = RARITY_ORDER.length - 1;
  }
  for (let offset = 0; offset < RARITY_ORDER.length; offset += 1) {
    const rarity = RARITY_ORDER[(start + offset) % RARITY_ORDER.length];
    const pool = SITUATIONS.filter((item) => item.rarity === rarity && item.id !== excludeId);
    if (pool.length) return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  }
  return SITUATIONS[0];
}
