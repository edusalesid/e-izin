import { Classroom, Student, UserAccount, Permission } from './types';

export const INITIAL_USERS: UserAccount[] = [
  {
    "id": "cmvzflrie0000uz20lesqx38k",
    "username": "kepala.asrama",
    "name": "Ust. H. Abdullah Syukri, M.Ag",
    "role": "KEPALA_ASRAMA",
    "phone": "081392817263",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzfls790001uz20ki33i2zg",
    "username": "satpam",
    "name": "Pak Bambang (Pos Gerbang)",
    "role": "SATPAM",
    "phone": "081298761234",
    "pin": "satpam"
  },
  {
    "id": "cmvzfltkh0005uz203f0ab82t",
    "username": "anton",
    "name": "Anton, M.Hum., Gr.",
    "role": "SUPER_ADMIN",
    "phone": "081234560004",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm3jt0013uz2037kqpajs"
  },
  {
    "id": "cmvzflsuo0003uz20k633kbi6",
    "username": "ahmadfuad",
    "name": "Ahmad Fuad, S.Pd., Gr.",
    "role": "USTADZ_UMUM",
    "phone": "081234560002",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflt8y0004uz206c79f9k2",
    "username": "ahmadlatif",
    "name": "Ahmad Latif Kurniawan, S.Pd.Jas., Gr.",
    "role": "USTADZ_UMUM",
    "phone": "081234560003",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflurm0009uz207jox1tzw",
    "username": "hamdani",
    "name": "Hamdani, S.Pd.I.",
    "role": "USTADZ_UMUM",
    "phone": "081234560008",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflvat000buz20rmrjpfbj",
    "username": "husainariiq",
    "name": "Husain Ariiq Wahyuhanto",
    "role": "USTADZ_UMUM",
    "phone": "081234560010",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflvjc000cuz20ak06r877",
    "username": "ikhsaneffendi",
    "name": "Ikhsan Effendi, S.Pd.",
    "role": "USTADZ_UMUM",
    "phone": "081234560011",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflw6t000euz20wjn8y5yb",
    "username": "masyhudaaditia",
    "name": "Masyhuda Aditia, S.Pd.",
    "role": "USTADZ_UMUM",
    "phone": "081234560013",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflx4a000huz20a96xml99",
    "username": "muhtadikadi",
    "name": "Muhtadi Kadi, Lc.",
    "role": "USTADZ_UMUM",
    "phone": "081234560016",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflxd6000iuz20qn2dz6i4",
    "username": "mustaghfirijayapurnama",
    "name": "Mustaghfiri Jayapurnama, S.Pd., Gr.",
    "role": "USTADZ_UMUM",
    "phone": "081234560017",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflxwr000kuz20dpz8c5s6",
    "username": "rizalhanifa",
    "name": "Rizal Hanifa Pratama, S.Kom.",
    "role": "USTADZ_UMUM",
    "phone": "081234560019",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzfly5w000luz20lamh6h2p",
    "username": "sarbaniboufakar",
    "name": "Sarbani Boufakar",
    "role": "USTADZ_UMUM",
    "phone": "081234560020",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflypd000nuz20ny64l049",
    "username": "sigitfatkhurrohman",
    "name": "Sigit Fatkhurrohman, S.S.",
    "role": "USTADZ_UMUM",
    "phone": "081234560022",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflyz3000ouz20mkgjrxyh",
    "username": "sukari",
    "name": "Sukari, S.Pd., Gr.",
    "role": "USTADZ_UMUM",
    "phone": "081234560023",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflzu1000ruz20hxcxtk37",
    "username": "umarabdul",
    "name": "Umar Abdul Aziz",
    "role": "USTADZ_UMUM",
    "phone": "081234560026",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzfm03a000suz20l3bjvgmv",
    "username": "umarfadlullah",
    "name": "Umar Fadlullah Khasanudin, Lc., M.H., Gr.",
    "role": "USTADZ_UMUM",
    "phone": "081234560027",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzfm13c000vuz206r2hb2e4",
    "username": "yogaajie",
    "name": "Yoga Ajie Trisna, S.Pd.",
    "role": "USTADZ_UMUM",
    "phone": "081234560030",
    "pin": "ihsanulfikri123"
  },
  {
    "id": "cmvzflslk0002uz20p6obvnbc",
    "username": "adnnur",
    "name": "Adn Nur Atha' Hamidy, S.Pd.",
    "role": "WALI_KELAS",
    "phone": "081234560001",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm2ih000zuz20hngovlj9"
  },
  {
    "id": "cmw0cfbpd0007uzm4rrd4edqj",
    "username": "afidamaulina",
    "name": "Afida Maulina Zahra, S.Mat., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560024",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfo9x000suzm4yqpz5767"
  },
  {
    "id": "cmw0cfbxg0008uzm44xdbx4a4",
    "username": "aminatulmushonifah",
    "name": "Aminatul Mushonifah, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560025",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfoql000uuzm4nqlaind5"
  },
  {
    "id": "cmw0cfefj000euzm4yme5bz7p",
    "username": "astnahati",
    "name": "Astnahati Isfaroh, S.Hum., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560031",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfuc60016uzm429do2y5m"
  },
  {
    "id": "cmw0cf8i20000uzm4x471yurz",
    "username": "dewianggraeni",
    "name": "Dewi Anggraeni Purnamasari, M.Sc., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560017",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfhm6000guzm4h8a0xglu"
  },
  {
    "id": "cmw0cfdca000auzm47t7s4s8o",
    "username": "diannovita",
    "name": "Dian Novita Kusumaningrum, S.Si., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560027",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfs1f000yuzm4hqdngkot"
  },
  {
    "id": "cmvzfltua0006uz20nxyh8c26",
    "username": "erdiilham",
    "name": "Erdi Ilham Surya, S.Sos., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560005",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm3jt0013uz2037kqpajs"
  },
  {
    "id": "cmw0cfdye000cuzm43oxp9yuw",
    "username": "etikanur",
    "name": "Etika Nur Pravita, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560029",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cft1i0012uzm4aijm1njo"
  },
  {
    "id": "cmvzflu7u0007uz20dxmmzvo4",
    "username": "fahmihidayatulloh",
    "name": "Fahmi Hidayatullah, S.Bc.",
    "role": "WALI_KELAS",
    "phone": "081234560006",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm4jf0017uz2013g2s3h4"
  },
  {
    "id": "cmvzfluj10008uz20bbtpnmva",
    "username": "haekalsyahri",
    "name": "Haekal Syahri Aufa Shidiq, Lc., S.Pd.",
    "role": "WALI_KELAS",
    "phone": "081234560007",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm4290015uz202ujv494z"
  },
  {
    "id": "cmvzflv29000auz20qghtn0wn",
    "username": "hisyamnur",
    "name": "Hisyam Nur Ahmad Latif, M.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560009",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm1jo000xuz20inzpm0c8"
  },
  {
    "id": "cmw0cfdq0000buzm4499axxzc",
    "username": "idawahyu",
    "name": "Ida Wahyu Kurniati, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560028",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfsj20010uzm4d80e2ec1"
  },
  {
    "id": "cmw0cfe6r000duzm4ep43xv8y",
    "username": "iisseptianingsih",
    "name": "Iis Septianingsih, S.E., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560030",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cftjs0014uzm4ig9tib7s"
  },
  {
    "id": "cmw0cf98z0002uzm437veg2y5",
    "username": "imielda",
    "name": "Imielda, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560019",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfjfe000kuzm44kwz8bts"
  },
  {
    "id": "cmw0cf9pk0004uzm4ijm935r7",
    "username": "inayahkurniasih",
    "name": "Inayah Kurniasih, S.S., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560021",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfkd6000ouzm4nkuomxfh"
  },
  {
    "id": "cmvzflvxg000duz20kie4fy7l",
    "username": "jundiihsan",
    "name": "Jundi Ihsan Al Banna, Lc.",
    "role": "WALI_KELAS",
    "phone": "081234560012",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm7fq001huz203vdhz1hq"
  },
  {
    "id": "cmw0cfbhb0006uzm4pmjgaw9p",
    "username": "kikisamiana",
    "name": "Kiki Samiana, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560023",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfnta000quzm4gy2vg4q7"
  },
  {
    "id": "cmvzflwgz000fuz207megdjlj",
    "username": "muhanwarudin",
    "name": "Muh Anwarudin, S.Pd.I.",
    "role": "WALI_KELAS",
    "phone": "081234560014",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm9re001puz20lvsl0iv8"
  },
  {
    "id": "cmvzflwr4000guz20rabpqicg",
    "username": "muhammadziaur",
    "name": "Muhammad Ziaurrohman",
    "role": "WALI_KELAS",
    "phone": "081234560015",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm6g6001duz20lvyzwby3"
  },
  {
    "id": "cmw0cfa6j0005uzm4qjn1m82a",
    "username": "nurhanif",
    "name": "Nur Hanif Stya Ady, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560022",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm56g0019uz2007hkqaif"
  },
  {
    "id": "cmw0cf9h30003uzm4fpk6n0a3",
    "username": "nurkhayati",
    "name": "Nurkhayati, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560020",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfjwo000muzm4vem4h4sk"
  },
  {
    "id": "cmvzflxnc000juz20aovfe8j4",
    "username": "pawitriyadi",
    "name": "Pawit Riyadi, S.Pd.Si., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560018",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm8pi001luz20p7lau1fy"
  },
  {
    "id": "cmw0cfc5y0009uzm4whtl4ak0",
    "username": "rahmatikakhoirunnisa",
    "name": "Rahmatika Khoirunnisa, S.Pd.",
    "role": "WALI_KELAS",
    "phone": "081234560026",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfp6y000wuzm4sh9k3mm8"
  },
  {
    "id": "cmvzflyfd000muz20txtdlonq",
    "username": "septiancahyo",
    "name": "Septian Cahyo Prabowo, S.S., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560021",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm6yu001fuz204vrd35ve"
  },
  {
    "id": "cmvzflzc3000puz200g3ea2aq",
    "username": "taufanmaulana",
    "name": "Taufan Maulana Haris, M.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560024",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm5y2001buz20ihbdl26c"
  },
  {
    "id": "cmvzflzla000quz20ci4aovoz",
    "username": "taufikrivai",
    "name": "Taufik Riva'i, S.Si., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560025",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm31p0011uz20kaz4niq0"
  },
  {
    "id": "cmvzfm0c8000tuz20n9vlab74",
    "username": "wildanmujab",
    "name": "Wildan Mujab Umbara, S.Pd.I.",
    "role": "WALI_KELAS",
    "phone": "081234560028",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm7x3001juz20yfgrbkbp"
  },
  {
    "id": "cmvzfm0lm000uuz20mknw2e9v",
    "username": "yanwaribnu",
    "name": "Yanwar Ibnu Hanif, S.Pd., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560029",
    "pin": "ihsanulfikri123",
    "classroomId": "cmvzfm96s001nuz20ge3oodh1"
  },
  {
    "id": "cmw0cf90q0001uzm404pasgaz",
    "username": "zaimatulamna",
    "name": "Za'imatul Amna, S.Pd.Si., Gr.",
    "role": "WALI_KELAS",
    "phone": "081234560018",
    "pin": "ihsanulfikri123",
    "classroomId": "cmw0cfijv000iuzm4z0v2tgg6"
  }
];

export const INITIAL_CLASSROOMS: Classroom[] = [
  {
    "id": "cmvzfm1jo000xuz20inzpm0c8",
    "name": "X-1",
    "waliKelasId": "cmvzflv29000auz20qghtn0wn",
    "waliKelasName": "Hisyam Nur Ahmad Latif, M.Pd., Gr.",
    "waliKelasPhone": "081234560009"
  },
  {
    "id": "cmvzfm2ih000zuz20hngovlj9",
    "name": "X-2",
    "waliKelasId": "cmvzflslk0002uz20p6obvnbc",
    "waliKelasName": "Adn Nur Atha' Hamidy, S.Pd.",
    "waliKelasPhone": "081234560001"
  },
  {
    "id": "cmvzfm31p0011uz20kaz4niq0",
    "name": "X-3",
    "waliKelasId": "cmvzflzla000quz20ci4aovoz",
    "waliKelasName": "Taufik Riva'i, S.Si., Gr.",
    "waliKelasPhone": "081234560003"
  },
  {
    "id": "cmvzfm3jt0013uz2037kqpajs",
    "name": "X-4",
    "waliKelasId": "cmvzfltua0006uz20nxyh8c26",
    "waliKelasName": "Erdi Ilham Surya, S.Sos., Gr.",
    "waliKelasPhone": "081234560005"
  },
  {
    "id": "cmvzfm4290015uz202ujv494z",
    "name": "X-5",
    "waliKelasId": "cmvzfluj10008uz20bbtpnmva",
    "waliKelasName": "Haekal Syahri Aufa Shidiq, Lc., S.Pd.",
    "waliKelasPhone": "081234560007"
  },
  {
    "id": "cmw0cfhm6000guzm4h8a0xglu",
    "name": "X-6",
    "waliKelasId": "cmw0cf8i20000uzm4x471yurz",
    "waliKelasName": "Dewi Anggraeni Purnamasari, M.Sc., Gr.",
    "waliKelasPhone": "081234560017"
  },
  {
    "id": "cmw0cfijv000iuzm4z0v2tgg6",
    "name": "X-7",
    "waliKelasId": "cmw0cf90q0001uzm404pasgaz",
    "waliKelasName": "Za'imatul Amna, S.Pd.Si., Gr.",
    "waliKelasPhone": "081234560018"
  },
  {
    "id": "cmw0cfjfe000kuzm44kwz8bts",
    "name": "X-8",
    "waliKelasId": "cmw0cf98z0002uzm437veg2y5",
    "waliKelasName": "Imielda, S.Pd., Gr.",
    "waliKelasPhone": "081234560019"
  },
  {
    "id": "cmw0cfjwo000muzm4vem4h4sk",
    "name": "X-9",
    "waliKelasId": "cmw0cf9h30003uzm4fpk6n0a3",
    "waliKelasName": "Nurkhayati, S.Pd., Gr.",
    "waliKelasPhone": "081234560020"
  },
  {
    "id": "cmw0cfkd6000ouzm4nkuomxfh",
    "name": "X-10",
    "waliKelasId": "cmw0cf9pk0004uzm4ijm935r7",
    "waliKelasName": "Inayah Kurniasih, S.S., Gr.",
    "waliKelasPhone": "081234560021"
  },
  {
    "id": "cmvzfm4jf0017uz2013g2s3h4",
    "name": "XI-1",
    "waliKelasId": "cmvzflu7u0007uz20dxmmzvo4",
    "waliKelasName": "Fahmi Hidayatullah, S.Bc.",
    "waliKelasPhone": "081234560006"
  },
  {
    "id": "cmvzfm56g0019uz2007hkqaif",
    "name": "XI-2",
    "waliKelasId": "cmw0cfa6j0005uzm4qjn1m82a",
    "waliKelasName": "Nur Hanif Stya Ady, S.Pd., Gr.",
    "waliKelasPhone": "081234560022"
  },
  {
    "id": "cmvzfm5y2001buz20ihbdl26c",
    "name": "XI-3",
    "waliKelasId": "cmvzflzc3000puz200g3ea2aq",
    "waliKelasName": "Taufan Maulana Haris, M.Pd., Gr.",
    "waliKelasPhone": "081234560032"
  },
  {
    "id": "cmvzfm6g6001duz20lvyzwby3",
    "name": "XI-4",
    "waliKelasId": "cmvzflwr4000guz20rabpqicg",
    "waliKelasName": "Muhammad Ziaurrohman",
    "waliKelasPhone": "081234560015"
  },
  {
    "id": "cmvzfm6yu001fuz204vrd35ve",
    "name": "XI-5",
    "waliKelasId": "cmvzflyfd000muz20txtdlonq",
    "waliKelasName": "Septian Cahyo Prabowo, S.S., Gr.",
    "waliKelasPhone": "081234560033"
  },
  {
    "id": "cmvzfm7fq001huz203vdhz1hq",
    "name": "XI-6",
    "waliKelasId": "cmvzflvxg000duz20kie4fy7l",
    "waliKelasName": "Jundi Ihsan Al Banna, Lc.",
    "waliKelasPhone": "081234560012"
  },
  {
    "id": "cmw0cfnta000quzm4gy2vg4q7",
    "name": "XI-7",
    "waliKelasId": "cmw0cfbhb0006uzm4pmjgaw9p",
    "waliKelasName": "Kiki Samiana, S.Pd., Gr.",
    "waliKelasPhone": "081234560023"
  },
  {
    "id": "cmw0cfo9x000suzm4yqpz5767",
    "name": "XI-8",
    "waliKelasId": "cmw0cfbpd0007uzm4rrd4edqj",
    "waliKelasName": "Afida Maulina Zahra, S.Mat., Gr.",
    "waliKelasPhone": "081234560024"
  },
  {
    "id": "cmw0cfoql000uuzm4nqlaind5",
    "name": "XI-9",
    "waliKelasId": "cmw0cfbxg0008uzm44xdbx4a4",
    "waliKelasName": "Aminatul Mushonifah, S.Pd., Gr.",
    "waliKelasPhone": "081234560025"
  },
  {
    "id": "cmw0cfp6y000wuzm4sh9k3mm8",
    "name": "XI-10",
    "waliKelasId": "cmw0cfc5y0009uzm4whtl4ak0",
    "waliKelasName": "Rahmatika Khoirunnisa, S.Pd.",
    "waliKelasPhone": "081234560026"
  },
  {
    "id": "cmvzfm7x3001juz20yfgrbkbp",
    "name": "XII-1",
    "waliKelasId": "cmvzfm0c8000tuz20n9vlab74",
    "waliKelasName": "Wildan Mujab Umbara, S.Pd.I.",
    "waliKelasPhone": "081234560034"
  },
  {
    "id": "cmvzfm8pi001luz20p7lau1fy",
    "name": "XII-2",
    "waliKelasId": "cmvzflxnc000juz20aovfe8j4",
    "waliKelasName": "Pawit Riyadi, S.Pd.Si., Gr.",
    "waliKelasPhone": "081234560035"
  },
  {
    "id": "cmvzfm96s001nuz20ge3oodh1",
    "name": "XII-3",
    "waliKelasId": "cmvzfm0lm000uuz20mknw2e9v",
    "waliKelasName": "Yanwar Ibnu Hanif, S.Pd., Gr.",
    "waliKelasPhone": "081234560036"
  },
  {
    "id": "cmvzfm9re001puz20lvsl0iv8",
    "name": "XII-4",
    "waliKelasId": "cmvzflwgz000fuz207megdjlj",
    "waliKelasName": "Muh Anwarudin, S.Pd.I.",
    "waliKelasPhone": "081234560014"
  },
  {
    "id": "cmw0cfs1f000yuzm4hqdngkot",
    "name": "XII-5",
    "waliKelasId": "cmw0cfdca000auzm47t7s4s8o",
    "waliKelasName": "Dian Novita Kusumaningrum, S.Si., Gr.",
    "waliKelasPhone": "081234560027"
  },
  {
    "id": "cmw0cfsj20010uzm4d80e2ec1",
    "name": "XII-6",
    "waliKelasId": "cmw0cfdq0000buzm4499axxzc",
    "waliKelasName": "Ida Wahyu Kurniati, S.Pd., Gr.",
    "waliKelasPhone": "081234560028"
  },
  {
    "id": "cmw0cft1i0012uzm4aijm1njo",
    "name": "XII-7",
    "waliKelasId": "cmw0cfdye000cuzm43oxp9yuw",
    "waliKelasName": "Etika Nur Pravita, S.Pd., Gr.",
    "waliKelasPhone": "081234560029"
  },
  {
    "id": "cmw0cftjs0014uzm4ig9tib7s",
    "name": "XII-8",
    "waliKelasId": "cmw0cfe6r000duzm4ep43xv8y",
    "waliKelasName": "Iis Septianingsih, S.E., Gr.",
    "waliKelasPhone": "081234560030"
  },
  {
    "id": "cmw0cfuc60016uzm429do2y5m",
    "name": "XII-9",
    "waliKelasId": "cmw0cfefj000euzm4yme5bz7p",
    "waliKelasName": "Astnahati Isfaroh, S.Hum., Gr.",
    "waliKelasPhone": "081234560031"
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 's-101',
    nis: '2024101',
    fullName: 'Muhammad Raihan Pratama',
    gender: 'L',
    classroomId: 'cmvzfm1jo000xuz20inzpm0c8',
    className: 'X-1',
    dormitory: '-',
    parentName: 'H. Bambang Sudarmono',
    parentPhone: '081234000111',
  },
  {
    id: 's-102',
    nis: '2024102',
    fullName: 'Faris Naufal Al-Ghifari',
    gender: 'L',
    classroomId: 'cmvzfm1jo000xuz20inzpm0c8',
    className: 'X-1',
    dormitory: '-',
    parentName: 'Ibu Siti Khodijah',
    parentPhone: '081234000222',
  },
  {
    id: 's-201',
    nis: '2023201',
    fullName: 'Zaidan Akmal Hasan',
    gender: 'L',
    classroomId: 'cmvzfm4jf0017uz2013g2s3h4',
    className: 'XI-1',
    dormitory: '-',
    parentName: 'Bpk. Ahmad Suhartono',
    parentPhone: '081234000333',
  },
  {
    id: 's-202',
    nis: '2023202',
    fullName: 'Bilal Habibi Ramadhan',
    gender: 'L',
    classroomId: 'cmvzfm4jf0017uz2013g2s3h4',
    className: 'XI-1',
    dormitory: '-',
    parentName: 'Ibu Dewi Rahmawati',
    parentPhone: '081234000444',
  },
];

// Seed initial permissions for testing immediate flow
export const INITIAL_PERMISSIONS: Permission[] = [];
