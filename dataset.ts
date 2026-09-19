export interface WordData {
  id: string;
  english: string;
  russian: string;
  category: string;
  aliases: string[];
  context: string;
}

export const DATASET: WordData[] = [
  {id:'w01', english:"New Year's Eve", russian:"Канун Нового года", category:"Nouns", aliases:["канун нового года","канун","new year's eve","nye"], context:"We're throwing a huge party on _____ this year, you should totally come."},
  {id:'w02', english:"New Year's Day", russian:"1 января", category:"Nouns", aliases:["1 января","первое января","первого января","new year's day"], context:"I never make plans for _____ — I just sleep and watch movies."},
  {id:'w03', english:"Countdown", russian:"Обратный отсчёт", category:"Nouns", aliases:["обратный отсчет","обратный отсчёт","countdown"], context:"We're doing the _____ at 11:59, don't miss it!"},
  {id:'w04', english:"Midnight", russian:"Полночь", category:"Nouns", aliases:["полночь","в полночь","midnight"], context:"They always kiss at _____ — it's kind of a tradition."},
  {id:'w05', english:"Fireworks", russian:"Фейерверки", category:"Nouns", aliases:["фейерверки","салюты","салют","fireworks"], context:"The _____ over the river are absolutely amazing every year."},
  {id:'w06', english:"New Year's resolution", russian:"Новогоднее решение", category:"Nouns", aliases:["новогоднее решение","new year's resolution"], context:"My _____ this year is to actually read more books and scroll less."},
  {id:'w07', english:"Hangover", russian:"Похмелье", category:"Nouns", aliases:["похмелье","похмел","hangover"], context:"I've got the worst _____ — I definitely drank way too much last night."},
  {id:'w08', english:"Leftovers", russian:"Остатки еды", category:"Nouns", aliases:["остатки еды","остатки","leftovers"], context:"Want some _____? There's still tons of food in the fridge."},
  {id:'w09', english:"To celebrate", russian:"Праздновать", category:"Verbs", aliases:["праздновать","отмечать","праздновать новый год","celebrate","to celebrate"], context:"We usually _____ with my cousins at their place — way more fun."},
  {id:'w10', english:"To party", russian:"Тусить", category:"Verbs", aliases:["тусить","тусоваться","веселиться","party","to party"], context:"They're gonna _____ all night, I heard — might join them later."},
  {id:'w11', english:"To set off fireworks", russian:"Запускать фейерверки", category:"Verbs", aliases:["запускать фейерверки","запускать салюты","запускать салют","set off fireworks","to set off fireworks"], context:"My dad always _____ at midnight, it's his thing every year."},
  {id:'w12', english:"To count down", russian:"Вести обратный отсчёт", category:"Verbs", aliases:["вести обратный отсчет","вести обратный отсчёт","считать","count down","to count down"], context:"Let's _____ together — ten, nine, eight… come on!"},
  {id:'w13', english:"To stay up all night", russian:"Не спать всю ночь", category:"Verbs", aliases:["не спать всю ночь","бодрствовать всю ночь","не ложиться","stay up all night","to stay up all night"], context:"I'm too old to _____ anymore, I'll probably fall asleep by 2 a.m."},
  {id:'w14', english:"To crash", russian:"Вырубиться", category:"Verbs", aliases:["вырубиться","уснуть","вырубится","pass out","crash","to crash"], context:"He totally _____ on the couch around 3 a.m., couldn't wake him up."},
  {id:'w15', english:"To order pizza", russian:"Заказать пиццу", category:"Verbs", aliases:["заказать пиццу","заказать пиццы","order pizza","to order pizza"], context:"We always _____ around 10 p.m. — it's basically a tradition at this point."},
  {id:'w16', english:"Happy New Year!", russian:"С Новым годом!", category:"At the table", aliases:["с новым годом","с новым годом!","happy new year"], context:"_____, everyone! Let's make this a good one."},
  {id:'w17', english:"Cheers!", russian:"Будем!", category:"At the table", aliases:["будем","за нас","cheers"], context:"_____, to all of us being here tonight — couldn't ask for better company."},
  {id:'w18', english:"What are your plans for NYE?", russian:"Какие планы на новогоднюю ночь?", category:"At the table", aliases:["какие планы на новогоднюю ночь","какие планы на новый год","какие планы","what are your plans for nye","what are your plans","plans for nye"], context:"So, _____? Anything fun or just chilling at home?"},
  {id:'w19', english:"Bro, I'm stuffed!", russian:"Бро, я объелся!", category:"At the table", aliases:["бро я объелся","я объелся","я наелся","бро я наелся","bro i'm stuffed","i'm stuffed"], context:"_____, I literally can't eat another bite — that turkey was insane."},
  {id:'w20', english:"I'm good, thanks.", russian:"Мне хватит, спасибо", category:"At the table", aliases:["мне хватит спасибо","мне хватит","хватит спасибо","спасибо хватит","i'm good thanks","i'm good"], context:"More wine? — _____, I've had enough for tonight."},
  {id:'w21', english:"Let's do the countdown!", russian:"Давайте считать до полуночи!", category:"At the table", aliases:["давайте считать до полуночи","давайте считать","считать до полуночи","let's do the countdown","do the countdown"], context:"_____, it's almost time — grab your drinks!"},
  {id:'w22', english:"What year is it?!", russian:"Какой сейчас вообще год?!", category:"Morning Jan 1", aliases:["какой сейчас вообще год","какой сейчас год","какой год","what year is it"], context:"_____, I honestly can't even remember what day of the week it is."},
  {id:'w23', english:"I need coffee right now.", russian:"Мне срочно нужен кофе", category:"Morning Jan 1", aliases:["мне срочно нужен кофе","мне нужен кофе","срочно нужен кофе","i need coffee right now","i need coffee"], context:"_____, my head is absolutely killing me this morning."},
  {id:'w24', english:"Let's just eat leftovers and chill.", russian:"Давай просто доедим остатки и почиллим", category:"Morning Jan 1", aliases:["давай просто доедим остатки и почиллим","доедим остатки","давай доедим","let's just eat leftovers and chill","eat leftovers and chill"], context:"_____, I don't feel like going anywhere or doing anything today."},
  {id:'w25', english:"I'm not leaving the couch today.", russian:"Я сегодня с дивана не слезу", category:"Morning Jan 1", aliases:["я сегодня с дивана не слезу","не слезу с дивана","с дивана не слезу","i'm not leaving the couch today","not leaving the couch"], context:"_____, I'm watching movies and eating snacks all day — don't even try."}
];
