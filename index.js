import express from "express";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TOKEN_API;
const bot = new TelegramBot(token);

// ===== RAMAZON VA REPLIES =====
const ramazonTimes = {
  "2026-02-18": { saharlik: "05:55", iftorlik: "18:04" },
  "2026-02-19": { saharlik: "05:54", iftorlik: "18:05" },
  "2026-02-20": { saharlik: "05:53", iftorlik: "18:07" },
  "2026-02-21": { saharlik: "05:51", iftorlik: "18:08" },
  "2026-02-22": { saharlik: "05:50", iftorlik: "18:09" },
  "2026-02-23": { saharlik: "05:49", iftorlik: "18:10" },
  "2026-02-24": { saharlik: "05:47", iftorlik: "18:11" },
  "2026-02-25": { saharlik: "05:46", iftorlik: "18:13" },
  "2026-02-26": { saharlik: "05:44", iftorlik: "18:14" },
  "2026-02-27": { saharlik: "05:43", iftorlik: "18:15" },
  "2026-02-28": { saharlik: "05:41", iftorlik: "18:16" },
  "2026-03-01": { saharlik: "05:40", iftorlik: "18:17" },
  "2026-03-02": { saharlik: "05:38", iftorlik: "18:19" },
  "2026-03-03": { saharlik: "05:37", iftorlik: "18:20" },
  "2026-03-04": { saharlik: "05:35", iftorlik: "18:21" },
  "2026-03-05": { saharlik: "05:34", iftorlik: "18:22" },
  "2026-03-06": { saharlik: "05:32", iftorlik: "18:23" },
  "2026-03-07": { saharlik: "05:31", iftorlik: "18:24" },
  "2026-03-08": { saharlik: "05:29", iftorlik: "18:25" },
  "2026-03-09": { saharlik: "05:27", iftorlik: "18:27" },
  "2026-03-10": { saharlik: "05:26", iftorlik: "18:28" },
  "2026-03-11": { saharlik: "05:24", iftorlik: "18:29" },
  "2026-03-12": { saharlik: "05:22", iftorlik: "18:30" },
  "2026-03-13": { saharlik: "05:21", iftorlik: "18:31" },
  "2026-03-14": { saharlik: "05:19", iftorlik: "18:32" },
  "2026-03-15": { saharlik: "05:17", iftorlik: "18:33" },
  "2026-03-16": { saharlik: "05:15", iftorlik: "18:34" },
  "2026-03-17": { saharlik: "05:14", iftorlik: "18:35" },
  "2026-03-18": { saharlik: "05:12", iftorlik: "18:37" },
  "2026-03-19": { saharlik: "05:10", iftorlik: "18:38" }
};

const replies = {
  greetings: ["Assalomu Alaykum Va Rahmatullohi Va Barakatuh", "Va Alaykum Assalom Va Rahmatulahi Va Barakatuh"],
  status: ["Tinch", "Tinch ozindachi", "Boladi ozindachi"],
  doing: ["Otiriman ozinchi nimala qivosan", "Otiriman"],
  thanks: ["Raxmat","Rahmat","Halades","San ham Maladesan"],
  tnch:["Tinch Bogin, Bugun kun nimeydi??", "Yaxshi, hardoim tinch bogin, Bugun Nima kun??"],
  arzmid: ["Arzimid, Sangaham Raxmat", "Arzmid", "Arzid", "Arzisan"],
  bohopas: ["Sangayam shu boho", "Manga boshqa yozma bomasam"],
  balandboho: ["Nimaga 10/10 mas ", "Nima uchun 10/10 mas","Azgincha ball qoshsen 10/10 bolardi"],
  eng: ["1 ball qoyishga erindinmi", "1 ball jalkami","Nima uchun 10/10 mas 9/10 ", "1 ball qani"],
  max: ["Sanam 10/10 san", "Sangayam 10 dan 10 qoydim", "Oz faqatgina 10/10 ga arzimande!"],
  juma: ["Juma ayomlaring bilan bomasa", "Juma bilan","Juma bilan tabrikliman ","Bomasa hamman Juma ayomlari bilan tabrikliman"],
  togri:["Ozi man hardoyim to'g'ri gapiraman", "Hardoim man 'Прав' man"],
  arzmid:["Hm","Ok","👍","👌"],
  blagon: ["Bilogonmisan??","Eng Aqiligmsan","Aqil orgatma ozimam bilaman"],
  ramazon: ["Bugungi chisloni etgin man sanga qachon tugashini etaman","Bugungi Chisloni etchi"],
  kechir: ["Mayli bolam","Oylab koraman","Yana sorasen kechiraman"],
  yozma:["Bomasam manga yozma!", "Bor bomasam boshqasi bilan gaplash!","Bor yoqol bomasam!"],
  atv:["Yaxshi rahmat, Ozin tinchmisan","Chotkiman, Ozin Tinchmisan"]
};

// ===== MESSAGELARNI HANDLER QILISH =====
bot.on("message", (msg) => {
  if (!msg.text) return; // text bo‘lmasa chiq
  const text = msg.text;

  if (["Salom"].includes(text)) {
    bot.sendMessage(msg.chat.id, "Salom");
  }else if(["Assalomu Alekum","Assalomu Alaykum","Assalomu alaykum","Assalomu alekum"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.greetings))
  }else if(["Qalesan","Qale","Qonday"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.atv))
  }else if(["Hi","Hello"].includes(text)){
    bot.sendMessage(msg.chat.id, "Uzbecha yoz")
  }else if(["Bopti","Bopt","Bye","Bopti ketishim kerek","Bopt ketshim kerak","Bopt ketshm kk","Bopti ketshm kk","Bopti ketishim kk","Bopti Ketshm kerek"].includes(text)){
    bot.sendMessage(msg.chat.id, "Bopti yaxshi dam ol")
  } else if (["Nma gap","Nima gap","Tinch msan","Tinch misan"].includes(text)) {
    bot.sendMessage(msg.chat.id, random(replies.status));
  } else if (["Eng zor bola km","Zor bola kim","Zor bola km","Eng zor bola kim",
              "Sani kim yaratgan","Sani km yaratgan","San kim uchun ishlisan","San km uchun ishlisan","Km uchun ishlisan","San kim yaratgan","San km yaratgan"].includes(text)) {
    bot.sendMessage(msg.chat.id, "Sherzod");
  } else if (["Nma qvosan","Nima qivosan","Nima qvosan","Nimala qivosan","Nmala qivosan"].includes(text)) {
    bot.sendMessage(msg.chat.id, random(replies.doing));
  } else if (["Malades","Maladescha","Malads","Malades san"].includes(text)) {
    bot.sendMessage(msg.chat.id, random(replies.thanks));
  } else if(["Tinch", "Tnch", "Boladi", "Bolad","Mandayam shu", "Tinch mas", "Tnch mas", "Mandayam tinch", "Mandayam tnch","Manam tinchman","+","Manam tnchman","Da tinchman","Da tnchman"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.tnch))
  } else if(["Raxmat", "Rahmat", "Rahmat ozinham","Raxmat ozinham", "Raxmat ozinam","Rahmat ozinam" ].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.arzmid))
  }else if(["1/10","2/10","3/10","4/10","0/10"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.bohopas))
  }else if(["5/10","6/10","7/10","8/10"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.balandboho))
  }else if(["9/10"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.eng))
  }else if(["10/10"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.max))
  }else if(["Juma bilan","Juma ayomlar bilan","Juma blan","Juma ayomlarin bilan","Juma ayomlarin blan"].includes(text)){
    bot.sendMessage(msg.chat.id, "Bugun Jumami")
  }else if(["Hh","Hm","Bugun juma","Da blmomdin","Da bugun juma","Da juma bugun","Da juma","H bugun juma","Hm bugun juma","Ha bugun juma"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.juma))
  }else if(["Togri","To'g'ri","Da To'g'ri","Da togri"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.togri))
  }else if(["Arzisan","Arzmid","Arzid","Arzmisan"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.arzmid))
  }else if(["Dushanbe","Dushanbi","Dushanb","Dushanba","Bugun kun dushanb","Bugun dushanb"].includes(text)){
    bot.sendMessage(msg.chat.id, "Eh Shu kuni Mk boshlanadi shunis yoqmidde")
  }else if(["Seshanbe","Seshanbi","Seshanb","Seshanba","Bugun kun seshanb","Bugun seshanb"].includes(text)){
    bot.sendMessage(msg.chat.id, "Yaxshi oqivosanmi?(Yaxshi oqivotgan bosen H yoki Ha yoki Albata yoki Yoq yoki Mk yoqmid) dib yoz ushanda man to'g'ri jovob qaytaraman)")
  }else if(["H","Ha","Albata"].includes(text)){
    bot.sendMessage(msg.chat.id, "Mayli Yaxshi oqigin kotta bosen Olm bolasan")
  }else if(["Yoq","Mk yoqmid"].includes(text)){
    bot.sendMessage(msg.chat.id, "++++, Mangayam yoqmid")
  }else if(["Chorshanbe","Chorshanbi","Chorshanb","Chorshanba","Bugun kun chorshanb","Bugun chorshanbi","Bugun chorshanb"].includes(text)){
  bot.sendMessage(msg.chat.id, "O‘rtasi hafta, sabr qil, tez orada dam olish kunlari keladi 😅")
  }else if(["Payshanbe","Payshanbi","Payshanb","Payshanba","Bugun kun payshanb","Bugun payshanbi"].includes(text)){
  bot.sendMessage(msg.chat.id, "Hafta oxiri yaqin, sabr qil, dam olishga oz qoldi ")
  }else if(["Shanbe","Shanbi","Shanb","Shanba","Bugun kun shanb","Bugun shanbi","Bugun shanb"].includes(text)){
  bot.sendMessage(msg.chat.id, "Dam olish kunlari boshlandi, yaxshi hordiq chiqar! ")
  }else if(["Yakshanbe","Yakshanbi","Yakshanb","Yakshanba","Bugun kun yakshanb","Bugun yakshanbi","Bugun yakshanb"].includes(text)){
  bot.sendMessage(msg.chat.id, "Yakshanba – dam olish kuni, ertaga yangi hafta boshlanadi ")
  }else if(["Da blaman","Da bilaman","Ha bilaman","ha blaman","H bilaman","H blaman","Blaman","Bilaman"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.blagon))
  }else if(["Da aqliman","Da eng aqilisman","Da bilagonman","Da blagonman","Da eng aqlisman","Da aqiliman","H aqiliman","H nmed","H nimed","H eng aqilisman","H blagonman","Da nimed","Nima qibti"].includes(text)){
    bot.sendMessage(msg.chat.id, "Batanik 🤓")
  }else if(["Pashol n","Pashol","Ozinsan","Oznsan","Bore"].includes(text)){
    bot.sendMessage(msg.chat.id, "To'g'ri gaplashilu")
  }else if(["Yo","Sandan soramiman","Pashol n","Bor yoqol"].includes(text)){
    bot.sendMessage(msg.chat.id, "Bomasam manga yozma!")
  }else if(["Uzur","Kechr","Kechir","Mani Kechir","Bopt kechir","Bopti kechir","Bopti kechr","Bopt kechr"].includes(text)){
    bot.sendMessage(msg.chat.id, random(replies.kechir))
  }else if(["Ramazon qachon tugid","Ramzoni ohirgi kuni qachon","Ramazoni ohrg kun qachon","Bugun iftorlik nechida","Bugun iftorlik nechda","Bugun saharlik nechida","Bugun saharlik nechda", "Saharlik nechida","Saharlik nechda", "Iftorlik nechida", "Iftorlik nechda","Iftorli nechda","Iftorli nechida","Saharli nechda", "Saharli nechida"].includes(text)){
  const today = new Date();
  const endDate = new Date("2026-03-19"); // Ramazon tugash sanasi
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const todayKey = today.toISOString().split("T")[0];
  const times = ramazonTimes[todayKey];

  if (diffDays > 0) {
    if (times) {
      bot.sendMessage(msg.chat.id, 
        `Ramazon ${endDate.toLocaleDateString()} kuni tugaydi. Tugashiga ${diffDays} kun qoldi.\n` +
        `Bugun saharlik ${times.saharlik} da, iftorlik ${times.iftorlik} da.`
      );
    } else {
      bot.sendMessage(msg.chat.id, 
        `Ramazon ${endDate.toLocaleDateString()} kuni tugaydi. Tugashiga ${diffDays} kun qoldi.\n` +
        `Bugungi saharlik/iftorlik vaqtini hali qo‘shmagansan.`
      );
    }
  } else if (diffDays === 0) {
    bot.sendMessage(msg.chat.id, "Bugun Ramazonning oxirgi kuni!");
  } else {
    bot.sendMessage(msg.chat.id, `Ramazon ${endDate.toLocaleDateString()} kuni tugagan.`);
  }
}

});

// ===== VERCEL SERVERLESS HANDLER =====
// ===== UTILITY =====
function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== EXPRESS SERVER (faqat status) =====
app.get("/", (req,res)=>{
  res.send("Ramazon bot ishlayapti!");
});

app.listen(process.env.PORT || 3000, ()=>console.log("Server ishlayapti..."));