export interface GospelVerse {
  ref: string;
  text: string;
}

/**
 * King James Version (public domain). Every entry below is a direct quotation
 * of Jesus's own words, drawn only from the four Gospels.
 */
export const GOSPEL_VERSES: GospelVerse[] = [
  { ref: "Matthew 5:3", text: "Blessed are the poor in spirit: for theirs is the kingdom of heaven." },
  { ref: "Matthew 5:4", text: "Blessed are they that mourn: for they shall be comforted." },
  { ref: "Matthew 5:5", text: "Blessed are the meek: for they shall inherit the earth." },
  { ref: "Matthew 5:6", text: "Blessed are they which do hunger and thirst after righteousness: for they shall be filled." },
  { ref: "Matthew 5:7", text: "Blessed are the merciful: for they shall obtain mercy." },
  { ref: "Matthew 5:8", text: "Blessed are the pure in heart: for they shall see God." },
  { ref: "Matthew 5:9", text: "Blessed are the peacemakers: for they shall be called the children of God." },
  { ref: "Matthew 5:14", text: "Ye are the light of the world. A city that is set on an hill cannot be hid." },
  { ref: "Matthew 5:16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
  { ref: "Matthew 6:21", text: "For where your treasure is, there will your heart be also." },
  { ref: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { ref: "Matthew 6:34", text: "Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof." },
  { ref: "Matthew 7:7", text: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you." },
  { ref: "Matthew 7:12", text: "Therefore all things whatsoever ye would that men should do to you, do ye even so to them: for this is the law and the prophets." },
  { ref: "Matthew 9:12", text: "They that be whole need not a physician, but they that are sick." },
  { ref: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { ref: "Matthew 11:29", text: "Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls." },
  { ref: "Matthew 16:26", text: "For what is a man profited, if he shall gain the whole world, and lose his own soul?" },
  { ref: "Matthew 17:20", text: "...if ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you." },
  { ref: "Matthew 19:26", text: "...with men this is impossible; but with God all things are possible." },
  { ref: "Matthew 28:20", text: "...and, lo, I am with you alway, even unto the end of the world." },
  { ref: "Mark 8:36", text: "For what shall it profit a man, if he shall gain the whole world, and lose his own soul?" },
  { ref: "Mark 9:23", text: "...If thou canst believe, all things are possible to him that believeth." },
  { ref: "Mark 10:27", text: "...with men it is impossible, but not with God: for with God all things are possible." },
  { ref: "Mark 11:24", text: "...What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them." },
  { ref: "Mark 12:30-31", text: "And thou shalt love the Lord thy God with all thy heart... Thou shalt love thy neighbour as thyself. There is none other commandment greater than these." },
  { ref: "Luke 6:31", text: "And as ye would that men should do to you, do ye also to them likewise." },
  { ref: "Luke 6:38", text: "Give, and it shall be given unto you; good measure, pressed down, and shaken together, and running over, shall men give into your bosom." },
  { ref: "Luke 9:23", text: "...If any man will come after me, let him deny himself, and take up his cross daily, and follow me." },
  { ref: "Luke 12:34", text: "For where your treasure is, there will your heart be also." },
  { ref: "Luke 16:10", text: "He that is faithful in that which is least is faithful also in much." },
  { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { ref: "John 8:12", text: "...I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life." },
  { ref: "John 8:32", text: "And ye shall know the truth, and the truth shall make you free." },
  { ref: "John 10:10", text: "...I am come that they might have life, and that they might have it more abundantly." },
  { ref: "John 10:11", text: "I am the good shepherd: the good shepherd giveth his life for the sheep." },
  { ref: "John 13:34", text: "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another." },
  { ref: "John 14:1", text: "Let not your heart be troubled: ye believe in God, believe also in me." },
  { ref: "John 14:6", text: "...I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { ref: "John 14:27", text: "Peace I leave with you, my peace I give unto you... Let not your heart be troubled, neither let it be afraid." },
  { ref: "John 15:5", text: "I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing." },
  { ref: "John 15:13", text: "Greater love hath no man than this, that a man lay down his life for his friends." },
  { ref: "John 16:33", text: "...In the world ye shall have tribulation: but be of good cheer; I have overcome the world." },
];

/**
 * Deterministic pick — same verse all day, no AI involved (avoids hallucinated
 * scripture). "sequential" walks the list in calendar order (day-of-year);
 * "random" is still deterministic per date (so it doesn't change on refresh)
 * but doesn't follow the same yearly pattern.
 */
export function verseOfTheDay(date: Date = new Date(), mode: "sequential" | "random" = "sequential"): GospelVerse {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);

  if (mode === "random") {
    const seed = date.getFullYear() * 1000 + dayOfYear;
    const pseudo = Math.abs(Math.sin(seed) * 10000);
    const idx = Math.floor((pseudo - Math.floor(pseudo)) * GOSPEL_VERSES.length);
    return GOSPEL_VERSES[idx];
  }

  const idx = dayOfYear % GOSPEL_VERSES.length;
  return GOSPEL_VERSES[idx];
}
