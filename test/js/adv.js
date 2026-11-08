'use strict';
/* ================= ПРИКЛЮЧЕНИЯ: бесплатные книги из открытых библиотек =================
   Джессика 18.10: a tab where anyone finds a free book, downloads it to the phone and reads it at once, without the story mode.
   Sources are a registry (ADV_SRC): each one searches its catalogue and turns one item into a book. Audio (LibriVox) can join
   later as kind:'audio'. Checked 18.10 from GitHub Actions (curl with Origin):
   - Викитека (ru.wikisource.org/w/api.php, origin=*): search and page text both send Access-Control-Allow-Origin: * → works from the phone.
     Pages Wikisource marks as a rights problem cannot be downloaded; lists of editions open as a list to pick from.
   - Project Gutenberg: the OPDS catalogue (/ebooks/search.opds, /ebooks/N.opds) sends ACAO *, the book files (/cache/epub/…) do NOT.
     So the catalogue works; the file is fetched directly (in case that changes) and then through ADV_PROXY when one is set.
     Without a proxy the sheet offers the file itself: the browser saves it, «Добавить книгу» puts it on the shelf.
   Nothing here is stored except the downloaded book: rqAddBook() (same path as a file import) with two fields on the card,
   lang (already used by FB2 books) and srcId ('gutenberg:<n>' | 'wikisource:<page>'), arch.md 18.10. Browsing writes nothing. */
const ADV_PROXY=''; /* own CORS proxy for Gutenberg files, '' = none yet (needs Джессика's word: it is a server) */
const ADV_GUT='https://www.gutenberg.org';
const ADV_SE='https://standardebooks.org';
const ADV_WS='https://ru.wikisource.org/w/api.php';
const ADV_WS_MAX=800; /* pages per book: «Война и мир» is ~370 chapter pages */
const ADV={src:'all',q:'',lang:'ru',items:[],more:null,busy:false,err:'',seq:0,dl:false,set:null,alt:'',sseq:0,fk:'',fl:''};
const ADV_LANGS=[['ru','Русские'],['en','English'],['de','Deutsch'],['fr','Français'],['','Все языки']];
/* 25.10 (Джессика): portraits instead of name chips; public domain, Wikimedia Commons (hero/authors/credits.json); a missing file leaves the initial */
const ADV_FACES={'Пушкин':'pushkin','Гоголь':'gogol','Толстой':'tolstoy','Чехов':'chekhov','Гомер':'homer','Шекспир':'shakespeare','Данте':'dante','Сервантес':'cervantes','Диккенс':'dickens','Гёте':'goethe','Жюль Верн':'verne','Андерсен':'andersen'};
/* 28.10 (Джессика: «гораздо больше портретов, а то они одни и те же»): [подпись, файл, кого искать на Викитеке] */
const ADV_FACES_MORE=[['Лермонтов','lermontov','Михаил Юрьевич Лермонтов'],['Тургенев','turgenev','Иван Сергеевич Тургенев'],['Достоевский','dostoevsky','Фёдор Михайлович Достоевский'],
  ['Островский','ostrovsky','Александр Николаевич Островский'],['Грибоедов','griboyedov','Александр Сергеевич Грибоедов'],['Крылов','krylov','Иван Андреевич Крылов'],['Карамзин','karamzin','Николай Михайлович Карамзин'],
  ['Горький','gorky','Максим Горький'],['Куприн','kuprin','Александр Иванович Куприн'],['Блок','blok','Александр Александрович Блок'],['Есенин','yesenin','Сергей Александрович Есенин'],
  ['Маяковский','mayakovsky','Владимир Владимирович Маяковский'],['Цветаева','tsvetaeva','Марина Ивановна Цветаева'],['Жуковский','zhukovsky','Василий Андреевич Жуковский'],['Некрасов','nekrasov','Николай Алексеевич Некрасов'],
  ['Тютчев','tyutchev','Фёдор Иванович Тютчев'],['Фет','fet','Афанасий Афанасьевич Фет'],['Салтыков-Щедрин','saltykov','Михаил Евграфович Салтыков-Щедрин'],['Лесков','leskov','Николай Семёнович Лесков'],
  ['Державин','derzhavin','Гавриил Романович Державин'],['Ломоносов','lomonosov','Михаил Васильевич Ломоносов'],['Беляев','belyaev','Александр Романович Беляев'],
  ['Платон','plato','Платон'],
  ['Шиллер','schiller','Фридрих Шиллер'],['Байрон','byron','Байрон'],['Остин','austen','Джейн Остин'],['Шарлотта Бронте','bronte','Шарлотта Бронте'],['Дюма','dumas','Александр Дюма'],['Гюго','hugo','Виктор Гюго'],
  ['Бальзак','balzac','Оноре де Бальзак'],['Флобер','flaubert','Гюстав Флобер'],['Мопассан','maupassant','Ги де Мопассан'],['Стендаль','stendhal','Стендаль'],['Вольтер','voltaire','Вольтер'],
  ['Марк Твен','twain','Марк Твен'],['Эдгар По','poe','Эдгар По'],['Джек Лондон','london','Джек Лондон'],['Купер','cooper','Джеймс Фенимор Купер'],['Конан Дойл','doyle','Артур Конан Дойль'],
  ['Стивенсон','stevenson','Роберт Льюис Стивенсон'],['Киплинг','kipling','Редьярд Киплинг'],['Уайльд','wilde','Оскар Уайльд'],['Свифт','swift','Джонатан Свифт'],['Дефо','defoe','Даниель Дефо'],
  ['Вальтер Скотт','scott','Вальтер Скотт'],['Уэллс','wells','Герберт Уэллс'],['Кэрролл','carroll','Льюис Кэрролл'],['Братья Гримм','grimm','Братья Гримм'],['Мольер','moliere','Мольер'],
  ['Петрарка','petrarch','Франческо Петрарка'],['Гейне','heine','Генрих Гейне'],['Бёрнс','burns','Роберт Бёрнс'],
  /* 29.10 (Джессика: «разнообразь женщинами»): писательницы */
  ['Эмили Бронте','ebronte','Эмили Бронте'],['Энн Бронте','abronte','Энн Бронте'],['Джордж Элиот','eliot','Джордж Элиот'],['Мэри Шелли','mshelley','Мэри Шелли'],['Луиза Олкотт','alcott','Луиза Мэй Олкотт'],['Бичер-Стоу','stowe','Гарриет Бичер-Стоу'],['Эмили Дикинсон','dickinson','Эмили Дикинсон'],['Вирджиния Вулф','woolf','Вирджиния Вулф'],['Гаскелл','gaskell','Элизабет Гаскелл'],['Жорж Санд','sand','Жорж Санд'],['Сельма Лагерлёф','lagerlof','Сельма Лагерлёф'],['Эдит Несбит','nesbit','Эдит Несбит'],['Фрэнсис Бёрнетт','burnett','Фрэнсис Ходжсон Бёрнетт'],['Люси Монтгомери','montgomery','Люси Мод Монтгомери'],['Элизабет Браунинг','ebrowning','Элизабет Барретт Браунинг'],['Кристина Россетти','rossetti','Кристина Россетти'],['Эдит Уортон','wharton','Эдит Уортон'],['Жермена де Сталь','stael','Жермена де Сталь'],['Ростопчина','rostopchina','Евдокия Петровна Ростопчина'],['Каролина Павлова','pavlova','Каролина Карловна Павлова'],['Надежда Дурова','durova','Надежда Андреевна Дурова'],['Зинаида Гиппиус','gippius','Зинаида Николаевна Гиппиус'],['Мирра Лохвицкая','lokhvitskaya','Мирра Александровна Лохвицкая'],['Софья Ковалевская','kovalevskaya','Софья Васильевна Ковалевская'],['Екатерина Дашкова','dashkova','Екатерина Романовна Дашкова'],['Мэри Уолстонкрафт','wollstonecraft','Мэри Уолстонкрафт'],['Элиза Ожешко','orzeszkowa','Элиза Ожешко'],['Эбнер-Эшенбах','ebnereschenbach','Мария фон Эбнер-Эшенбах'],['Мадам де Севинье','sevigne','Мадам де Севинье'],['Мадам де Лафайет','lafayette','Мадам де Лафайет'],
  /* 05.11 (Джессика: «побольше писателей самых разных»): Азия, Америка, Африка, Европа, ещё русские и украинские */
  ['Нацумэ Сосэки','soseki','Нацумэ Сосэки'],['Акутагава','akutagawa','Рюноскэ Акутагава'],['Хигути Итиё','ichiyo','Хигути Итиё'],['Лу Синь','luxun','Лу Синь'],['Хафиз','hafez','Хафиз'],['Руми','rumi','Джалаладдин Руми'],['Рубен Дарио','dario','Рубен Дарио'],['Машаду де Ассис','machado','Машаду де Ассис'],['Хуана Инес де ла Крус','sorjuana','Хуана Инес де ла Крус'],['Фредерик Дуглас','douglass','Фредерик Дуглас'],['Олауда Эквиано','equiano','Олауда Эквиано'],['Чернышевский','chernyshevsky','Николай Гаврилович Чернышевский'],['Герцен','herzen','Александр Иванович Герцен'],['Короленко','korolenko','Владимир Галактионович Короленко'],['Леонид Андреев','andreyev','Леонид Николаевич Андреев'],['Александр Грин','grin','Александр Грин'],['Хлебников','khlebnikov','Велимир Хлебников'],['Мандельштам','mandelstam','Осип Эмильевич Мандельштам'],['Гумилёв','gumilev','Николай Степанович Гумилёв'],['Волошин','voloshin','Максимилиан Александрович Волошин'],['Брюсов','bryusov','Валерий Яковлевич Брюсов'],['Бальмонт','balmont','Константин Дмитриевич Бальмонт'],['Андрей Белый','bely','Андрей Белый'],['Сологуб','sologub','Фёдор Сологуб'],['Гаршин','garshin','Всеволод Михайлович Гаршин'],['Мамин-Сибиряк','mamin','Дмитрий Наркисович Мамин-Сибиряк'],['Батюшков','batyushkov','Константин Николаевич Батюшков'],['Баратынский','baratynsky','Евгений Абрамович Баратынский'],['Кольцов','koltsov','Алексей Васильевич Кольцов'],['Тарас Шевченко','shevchenko','Тарас Григорьевич Шевченко'],['Леся Украинка','ukrainka','Леся Украинка'],['Мицкевич','mickiewicz','Адам Мицкевич'],['Сенкевич','sienkiewicz','Генрик Сенкевич'],['Мария Конопницкая','konopnicka','Мария Конопницкая'],['Гашек','hasek','Ярослав Гашек'],['Карел Чапек','capek','Карел Чапек'],['Коллоди','collodi','Карло Коллоди'],['Лопе де Вега','lopedevega','Лопе де Вега'],['Беккер','becquer','Густаво Адольфо Беккер'],['Камоэнс','camoes','Луис де Камоэнс'],['Гофман','hoffmann','Эрнст Теодор Амадей Гофман'],['Кафка','kafka','Франц Кафка'],['Рильке','rilke','Райнер Мария Рильке'],['Лессинг','lessing','Готхольд Эфраим Лессинг'],['Берта фон Зутнер','suttner','Берта фон Зутнер'],['Ибсен','ibsen','Генрик Ибсен'],['Стриндберг','strindberg','Август Стриндберг'],['Бьёрнсон','bjornson','Бьёрнстьерне Бьёрнсон'],['Готорн','hawthorne','Натаниэль Готорн'],['Мелвилл','melville','Герман Мелвилл'],['Торо','thoreau','Генри Дэвид Торо'],['О. Генри','ohenry','О. Генри'],['Вашингтон Ирвинг','irving','Вашингтон Ирвинг'],['Томас Гарди','hardy','Томас Гарди'],['Джозеф Конрад','conrad','Джозеф Конрад'],['Теккерей','thackeray','Уильям Мейкпис Теккерей'],['Мильтон','milton','Джон Мильтон'],['Рабле','rabelais','Франсуа Рабле'],['Монтень','montaigne','Мишель де Монтень'],['Руссо','rousseau','Жан-Жак Руссо'],['Верлен','verlaine','Поль Верлен'],['Рембо','rimbaud','Артюр Рембо'],['Бодлер','baudelaire','Шарль Бодлер'],['Золя','zola','Эмиль Золя'],['Йейтс','yeats','Уильям Батлер Йейтс'],['Тору Датт','toru','Тору Датт'],['Сароджини Найду','naidu','Сароджини Найду'],['Пандита Рамабаи','ramabai','Пандита Рамабаи'],
  /* 07.11 (Джессика: «ещё хотя бы 150 авторов и их портреты»): русские, украинские, кавказские и среднеазиатские, Европа, Азия, обе Америки, Африка */
  ['Фонвизин','fonvizin','Денис Иванович Фонвизин'],['Радищев','radishchev','Александр Николаевич Радищев'],['Одоевский','odoevsky','Владимир Фёдорович Одоевский'],['Аксаков','aksakov','Сергей Тимофеевич Аксаков'],
  ['Погорельский','pogorelsky','Антоний Погорельский'],['Дельвиг','delvig','Антон Антонович Дельвиг'],['Вяземский','vyazemsky','Пётр Андреевич Вяземский'],['Полежаев','polezhaev','Александр Иванович Полежаев'],
  ['Бенедиктов','benediktov','Владимир Григорьевич Бенедиктов'],['Плещеев','pleshcheyev','Алексей Николаевич Плещеев'],['Майков','maykov','Аполлон Николаевич Майков'],['Полонский','polonsky','Яков Петрович Полонский'],
  ['Алексей К. Толстой','aktolstoy','Алексей Константинович Толстой'],['Никитин','nikitin','Иван Саввич Никитин'],['Суриков','surikov','Иван Захарович Суриков'],['Апухтин','apukhtin','Алексей Николаевич Апухтин'],
  ['Надсон','nadson','Семён Яковлевич Надсон'],['Писемский','pisemsky','Алексей Феофилактович Писемский'],['Глеб Успенский','uspensky','Глеб Иванович Успенский'],['Станюкович','stanyukovich','Константин Михайлович Станюкович'],
  ['Данилевский','danilevsky','Григорий Петрович Данилевский'],['Лажечников','lazhechnikov','Иван Иванович Лажечников'],['Кюхельбекер','kuchelbecker','Вильгельм Карлович Кюхельбекер'],['Огарёв','ogarev','Николай Платонович Огарёв'],
  ['Белинский','belinsky','Виссарион Григорьевич Белинский'],['Добролюбов','dobrolyubov','Николай Александрович Добролюбов'],['Писарев','pisarev','Дмитрий Иванович Писарев'],['Анненский','annensky','Иннокентий Фёдорович Анненский'],
  ['Кузмин','kuzmin','Михаил Алексеевич Кузмин'],['Северянин','severyanin','Игорь Северянин'],['Саша Чёрный','chorny','Саша Чёрный'],['Аверченко','averchenko','Аркадий Тимофеевич Аверченко'],
  ['Замятин','zamyatin','Евгений Иванович Замятин'],['Булгаков','bulgakov','Михаил Афанасьевич Булгаков'],['Платонов','platonov','Андрей Платонович Платонов'],['Бабель','babel','Исаак Эммануилович Бабель'],
  ['Ильф','ilf','Илья Ильф'],['Богданов','bogdanov','Александр Александрович Богданов'],['Циолковский','tsiolkovsky','Константин Эдуардович Циолковский'],['Алексей Н. Толстой','atolstoy','Алексей Николаевич Толстой'],
  ['Николай Островский','ostrovskyn','Николай Алексеевич Островский'],['Серафимович','serafimovich','Александр Серафимович'],['Вересаев','veresaev','Викентий Викентьевич Вересаев'],['Шмелёв','shmelyov','Иван Сергеевич Шмелёв'],
  ['Арцыбашев','artsybashev','Михаил Петрович Арцыбашев'],['Зиновьева-Аннибал','zinovieva','Лидия Дмитриевна Зиновьева-Аннибал'],['Хвощинская','khvoshchinskaya','Надежда Дмитриевна Хвощинская'],['Щепкина-Куперник','shchepkina','Татьяна Львовна Щепкина-Куперник'],
  ['Иван Франко','franko','Иван Яковлевич Франко'],['Котляревский','kotlyarevsky','Иван Петрович Котляревский'],['Марко Вовчок','vovchok','Марко Вовчок'],['Кобылянская','kobylyanska','Ольга Юлиановна Кобылянская'],
  ['Абай','abay','Абай Кунанбаев'],['Чавчавадзе','chavchavadze','Илья Григорьевич Чавчавадзе'],['Басё','basho','Мацуо Басё'],['Мори Огай','ogai','Мори Огай'],
  ['Ду Фу','dufu','Ду Фу'],['Конфуций','confucius','Конфуций'],['Цю Цзинь','qiujin','Цю Цзинь'],['Премчанд','premchand','Премчанд'],
  ['Банкимчандра','bankim','Банкимчандра Чаттерджи'],['Икбал','iqbal','Мухаммад Икбал'],['Джебран','gibran','Джебран Халиль Джебран'],['Хосе Марти','marti','Хосе Марти'],
  ['Орасио Кирога','quiroga','Орасио Кирога'],['Сармьенто','sarmiento','Доминго Фаустино Сармьенто'],['Рикардо Пальма','palma','Рикардо Пальма'],['Гомес де Авельянеда','avellaneda','Гертрудис Гомес де Авельянеда'],
  ['Росалия де Кастро','castro','Росалия де Кастро'],['Пардо Басан','pardobazan','Эмилия Пардо Басан'],['Перес Гальдос','galdos','Бенито Перес Гальдос'],['Унамуно','unamuno','Мигель де Унамуно'],
  ['Бласко Ибаньес','blasco','Висенте Бласко Ибаньес'],['Кеведо','quevedo','Франсиско де Кеведо'],['Гонгора','gongora','Луис де Гонгора'],['Тереза Авильская','teresa','Тереза Авильская'],
  ['Пессоа','pessoa','Фернандо Пессоа'],['Эса де Кейрош','queiros','Жозе Мария Эса де Кейрош'],['Мандзони','manzoni','Алессандро Мандзони'],['Верга','verga','Джованни Верга'],
  ['Пиранделло','pirandello','Луиджи Пиранделло'],['Д’Аннунцио','dannunzio','Габриеле д’Аннунцио'],['Сальгари','salgari','Эмилио Сальгари'],['Тассо','tasso','Торквато Тассо'],
  ['Макиавелли','machiavelli','Никколо Макиавелли'],['Корнель','corneille','Пьер Корнель'],['Лафонтен','lafontaine','Жан де Лафонтен'],['Шарль Перро','perrault','Шарль Перро'],
  ['Дидро','diderot','Дени Дидро'],['Монтескье','montesquieu','Шарль Монтескье'],['Бомарше','beaumarchais','Пьер Бомарше'],['Шатобриан','chateaubriand','Франсуа Рене де Шатобриан'],
  ['Мериме','merimee','Проспер Мериме'],['Мюссе','musset','Альфред де Мюссе'],['Ламартин','lamartine','Альфонс де Ламартин'],['Виньи','vigny','Альфред де Виньи'],
  ['Готье','gautier','Теофиль Готье'],['Нерваль','nerval','Жерар де Нерваль'],['Доде','daudet','Альфонс Доде'],['Анатоль Франс','anatole','Анатоль Франс'],
  ['Ростан','rostand','Эдмон Ростан'],['Малларме','mallarme','Стефан Малларме'],['Пруст','proust','Марсель Пруст'],['Колетт','colette','Сидони-Габриэль Колетт'],
  ['Гастон Леру','leroux','Гастон Леру'],['Гектор Мало','hmalot','Гектор Мало'],['Графиня де Сегюр','segur','Софья Сегюр'],['Метерлинк','maeterlinck','Морис Метерлинк'],
  ['Мультатули','multatuli','Мультатули'],['Клейст','kleist','Генрих фон Клейст'],['Гёльдерлин','holderlin','Фридрих Гёльдерлин'],['Новалис','novalis','Новалис'],
  ['Гауф','hauff','Вильгельм Гауф'],['Шторм','storm','Теодор Шторм'],['Фонтане','fontane','Теодор Фонтане'],['Ницше','nietzsche','Фридрих Ницше'],
  ['Гауптман','hauptmann','Герхарт Гауптман'],['Томас Манн','tmann','Томас Манн'],['Цвейг','zweig','Стефан Цвейг'],['Дросте-Хюльсхофф','droste','Аннетте фон Дросте-Хюльсхофф'],
  ['Иоханна Спири','spyri','Иоханна Спири'],['Карл Май','may','Карл Май'],['Грильпарцер','grillparzer','Франц Грильпарцер'],['Шницлер','schnitzler','Артур Шницлер'],
  ['Музиль','rmusil','Роберт Музиль'],['Ян Неруда','neruda_j','Ян Неруда'],['Божена Немцова','nemcova','Божена Немцова'],['Маха','macha','Карел Гинек Маха'],
  ['Словацкий','slowacki','Юлиуш Словацкий'],['Реймонт','reymont','Владислав Реймонт'],['Петёфи','petofi','Шандор Петёфи'],['Йокаи','jokai','Мор Йокаи'],
  ['Эминеску','eminescu','Михай Эминеску'],['Крянгэ','creanga','Ион Крянгэ'],['Ботев','botev','Христо Ботев'],['Негош','njegos','Петар Петрович Негош'],
  ['Алексис Киви','kivi','Алексис Киви'],['Лённрот','lonnrot','Элиас Лённрот'],['Рунеберг','runeberg','Юхан Людвиг Рунеберг'],['Топелиус','topelius','Сакариас Топелиус'],
  ['Сигрид Унсет','undset','Сигрид Унсет'],['Кьеркегор','kierkegaard','Сёрен Кьеркегор'],['Енс Петер Якобсен','jacobsen','Енс Петер Якобсен'],['Фредрика Бремер','bremer','Фредрика Бремер'],
  ['Чосер','chaucer','Джеффри Чосер'],['Марло','marlowe','Кристофер Марло'],['Беньян','bunyan','Джон Беньян'],['Филдинг','fielding','Генри Филдинг'],
  ['Стерн','sterne','Лоренс Стерн'],['Ричардсон','richardson','Сэмюэл Ричардсон'],['Голдсмит','goldsmith','Оливер Голдсмит'],['Блейк','blake','Уильям Блейк'],
  ['Кольридж','coleridge','Сэмюэл Тейлор Кольридж'],['Перси Шелли','shelley','Перси Биши Шелли'],['Китс','keats','Джон Китс'],['Теннисон','tennyson','Альфред Теннисон'],
  ['Роберт Браунинг','browning','Роберт Браунинг'],['Уилки Коллинз','collins','Уилки Коллинз'],['Троллоп','trollope','Энтони Троллоп'],['Хаггард','haggard','Генри Райдер Хаггард'],
  ['Честертон','chesterton','Гилберт Кит Честертон'],['Джеймс Барри','barrie','Джеймс Мэтью Барри'],['Кеннет Грэм','kgrahame','Кеннет Грэм'],['Майн Рид','mayne','Томас Майн Рид'],
  ['Марриет','marryat','Фредерик Марриет'],['Брэм Стокер','stoker','Брэм Стокер'],['Джойс','joyce','Джеймс Джойс'],['Леди Грегори','lgregory','Августа Грегори'],
  ['Мария Эджуорт','edgeworth','Мария Эджуорт'],['Кэтрин Мэнсфилд','mansfield','Кэтрин Мэнсфилд'],['Беатрис Поттер','potter','Беатрис Поттер'],['Анна Сьюэлл','sewell','Анна Сьюэлл'],
  ['Уида','ouida','Уида'],['Эмерсон','emerson','Ральф Уолдо Эмерсон'],['Лонгфелло','longfellow','Генри Уодсворт Лонгфелло'],['Бирс','bierce','Амброз Бирс'],
  ['Брет Гарт','bharte','Брет Гарт'],['Генри Джеймс','hjames','Генри Джеймс'],['Стивен Крейн','crane','Стивен Крейн'],['Драйзер','dreiser','Теодор Драйзер'],
  ['Фрэнк Баум','lbaum','Лаймен Фрэнк Баум'],['Берроуз','burroughs','Эдгар Райс Берроуз'],['Сетон-Томпсон','seton','Эрнест Сетон-Томпсон'],['Кервуд','curwood','Джеймс Оливер Кервуд'],
  ['Фицджеральд','fitzgerald','Фрэнсис Скотт Фицджеральд'],['Кейт Шопен','chopin','Кейт Шопен'],['Уилла Кэсер','cather','Уилла Кэсер'],['Сара Орн Джуэтт','jewett','Сара Орн Джуэтт'],
  ['Шарлотта Гилман','gilman','Шарлотта Перкинс Гилман'],['Маргарет Фуллер','fuller','Маргарет Фуллер'],['Соджорнер Трут','truth','Соджорнер Трут'],['Гарриет Джейкобс','jacobs','Гарриет Джейкобс'],
  ['Пол Данбар','dunbar','Пол Лоренс Данбар'],['Букер Вашингтон','washington','Букер Вашингтон'],['Элинор Портер','porter','Элинор Портер'],['Джин Уэбстер','webster','Джин Уэбстер'],
  ['Кейт Уиггин','wiggin','Кейт Дуглас Уиггин'],['Сьюзан Кулидж','coolidge','Сьюзан Кулидж'],['Эмма Лазарус','lazarus','Эмма Лазарус'],['Оливия Шрейнер','schreiner','Олив Шрейнер'],
  ['Сол Плааки','plaatje','Сол Плааки'],['Блайден','blyden','Эдвард Блайден'],['Дюма-сын','dumasfils','Александр Дюма-сын'],
  /* 08.11 (Джессика: «ещё сотню писателей»): XVIII–XIX век, Кавказ и Прибалтика, Балканы и Скандинавия, Германия и Франция, Англия и США, Латинская Америка, Ближний Восток, Индия, Китай, Япония, Африка */
  ['Сумароков','sumarokov','Александр Петрович Сумароков'],['Кантемир','kantemir','Антиох Дмитриевич Кантемир'],['Тредиаковский','trediakovsky','Василий Кириллович Тредиаковский'],['Ипполит Богданович','bogdanovich_i','Ипполит Фёдорович Богданович'],
  ['Хемницер','khemnitser','Иван Иванович Хемницер'],['Капнист','kapnist','Василий Васильевич Капнист'],['Гнедич','gnedich','Николай Иванович Гнедич'],['Языков','yazykov','Николай Михайлович Языков'],
  ['Веневитинов','venevitinov','Дмитрий Владимирович Веневитинов'],['Александр Одоевский','odoevsky_a','Александр Иванович Одоевский'],['Фёдор Глинка','glinka_f','Фёдор Николаевич Глинка'],['Денис Давыдов','davydov','Денис Васильевич Давыдов'],
  ['Соллогуб','sollogub','Владимир Александрович Соллогуб'],['Панаев','panaev','Иван Иванович Панаев'],['Панаева','panaeva','Авдотья Яковлевна Панаева'],['Гребёнка','grebenka','Евгений Павлович Гребёнка'],
  ['Квитка-Основьяненко','kvitka','Григорий Фёдорович Квитка-Основьяненко'],['Даль','dal','Владимир Иванович Даль'],['Булгарин','bulgarin','Фаддей Венедиктович Булгарин'],['Сенковский','senkovsky','Осип Иванович Сенковский'],
  ['Вельтман','weltman','Александр Фомич Вельтман'],['Сухово-Кобылин','sukhovokobylin','Александр Васильевич Сухово-Кобылин'],['Аполлон Григорьев','grigoryev','Аполлон Александрович Григорьев'],['Мей','mei','Лев Александрович Мей'],
  ['Курочкин','kurochkin','Василий Степанович Курочкин'],['Жемчужников','zhemchuzhnikov','Алексей Михайлович Жемчужников'],['Случевский','sluchevsky','Константин Константинович Случевский'],['К. Р.','krr','Константин Константинович Романов'],
  ['Владимир Соловьёв','solovyov_v','Владимир Сергеевич Соловьёв'],['Розанов','rozanov','Василий Васильевич Розанов'],['Эртель','ertel','Александр Иванович Эртель'],['Немирович-Данченко','nemirovich','Василий Иванович Немирович-Данченко'],
  ['Гиляровский','gilyarovsky','Владимир Алексеевич Гиляровский'],['Телешов','teleshov','Николай Дмитриевич Телешов'],['Клычков','klychkov','Сергей Антонович Клычков'],['Демьян Бедный','bedny','Демьян Бедный'],
  ['Лу Саломе','salome','Лу Андреас-Саломе'],['Авдеева','avdeeva','Екатерина Алексеевна Авдеева'],['Ишимова','ishimova','Александра Осиповна Ишимова'],['Блаватская','blavatsky','Елена Петровна Блаватская'],
  ['Желиховская','zhelikhovskaya','Вера Петровна Желиховская'],['Грабовский','grabovsky','Павел Арсеньевич Грабовский'],['Стефаник','stefanyk','Василий Семёнович Стефаник'],['Нечуй-Левицкий','nechuy','Иван Семёнович Нечуй-Левицкий'],
  ['Ахундов','akhundov','Мирза Фатали Ахундов'],['Абовян','abovyan','Хачатур Абовян'],['Бараташвили','baratashvili','Николоз Бараташвили'],['Акакий Церетели','tsereteli','Акакий Церетели'],
  ['Райнис','rainis','Ян Райнис'],['Лидия Койдула','koidula','Лидия Койдула'],['Аспазия','aspazija','Аспазия'],['Прешерн','preseren','Франце Прешерн'],
  ['Эрбен','erben','Карел Яромир Эрбен'],['Гавличек-Боровский','havlicek','Карел Гавличек-Боровский'],['Красицкий','krasicki','Игнацы Красицкий'],['Фредро','fredro','Александр Фредро'],
  ['Норвид','norwid','Циприан Норвид'],['Запольская','zapolska','Габриеля Запольская'],['Жеромский','zeromski','Стефан Жеромский'],['Мадач','madach','Имре Мадач'],
  ['Эндре Ади','ady','Эндре Ади'],['Александри','alecsandri','Василе Александри'],['Соломос','solomos','Дионисиос Соломос'],['Кавафис','kavafis','Константинос Кавафис'],
  ['Вергеланн','wergeland','Хенрик Вергеланн'],['Юнас Ли','lie','Юнас Ли'],['Хьелланн','kielland','Александр Хьелланн'],['Тегнер','tegner','Эсайас Тегнер'],
  ['Бельман','bellman','Карл Микаэль Бельман'],['Минна Кант','canth','Минна Кант'],['Клопшток','klopstock','Фридрих Готлиб Клопшток'],['Виланд','wieland','Кристоф Мартин Виланд'],
  ['Гердер','herder','Иоганн Готфрид Гердер'],['Жан Поль','jeanpaul','Жан Поль'],['Эйхендорф','eichendorff','Йозеф фон Эйхендорф'],['Мёрике','morike','Эдуард Мёрике'],
  ['Бюхнер','buchner','Георг Бюхнер'],['Готфрид Келлер','keller','Готфрид Келлер'],['Раабе','raabe','Вильгельм Раабе'],['Ведекинд','wedekind','Франк Ведекинд'],
  ['Моргенштерн','morgenstern','Кристиан Моргенштерн'],['Тракль','trakl','Георг Тракль'],['Гофмансталь','hofmannsthal','Гуго фон Гофмансталь'],['Йозеф Рот','roth','Йозеф Рот'],
  ['Рикарда Хух','huch','Рикарда Хух'],['Марлитт','marlitt','Евгения Марлитт'],['Карлфельдт','karlfeldt','Эрик Аксель Карлфельдт'],['Сюлли-Прюдом','sully','Сюлли-Прюдом'],
  ['Эредиа','heredia','Жозе Мария де Эредиа'],['Лотреамон','lautreamont','Лотреамон'],['Гюисманс','huysmans','Жорис-Карл Гюисманс'],['Пьер Лоти','loti','Пьер Лоти'],
  ['Бурже','bourget','Поль Бурже'],['Жюль Ренар','renard','Жюль Ренар'],['Ромен Роллан','rolland','Ромен Роллан'],['Анна де Ноай','noailles','Анна де Ноай'],
  ['Прево','prevost','Антуан Франсуа Прево'],['Мариво','marivaux','Пьер Мариво'],['Скаррон','scarron','Поль Скаррон'],['Паскаль','pascal','Блез Паскаль'],
  ['Ларошфуко','rochefoucauld','Франсуа де Ларошфуко'],['Лабрюйер','labruyere','Жан де Лабрюйер'],['Беранже','beranger','Пьер Жан Беранже'],['Эжен Сю','sue','Эжен Сю'],
  ['Феваль','feval','Поль Феваль'],['Гюстав Эмар','aimard','Гюстав Эмар'],['Буссенар','boussenard','Луи Буссенар'],['Жаколио','jacolliot','Луи Жаколио'],
  ['Сабатини','sabatini','Рафаэль Сабатини'],['Де Квинси','quincey','Томас де Квинси'],['Чарльз Лэм','lamb','Чарльз Лэм'],['Хэзлитт','hazlitt','Уильям Хэзлитт'],
  ['Саути','southey','Роберт Саути'],['Томас Мур','moore','Томас Мур'],['Томас Гуд','hood','Томас Гуд'],['Маколей','macaulay','Томас Бабингтон Маколей'],
  ['Рёскин','ruskin','Джон Рёскин'],['Мэтью Арнольд','arnold','Мэтью Арнольд'],['Суинберн','swinburne','Алджернон Чарлз Суинберн'],['Данте Габриэль Россетти','dgrossetti','Данте Габриэль Россетти'],
  ['Уильям Моррис','morris','Уильям Моррис'],['Джордж Мередит','meredith','Джордж Мередит'],['Гиссинг','gissing','Джордж Гиссинг'],['Джордж Макдональд','macdonald','Джордж Макдональд'],
  ['Эдвард Лир','lear','Эдвард Лир'],['Уэйман','weyman','Стэнли Уэйман'],['Баллантайн','ballantyne','Роберт Майкл Баллантайн'],['Квиллер-Куч','quiller','Артур Квиллер-Куч'],
  ['Саки','saki','Саки'],['Лоуренс','lawrence','Дэвид Герберт Лоуренс'],['Арнольд Беннетт','bennett','Арнольд Беннетт'],['Шарлотта Янг','yonge','Шарлотта Мэри Янг'],
  ['Маргарет Олифант','oliphant','Маргарет Олифант'],['Мэри Брэддон','braddon','Мэри Элизабет Брэддон'],['Эллен Вуд','wood','Эллен Вуд'],['Мэри Уорд','ward','Мэри Огаста Уорд'],
  ['Мария Корелли','corelli','Мария Корелли'],['Флоренс Найтингейл','nightingale','Флоренс Найтингейл'],['Гарриет Мартино','martineau','Гарриет Мартино'],['Фелиция Хеманс','hemans','Фелиция Хеманс'],
  ['Летиция Лэндон','landon','Летиция Лэндон'],['Элис Мейнелл','meynell','Элис Мейнелл'],['Эдна Миллей','millay','Эдна Сент-Винсент Миллей'],['Эми Лоуэлл','lowell','Эми Лоуэлл'],
  ['Элла Уилкокс','wilcox','Элла Уилер Уилкокс'],['Гертруда Стайн','stein','Гертруда Стайн'],['Эллен Глазго','glasgow','Эллен Глазго'],['Мэри Уилкинс-Фримен','freeman','Мэри Уилкинс-Фримен'],
  ['Кэтрин Седжвик','sedgwick','Кэтрин Седжвик'],['Лидия Чайлд','child','Лидия Мария Чайлд'],['Сара Хейл','hale','Сара Джозефа Хейл'],['Хоуэллс','howells','Уильям Дин Хоуэллс'],
  ['Фрэнк Норрис','norris','Фрэнк Норрис'],['Джеймс Лоуэлл','lowellj','Джеймс Расселл Лоуэлл'],['Уиттьер','whittier','Джон Гринлиф Уиттьер'],['Оливер Холмс','holmes','Оливер Уэнделл Холмс'],
  ['Ланир','lanier','Сидни Ланир'],['Райли','riley','Джеймс Уиткомб Райли'],['Юджин Филд','field','Юджин Филд'],['Харрис','harris','Джоэл Чандлер Харрис'],
  ['Кейбл','cable','Джордж Вашингтон Кейбл'],['Эдвин Робинсон','robinson','Эдвин Арлингтон Робинсон'],['Шервуд Андерсон','anderson','Шервуд Андерсон'],['Ринг Ларднер','lardner','Ринг Ларднер'],
  ['Лавкрафт','lovecraft','Говард Филлипс Лавкрафт'],['Роберт Чамберс','chambers','Роберт Уильям Чамберс'],['Зейн Грей','grey','Зейн Грей'],['Оуэн Уистер','wister','Оуэн Уистер'],
  ['Таркингтон','tarkington','Бут Таркингтон'],['Чарльз Чеснатт','chesnutt','Чарльз Чеснатт'],['Элис Данбар-Нельсон','dunbarnelson','Элис Данбар-Нельсон'],['Клод Маккей','mckay','Клод Маккей'],
  ['Эчеверрия','echeverria','Эстебан Эчеверрия'],['Хосе Мармоль','marmol','Хосе Мармоль'],['Хосе Мария Эредиа','heredia_c','Хосе Мария Эредиа-и-Эредиа'],['Хосе Асунсьон Сильва','silva','Хосе Асунсьон Сильва'],
  ['Лугонес','lugones','Леопольдо Лугонес'],['Родо','rodo','Хосе Энрике Родо'],['Жозе ди Аленкар','alencar','Жозе ди Аленкар'],['Кастро Алвес','castroa','Антониу ди Кастру Алвис'],
  ['Инка Гарсиласо','garcilaso','Инка Гарсиласо де ла Вега'],['Андрес Бельо','bello','Андрес Бельо'],['Лисарди','lizardi','Хосе Хоакин Фернандес де Лисарди'],['Рейхани','rihani','Амин Рейхани'],
  ['Намык Кемаль','kemal','Намык Кемаль'],['Саратчандра','sarat','Саратчандра Чаттопадхьяй'],['Вивекананда','vivekananda','Свами Вивекананда'],['Бхарати','bharati','Субраманья Бхарати'],
  ['Бегум Рокея','rokeya','Бегум Рокея'],['Бо Цзюйи','baijuyi','Бо Цзюйи'],['Миядзава Кэндзи','kenji','Кэндзи Миядзава'],['Исикава Такубоку','takuboku','Исикава Такубоку'],
  ['Куникида Доппо','kunikida','Куникида Доппо'],['Кода Рохан','koda','Кода Рохан'],['Хосе Рисаль','rizal','Хосе Рисаль'],['Кейсли-Хейфорд','casely','Джозеф Кейсли-Хейфорд']];
/* 05.11: the authors' names in Latin letters, for their books in Gutenberg, Standard Ebooks and Internet Archive */
const ADV_FACE_LAT={pushkin:'Alexander Pushkin',gogol:'Nikolai Gogol',tolstoy:'Leo Tolstoy',chekhov:'Anton Chekhov',homer:'Homer',shakespeare:'William Shakespeare',dante:'Dante Alighieri',cervantes:'Miguel de Cervantes',dickens:'Charles Dickens',goethe:'Johann Wolfgang von Goethe',verne:'Jules Verne',andersen:'Hans Christian Andersen',lermontov:'Mikhail Lermontov',turgenev:'Ivan Turgenev',dostoevsky:'Fyodor Dostoevsky',ostrovsky:'Alexander Ostrovsky',griboyedov:'Alexander Griboyedov',krylov:'Ivan Krylov',karamzin:'Nikolay Karamzin',gorky:'Maxim Gorky',kuprin:'Aleksandr Kuprin',blok:'Alexander Blok',yesenin:'Sergei Yesenin',mayakovsky:'Vladimir Mayakovsky',tsvetaeva:'Marina Tsvetaeva',zhukovsky:'Vasily Zhukovsky',nekrasov:'Nikolay Nekrasov',tyutchev:'Fyodor Tyutchev',fet:'Afanasy Fet',saltykov:'Mikhail Saltykov-Shchedrin',leskov:'Nikolai Leskov',derzhavin:'Gavrila Derzhavin',lomonosov:'Mikhail Lomonosov',belyaev:'Alexander Belyaev',plato:'Plato',schiller:'Friedrich Schiller',byron:'Lord Byron',austen:'Jane Austen',bronte:'Charlotte Bronte',dumas:'Alexandre Dumas',hugo:'Victor Hugo',balzac:'Honore de Balzac',flaubert:'Gustave Flaubert',maupassant:'Guy de Maupassant',stendhal:'Stendhal',voltaire:'Voltaire',twain:'Mark Twain',poe:'Edgar Allan Poe',london:'Jack London',cooper:'James Fenimore Cooper',doyle:'Arthur Conan Doyle',stevenson:'Robert Louis Stevenson',kipling:'Rudyard Kipling',wilde:'Oscar Wilde',swift:'Jonathan Swift',defoe:'Daniel Defoe',scott:'Walter Scott',wells:'H. G. Wells',carroll:'Lewis Carroll',grimm:'Brothers Grimm',moliere:'Moliere',petrarch:'Petrarch',heine:'Heinrich Heine',burns:'Robert Burns',ebronte:'Emily Bronte',abronte:'Anne Bronte',eliot:'George Eliot',mshelley:'Mary Shelley',alcott:'Louisa May Alcott',stowe:'Harriet Beecher Stowe',dickinson:'Emily Dickinson',woolf:'Virginia Woolf',gaskell:'Elizabeth Gaskell',sand:'George Sand',lagerlof:'Selma Lagerlof',nesbit:'E. Nesbit',burnett:'Frances Hodgson Burnett',montgomery:'Lucy Maud Montgomery',ebrowning:'Elizabeth Barrett Browning',rossetti:'Christina Rossetti',wharton:'Edith Wharton',stael:'Germaine de Stael',rostopchina:'Yevdokiya Rostopchina',pavlova:'Karolina Pavlova',durova:'Nadezhda Durova',gippius:'Zinaida Gippius',lokhvitskaya:'Mirra Lokhvitskaya',kovalevskaya:'Sofya Kovalevskaya',dashkova:'Yekaterina Dashkova',wollstonecraft:'Mary Wollstonecraft',orzeszkowa:'Eliza Orzeszkowa',ebnereschenbach:'Marie von Ebner-Eschenbach',sevigne:'Madame de Sevigne',lafayette:'Madame de La Fayette',soseki:'Natsume Soseki',akutagawa:'Ryunosuke Akutagawa',ichiyo:'Higuchi Ichiyo',luxun:'Lu Xun',hafez:'Hafez',rumi:'Rumi',dario:'Ruben Dario',machado:'Machado de Assis',sorjuana:'Juana Ines de la Cruz',douglass:'Frederick Douglass',equiano:'Olaudah Equiano',chernyshevsky:'Nikolay Chernyshevsky',herzen:'Alexander Herzen',korolenko:'Vladimir Korolenko',andreyev:'Leonid Andreyev',grin:'Alexander Grin',khlebnikov:'Velimir Khlebnikov',mandelstam:'Osip Mandelstam',gumilev:'Nikolay Gumilyov',voloshin:'Maximilian Voloshin',bryusov:'Valery Bryusov',balmont:'Konstantin Balmont',bely:'Andrei Bely',sologub:'Fyodor Sologub',garshin:'Vsevolod Garshin',mamin:'Dmitry Mamin-Sibiryak',batyushkov:'Konstantin Batyushkov',baratynsky:'Yevgeny Baratynsky',koltsov:'Aleksey Koltsov',shevchenko:'Taras Shevchenko',ukrainka:'Lesya Ukrainka',mickiewicz:'Adam Mickiewicz',sienkiewicz:'Henryk Sienkiewicz',konopnicka:'Maria Konopnicka',hasek:'Jaroslav Hasek',capek:'Karel Capek',collodi:'Carlo Collodi',lopedevega:'Lope de Vega',becquer:'Gustavo Adolfo Becquer',camoes:'Luis de Camoes',hoffmann:'E. T. A. Hoffmann',kafka:'Franz Kafka',rilke:'Rainer Maria Rilke',lessing:'Gotthold Ephraim Lessing',suttner:'Bertha von Suttner',ibsen:'Henrik Ibsen',strindberg:'August Strindberg',bjornson:'Bjørnstjerne Bjørnson',hawthorne:'Nathaniel Hawthorne',melville:'Herman Melville',thoreau:'Henry David Thoreau',ohenry:'O. Henry',irving:'Washington Irving',hardy:'Thomas Hardy',conrad:'Joseph Conrad',thackeray:'William Makepeace Thackeray',milton:'John Milton',rabelais:'Francois Rabelais',montaigne:'Michel de Montaigne',rousseau:'Jean-Jacques Rousseau',verlaine:'Paul Verlaine',rimbaud:'Arthur Rimbaud',baudelaire:'Charles Baudelaire',zola:'Emile Zola',yeats:'W. B. Yeats',toru:'Toru Dutt',naidu:'Sarojini Naidu',ramabai:'Pandita Ramabai',fonvizin:'Denis Fonvizin',radishchev:'Alexander Radishchev',odoevsky:'Vladimir Odoyevsky',aksakov:'Sergey Aksakov',pogorelsky:'Antony Pogorelsky',delvig:'Anton Delvig',vyazemsky:'Pyotr Vyazemsky',polezhaev:'Alexander Polezhayev',benediktov:'Vladimir Benediktov',pleshcheyev:'Aleksey Pleshcheyev',maykov:'Apollon Maykov',polonsky:'Yakov Polonsky',aktolstoy:'Aleksey Konstantinovich Tolstoy',nikitin:'Ivan Nikitin',surikov:'Ivan Surikov',apukhtin:'Aleksey Apukhtin',nadson:'Semyon Nadson',pisemsky:'Aleksey Pisemsky',uspensky:'Gleb Uspensky',stanyukovich:'Konstantin Stanyukovich',danilevsky:'Grigory Danilevsky',lazhechnikov:'Ivan Lazhechnikov',kuchelbecker:'Wilhelm Kuchelbecker',ogarev:'Nikolay Ogarev',belinsky:'Vissarion Belinsky',dobrolyubov:'Nikolay Dobrolyubov',pisarev:'Dmitry Pisarev',annensky:'Innokenty Annensky',kuzmin:'Mikhail Kuzmin',severyanin:'Igor Severyanin',chorny:'Sasha Chorny',averchenko:'Arkady Averchenko',zamyatin:'Yevgeny Zamyatin',bulgakov:'Mikhail Bulgakov',platonov:'Andrei Platonov',babel:'Isaac Babel',ilf:'Ilya Ilf',bogdanov:'Alexander Bogdanov',tsiolkovsky:'Konstantin Tsiolkovsky',atolstoy:'Aleksey Nikolayevich Tolstoy',ostrovskyn:'Nikolai Ostrovsky',serafimovich:'Alexander Serafimovich',veresaev:'Vikenty Veresaev',shmelyov:'Ivan Shmelyov',artsybashev:'Mikhail Artsybashev',zinovieva:'Lydia Zinovieva-Annibal',khvoshchinskaya:'Nadezhda Khvoshchinskaya',shchepkina:'Tatiana Shchepkina-Kupernik',franko:'Ivan Franko',kotlyarevsky:'Ivan Kotliarevsky',vovchok:'Marko Vovchok',kobylyanska:'Olha Kobylianska',abay:'Abai Qunanbaiuly',chavchavadze:'Ilia Chavchavadze',basho:'Matsuo Basho',ogai:'Mori Ogai',dufu:'Du Fu',confucius:'Confucius',qiujin:'Qiu Jin',premchand:'Premchand',bankim:'Bankim Chandra Chatterjee',iqbal:'Muhammad Iqbal',gibran:'Kahlil Gibran',marti:'Jose Marti',quiroga:'Horacio Quiroga',sarmiento:'Domingo Faustino Sarmiento',palma:'Ricardo Palma',avellaneda:'Gertrudis Gomez de Avellaneda',castro:'Rosalia de Castro',pardobazan:'Emilia Pardo Bazan',galdos:'Benito Perez Galdos',unamuno:'Miguel de Unamuno',blasco:'Vicente Blasco Ibanez',quevedo:'Francisco de Quevedo',gongora:'Luis de Gongora',teresa:'Teresa of Avila',pessoa:'Fernando Pessoa',queiros:'Jose Maria de Eca de Queiros',manzoni:'Alessandro Manzoni',verga:'Giovanni Verga',pirandello:'Luigi Pirandello',dannunzio:'Gabriele D\'Annunzio',salgari:'Emilio Salgari',tasso:'Torquato Tasso',machiavelli:'Niccolo Machiavelli',corneille:'Pierre Corneille',lafontaine:'Jean de La Fontaine',perrault:'Charles Perrault',diderot:'Denis Diderot',montesquieu:'Montesquieu',beaumarchais:'Pierre Beaumarchais',chateaubriand:'Francois-Rene de Chateaubriand',merimee:'Prosper Merimee',musset:'Alfred de Musset',lamartine:'Alphonse de Lamartine',vigny:'Alfred de Vigny',gautier:'Theophile Gautier',nerval:'Gerard de Nerval',daudet:'Alphonse Daudet',anatole:'Anatole France',rostand:'Edmond Rostand',mallarme:'Stephane Mallarme',proust:'Marcel Proust',colette:'Colette',leroux:'Gaston Leroux',hmalot:'Hector Malot',segur:'Comtesse de Segur',maeterlinck:'Maurice Maeterlinck',multatuli:'Multatuli',kleist:'Heinrich von Kleist',holderlin:'Friedrich Holderlin',novalis:'Novalis',hauff:'Wilhelm Hauff',storm:'Theodor Storm',fontane:'Theodor Fontane',nietzsche:'Friedrich Nietzsche',hauptmann:'Gerhart Hauptmann',tmann:'Thomas Mann',zweig:'Stefan Zweig',droste:'Annette von Droste-Hulshoff',spyri:'Johanna Spyri',may:'Karl May',grillparzer:'Franz Grillparzer',schnitzler:'Arthur Schnitzler',rmusil:'Robert Musil',neruda_j:'Jan Neruda',nemcova:'Bozena Nemcova',macha:'Karel Hynek Macha',slowacki:'Juliusz Słowacki',reymont:'Władysław Reymont',petofi:'Sandor Petofi',jokai:'Mor Jokai',eminescu:'Mihai Eminescu',creanga:'Ion Creanga',botev:'Hristo Botev',njegos:'Petar II Petrovic-Njegos',kivi:'Aleksis Kivi',lonnrot:'Elias Lonnrot',runeberg:'Johan Ludvig Runeberg',topelius:'Zachris Topelius',undset:'Sigrid Undset',kierkegaard:'Søren Kierkegaard',jacobsen:'Jens Peter Jacobsen',bremer:'Fredrika Bremer',chaucer:'Geoffrey Chaucer',marlowe:'Christopher Marlowe',bunyan:'John Bunyan',fielding:'Henry Fielding',sterne:'Laurence Sterne',richardson:'Samuel Richardson',goldsmith:'Oliver Goldsmith',blake:'William Blake',coleridge:'Samuel Taylor Coleridge',shelley:'Percy Bysshe Shelley',keats:'John Keats',tennyson:'Alfred Tennyson',browning:'Robert Browning',collins:'Wilkie Collins',trollope:'Anthony Trollope',haggard:'H. Rider Haggard',chesterton:'G. K. Chesterton',barrie:'J. M. Barrie',kgrahame:'Kenneth Grahame',mayne:'Mayne Reid',marryat:'Frederick Marryat',stoker:'Bram Stoker',joyce:'James Joyce',lgregory:'Lady Gregory',edgeworth:'Maria Edgeworth',mansfield:'Katherine Mansfield',potter:'Beatrix Potter',sewell:'Anna Sewell',ouida:'Ouida',emerson:'Ralph Waldo Emerson',longfellow:'Henry Wadsworth Longfellow',bierce:'Ambrose Bierce',bharte:'Bret Harte',hjames:'Henry James',crane:'Stephen Crane',dreiser:'Theodore Dreiser',lbaum:'L. Frank Baum',burroughs:'Edgar Rice Burroughs',seton:'Ernest Thompson Seton',curwood:'James Oliver Curwood',fitzgerald:'F. Scott Fitzgerald',chopin:'Kate Chopin',cather:'Willa Cather',jewett:'Sarah Orne Jewett',gilman:'Charlotte Perkins Gilman',fuller:'Margaret Fuller',truth:'Sojourner Truth',jacobs:'Harriet Jacobs',dunbar:'Paul Laurence Dunbar',washington:'Booker T. Washington',porter:'Eleanor H. Porter',webster:'Jean Webster',wiggin:'Kate Douglas Wiggin',coolidge:'Susan Coolidge',lazarus:'Emma Lazarus',schreiner:'Olive Schreiner',plaatje:'Sol Plaatje',blyden:'Edward Wilmot Blyden',dumasfils:'Alexandre Dumas fils',sumarokov:'Alexander Sumarokov',kantemir:'Antiochus Kantemir',trediakovsky:'Vasily Trediakovsky',bogdanovich_i:'Ippolit Bogdanovich',khemnitser:'Ivan Khemnitser',kapnist:'Vasily Kapnist',gnedich:'Nikolay Gnedich',yazykov:'Nikolai Yazykov',venevitinov:'Dmitry Venevitinov',odoevsky_a:'Alexander Odoyevsky',glinka_f:'Fyodor Glinka',davydov:'Denis Davydov',sollogub:'Vladimir Sollogub',panaev:'Ivan Panaev',panaeva:'Avdotya Panaeva',grebenka:'Yevhen Hrebinka',kvitka:'Hryhorii Kvitka-Osnovianenko',dal:'Vladimir Dal',bulgarin:'Faddey Bulgarin',senkovsky:'Osip Senkovsky',weltman:'Alexander Veltman',sukhovokobylin:'Alexander Sukhovo-Kobylin',grigoryev:'Apollon Grigoryev',mei:'Lev Mei',kurochkin:'Vasily Kurochkin',zhemchuzhnikov:'Aleksey Zhemchuzhnikov',sluchevsky:'Konstantin Sluchevsky',krr:'Konstantin Romanov',solovyov_v:'Vladimir Solovyov',rozanov:'Vasily Rozanov',ertel:'Alexander Ertel',nemirovich:'Vasily Nemirovich-Danchenko',gilyarovsky:'Vladimir Gilyarovsky',teleshov:'Nikolay Teleshov',klychkov:'Sergey Klychkov',bedny:'Demyan Bedny',salome:'Lou Andreas-Salome',avdeeva:'Ekaterina Avdeeva',ishimova:'Aleksandra Ishimova',blavatsky:'Helena Blavatsky',zhelikhovskaya:'Vera Zhelikhovskaya',grabovsky:'Pavlo Hrabovsky',stefanyk:'Vasyl Stefanyk',nechuy:'Ivan Nechuy-Levytsky',akhundov:'Mirza Fatali Akhundov',abovyan:'Khachatur Abovian',baratashvili:'Nikoloz Baratashvili',tsereteli:'Akaki Tsereteli',rainis:'Rainis',koidula:'Lydia Koidula',aspazija:'Aspazija',preseren:'France Preseren',erben:'Karel Jaromir Erben',havlicek:'Karel Havlicek Borovsky',krasicki:'Ignacy Krasicki',fredro:'Aleksander Fredro',norwid:'Cyprian Norwid',zapolska:'Gabriela Zapolska',zeromski:'Stefan Zeromski',madach:'Imre Madach',ady:'Endre Ady',alecsandri:'Vasile Alecsandri',solomos:'Dionysios Solomos',kavafis:'Constantine P. Cavafy',wergeland:'Henrik Wergeland',lie:'Jonas Lie',kielland:'Alexander Kielland',tegner:'Esaias Tegner',bellman:'Carl Michael Bellman',canth:'Minna Canth',klopstock:'Friedrich Gottlieb Klopstock',wieland:'Christoph Martin Wieland',herder:'Johann Gottfried Herder',jeanpaul:'Jean Paul',eichendorff:'Joseph von Eichendorff',morike:'Eduard Morike',buchner:'Georg Buchner',keller:'Gottfried Keller',raabe:'Wilhelm Raabe',wedekind:'Frank Wedekind',morgenstern:'Christian Morgenstern',trakl:'Georg Trakl',hofmannsthal:'Hugo von Hofmannsthal',roth:'Joseph Roth',huch:'Ricarda Huch',marlitt:'Eugenie Marlitt',karlfeldt:'Erik Axel Karlfeldt',sully:'Sully Prudhomme',heredia:'Jose-Maria de Heredia',lautreamont:'Comte de Lautreamont',huysmans:'Joris-Karl Huysmans',loti:'Pierre Loti',bourget:'Paul Bourget',renard:'Jules Renard',rolland:'Romain Rolland',noailles:'Anna de Noailles',prevost:'Antoine Francois Prevost',marivaux:'Pierre de Marivaux',scarron:'Paul Scarron',pascal:'Blaise Pascal',rochefoucauld:'La Rochefoucauld',labruyere:'Jean de La Bruyere',beranger:'Pierre-Jean de Beranger',sue:'Eugene Sue',feval:'Paul Feval',aimard:'Gustave Aimard',boussenard:'Louis Boussenard',jacolliot:'Louis Jacolliot',sabatini:'Rafael Sabatini',quincey:'Thomas De Quincey',lamb:'Charles Lamb',hazlitt:'William Hazlitt',southey:'Robert Southey',moore:'Thomas Moore',hood:'Thomas Hood',macaulay:'Thomas Babington Macaulay',ruskin:'John Ruskin',arnold:'Matthew Arnold',swinburne:'Algernon Charles Swinburne',dgrossetti:'Dante Gabriel Rossetti',morris:'William Morris',meredith:'George Meredith',gissing:'George Gissing',macdonald:'George MacDonald',lear:'Edward Lear',weyman:'Stanley J. Weyman',ballantyne:'R. M. Ballantyne',quiller:'Arthur Quiller-Couch',saki:'Saki',lawrence:'D. H. Lawrence',bennett:'Arnold Bennett',yonge:'Charlotte Mary Yonge',oliphant:'Margaret Oliphant',braddon:'Mary Elizabeth Braddon',wood:'Ellen Wood',ward:'Mary Augusta Ward',corelli:'Marie Corelli',nightingale:'Florence Nightingale',martineau:'Harriet Martineau',hemans:'Felicia Hemans',landon:'Letitia Elizabeth Landon',meynell:'Alice Meynell',millay:'Edna St. Vincent Millay',lowell:'Amy Lowell',wilcox:'Ella Wheeler Wilcox',stein:'Gertrude Stein',glasgow:'Ellen Glasgow',freeman:'Mary E. Wilkins Freeman',sedgwick:'Catharine Sedgwick',child:'Lydia Maria Child',hale:'Sarah Josepha Hale',howells:'William Dean Howells',norris:'Frank Norris',lowellj:'James Russell Lowell',whittier:'John Greenleaf Whittier',holmes:'Oliver Wendell Holmes',lanier:'Sidney Lanier',riley:'James Whitcomb Riley',field:'Eugene Field',harris:'Joel Chandler Harris',cable:'George Washington Cable',robinson:'Edwin Arlington Robinson',anderson:'Sherwood Anderson',lardner:'Ring Lardner',lovecraft:'H. P. Lovecraft',chambers:'Robert W. Chambers',grey:'Zane Grey',wister:'Owen Wister',tarkington:'Booth Tarkington',chesnutt:'Charles W. Chesnutt',dunbarnelson:'Alice Dunbar Nelson',mckay:'Claude McKay',echeverria:'Esteban Echeverria',marmol:'Jose Marmol',heredia_c:'Jose Maria Heredia y Heredia',silva:'Jose Asuncion Silva',lugones:'Leopoldo Lugones',rodo:'Jose Enrique Rodo',alencar:'Jose de Alencar',castroa:'Castro Alves',garcilaso:'Inca Garcilaso de la Vega',bello:'Andres Bello',lizardi:'Jose Joaquin Fernandez de Lizardi',rihani:'Ameen Rihani',kemal:'Namık Kemal',sarat:'Sarat Chandra Chattopadhyay',vivekananda:'Swami Vivekananda',bharati:'Subramania Bharati',rokeya:'Begum Rokeya',baijuyi:'Bai Juyi',kenji:'Kenji Miyazawa',takuboku:'Takuboku Ishikawa',kunikida:'Kunikida Doppo',koda:'Koda Rohan',rizal:'Jose Rizal',casely:'J. E. Casely Hayford'};
/* 29.10 (Джессика: «каждый раз перемешаны»): a new order on every opening of «Приключения» (openAdv), kept while the screen re-renders */
let advFaceOrder=null;
function advFacesShuffle(){
  const all=Object.keys(ADV_FACES).map(function(n){return [n,ADV_FACES[n],n];}).concat(ADV_FACES_MORE);
  for(let i=all.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)),t=all[i];all[i]=all[j];all[j]=t;}
  advFaceOrder=all;}
function advFaces(){if(!advFaceOrder)advFacesShuffle();return advFaceOrder;}
function advFace(x){
  return '<button type="button" class="advface" data-q="'+esc(x[2])+'" data-lat="'+esc(ADV_FACE_LAT[x[1]]||'')+'"><span class="advph"><b>'+esc(x[0].charAt(0))+'</b><img src="hero/authors/'+x[1]+'.webp" alt="" loading="lazy" onerror="this.remove()"></span><span class="advfn">'+esc(x[0])+'</span></button>';}
const ADV_WS_HINTS=['Пушкин','Гоголь','Толстой','Чехов','Гомер','Шекспир','Данте','Сервантес','Диккенс','Гёте','Жюль Верн','Андерсен'];
/* Джессика 18.10: ready collections on the first screen, one tap to a book. Wikisource titles checked live (GitHub Actions, 18.10) */
const ADV_SETS=[
  {id:'school',t:'Школьная программа',ic:'notebook',pages:["Евгений Онегин (Пушкин)","Капитанская дочка (Пушкин)","Герой нашего времени (Лермонтов)","Горе от ума (Грибоедов)","Ревизор (Гоголь)","Мёртвые души (Гоголь)","Тарас Бульба (Гоголь)","Недоросль (Фонвизин)","Бедная Лиза (Карамзин)","Гроза (Островский)","Отцы и дети (Тургенев)","Обломов (Гончаров)","Преступление и наказание (Достоевский)","Война и мир (Толстой)","Анна Каренина (Толстой)","Вишнёвый сад (Чехов)","Руслан и Людмила (Пушкин)","Медный всадник (Пушкин)","Дубровский (Пушкин)","Борис Годунов (Пушкин)","Моцарт и Сальери (Пушкин)","Полтава (Пушкин)","Цыганы (поэма — Пушкин)","Кавказский пленник (Пушкин)","Мцыри (Лермонтов)","Демон (Лермонтов)","Маскарад (Лермонтов)","Бородино (Лермонтов)","Песня про царя Ивана Васильевича, молодого опричника и удалого купца Калашникова (Лермонтов)","Смерть поэта (Лермонтов)","Парус (Лермонтов)","Вечера на хуторе близ Диканьки (Гоголь)","Ночь перед Рождеством (Гоголь)","Вий (Гоголь)","Женитьба (Гоголь)","Невский проспект (Гоголь)","Записки охотника (Тургенев)","Дворянское гнездо (Тургенев)","Накануне (Тургенев)","Рудин (Тургенев)","Бедные люди (Достоевский)","Идиот (Достоевский)","Униженные и оскорблённые (Достоевский)","Детство (Толстой)","Отрочество (Толстой)","Юность (Толстой)","Севастопольские рассказы (Толстой)","Хаджи-Мурат (Толстой)","Смерть Ивана Ильича (Толстой)","Крейцерова соната (Толстой)","Воскресение (Толстой)","Казаки (Толстой)","Чайка (Чехов)","Три сестры (Чехов)","Дядя Ваня (Чехов)","Ионыч (Чехов)","Палата № 6 (Чехов)","Крыжовник (Чехов)","О любви (Чехов)","Степь (Чехов)","Бесприданница (Островский)","Лес (Островский)","Свои люди — сочтёмся (Островский)","Снегурочка (Островский)","Кому на Руси жить хорошо (Некрасов)","Мороз, Красный нос (Некрасов)","Русские женщины (Некрасов)","Железная дорога (Некрасов)","История одного города (Салтыков-Щедрин)","Господа Головлёвы (Салтыков-Щедрин)","Повесть о том, как один мужик двух генералов прокормил (Салтыков-Щедрин)","Премудрый пискарь (Салтыков-Щедрин)","Очарованный странник (Лесков)","Леди Макбет Мценского уезда (Лесков)","Обыкновенная история (Гончаров)","Фрегат «Паллада» (Гончаров)","Что делать? (Чернышевский)","Кто виноват? (Герцен)","Былое и думы (Герцен)","Путешествие из Петербурга в Москву (Радищев)","Слово о полку Игореве","Старуха Изергиль (Горький)","Челкаш (Горький)","На дне (Горький)","Мать (Горький)","Песня о буревестнике (Горький)","Гранатовый браслет (Куприн)","Олеся (Куприн)","Поединок (Куприн)","Белый пудель (Куприн)","Чудесный доктор (Куприн)","Детство Тёмы (Гарин-Михайловский)","Слепой музыкант (Короленко)","В дурном обществе (Короленко)","Красный цветок (Гаршин)","Светлана (Жуковский)","Людмила (Жуковский)","Медведь на воеводстве (Салтыков-Щедрин)","Тёмные аллеи (Бунин)","Господин из Сан-Франциско (Бунин)","Белая гвардия (Булгаков)","Левша (Лесков)","Братья Карамазовы (Достоевский)","Арап Петра Великого (Пушкин)","Ашик-Кериб (Лермонтов)","Рим (Гоголь)","Месяц в деревне (Тургенев)","Село Степанчиково и его обитатели (Достоевский)","Фальшивый купон (Толстой)","Дуэль (Чехов)","Дмитрий Самозванец и Василий Шуйский (Островский)","Жизнь и похождения Тихона Тростникова (Некрасов)","Тихое пристанище (Салтыков-Щедрин)","Обойденные (Лесков)","Лихая болесть (Гончаров)","Жизнь Матвея Кожемякина (Горький)","Деревня (Бунин)","Дети подземелья (Короленко)","Корион (Фонвизин)","Марфа-посадница, или покорение Новагорода (Карамзин)","Ещё шумел весёлый день (Тютчев)","Дядюшка и двоюродный братец (Фет)","Бова (Радищев)","Студент (Грибоедов)","История села Горюхина (Пушкин)","Панорама Москвы (Лермонтов)","Страшная месть (Гоголь)","Несчастная (Тургенев)","Неточка Незванова (Достоевский)","Поликушка (Толстой)","Моя жизнь (Чехов)","Воевода (Сон на Волге) (Островский)","Тонкий человек, его приключения и наблюдения (Некрасов)","Жених (Салтыков-Щедрин)","Захудалый род (Лесков)","Счастливая ошибка (Гончаров)","В людях (Горький)","Суходол (Бунин)","Тени (Короленко)","Каллисфен (Фонвизин)","Наталья, боярская дочь (Карамзин)","Поэзия (Тютчев)","Семейство Гольц (Фет)","Вольность (Радищев)","Кто брат, кто сестра, или обман за обманом (Грибоедов)","Каменный гость (Пушкин)","Кавказец (Лермонтов)","Игроки (Гоголь)","Холостяк (Тургенев)","Дядюшкин сон (Достоевский)","Утро помещика (Толстой)","Три года (Чехов)","Волки и овцы (Островский)","Повесть о бедном Климе (Некрасов)","Игрушечного дела людишки (Салтыков-Щедрин)","Детские годы (Лесков)","Обрыв (Гончаров)","Трое (Горький)","Веселый двор (Бунин)","Чудная (Короленко)","Послание к слугам моим Шумилову, Ваньке и Петрушке (Фонвизин)","Чувствительный и холодный (Карамзин)","Ещё томлюсь тоской желаний (Тютчев)","Вне моды (Фет)","Дневник одной недели (Радищев)","Притворная неверность (Грибоедов)","Египетские ночи (Пушкин)","Цыганы (Лермонтов)","Иван Фёдорович Шпонька и его тётушка (Гоголь)","Степной король Лир (Тургенев)","Вечный муж (Достоевский)","Живой труп (Толстой)","Ненужная победа (Чехов)","Последняя жертва (Островский)","Петербургские углы (Некрасов)","Новый Нарцисс (Салтыков-Щедрин)","Чающие движения воды (Лесков)","Фома Гордеев (Горький)","На даче (Бунин)","На затмении (Короленко)","Лисица-Кознодей (Фонвизин)","Прекрасная царевна и счастливый карла (Карамзин)","Восток белел. Ладья катилась (Тютчев)","Каленик (Фет)","Осьмнадцатое столетие (Радищев)","Молодые супруги (Грибоедов)","Домик в Коломне (Пушкин)","Арбенин (Лермонтов)","Ганц Кюхельгартен (Гоголь)","Затишье (Тургенев)","Скверный анекдот (Достоевский)","Дьявол (Толстой)","Рассказ неизвестного человека (Чехов)","Козьма Захарьич Минин, Сухорук (Островский)","Волшебное Кокорику, или Бабушкина курочка (Некрасов)","У пристани (Салтыков-Щедрин)","Житие одной бабы (Лесков)","Жизнь ненужного человека (Горький)","Учитель (Бунин)","Мгновение (Короленко)","К уму моему (Фонвизин)","Остров Борнгольм (Карамзин)","По равнине вод лазурной (Тютчев)"]},
  {id:'antiq',t:'Античность',ic:'amphora',pages:["Илиада (Гомер)","Одиссея (Гомер)","Басни Эзопа","История (Геродот; Мищенко)","Эдип царь (Софокл)","Антигона (Софокл)","Медея (Еврипид)","Энеида (Вергилий)","Метаморфозы (Овидий)","Сравнительные жизнеописания (Плутарх; Алексеев)","Теогония (Гесиод; Вересаев)","Эдип в Колоне (Софокл)","Электра (Софокл; Зелинский)","Филоктет (Софокл; Зелинский)","Аякс (Софокл; Зелинский)","Ипполит (Еврипид)","Вакханки (Еврипид)","Ифигения в Авлиде (Еврипид)","Апология Сократа (Платон; Карпов)","Пир (Платон; Городецкий)","Федон (Платон; Карпов)","Критон (Платон; Карпов)","Федр (Платон; Карпов)","Поэтика (Аристотель)","Политика (Аристотель)","История (Фукидид; Мищенко)","Киропедия (Ксенофонт; Янчевецкий)","Фасты (Овидий)","Героиды (Овидий; Красов)","Оды (Гораций; Анненский)","Жизнь двенадцати цезарей (Светоний; Алексеев)","Германия (Тацит; Моравский)","Медея (Сенека; Соловьев)","Эпиграммы (Марциал)","Свекровь (Теренций; Островский)","Евнух (Теренций; Тредиаковский)","Гомеровы гимны (Вересаев)","Труды и дни (Гесиод)","Государство (Платон)","Скорбные элегии (Овидий)","Скованный Прометей (Эсхил)","Трахинянки (Софокл; Зелинский)","Алькеста (Еврипид)","Андромаха (Еврипид)","Гекуба (Еврипид)","Геракл (Еврипид)","Елена (Еврипид)","Ион (Еврипид)","Ифигения в Тавриде (Еврипид; Анненский)","Киклоп (Еврипид)","Орест (Еврипид)","Финикиянки (Еврипид)","Электра (Еврипид)","Евтифрон (Платон)","Кратил (Платон; Карпов)","Теэтет (Платон)","Софист (Платон)","Парменид (Платон)","Филеб (Платон)","Хармид (Платон)","Лахес (Платон)","Протагор (Платон)","Горгий (Платон)","Менон (Платон)","Тимей (Платон)","Критий (Платон)","Законы (Платон)","Менексен (Платон)","Метафизика (Аристотель)","Категории (Аристотель)","Метаморфозы, или Золотой осел (Апулей)","Афоризмы (Эпиктет)","Наедине с собой (Марк Аврелий; Роговин)","Римская история от основания города (Ливий; Адрианов)","Речи против Катилины (Цицерон)","Любовные элегии (Овидий)","Письма с Понта (Овидий)","Героиды (Овидий)","Сатиры Ювенала (Ювенал; Минаев)","Метаморфозы","Гиппий меньший (Платон)","К Гросфу на спокойствие (Гораций; Муравьёв-Апостол)","Аттис (Катулл; Пиотровский)","Гимн Венере от Сафы (Сапфо; Мерзляков)","Живописец знаменитый (Анакреон; Водовозов)","Был недавно Диавл врачом, он могильщиком ныне (Марциал; Фет)","Гераклиды (Еврипид)","Следопыты (Софокл; Зелинский)","Разрушение Трои (Вергилий)","Жизнь и дела знаменитых людей древности (Плутарх; Алексеев)","Тень Каллимаха, и ты, святыня косца Филета (Проперций; Шатерников)","Улисс у Алькиноя (Гомер)","Муравей и муха (Федр; Шатерников)","Гиппий больший (Платон)","К Азинию Поллиону (Гораций; Фет)","Сопернику (Катулл; Пиотровский)","Веспер, ты, что приводишь всё, что заря рассевает (Сапфо; Бальмонт)","Ночною темнотою (Анакреон; Ломоносов)","В тополевой тени гуляя, муравей (Марциал; Ломоносов)","Рес (Еврипид)","Поллион (Вергилий; Соловьёв)","Кто бы впервые ни дал Амуру образ ребенка (Проперций; Шатерников)","Из «Илиады» (Гомер; Ломоносов)","Волк и ягнёнок (Федр; Шатерников)","Алкивиад Первый (Платон)","Песнь столетию (Гораций; Фет)","Счастливая примета (Катулл; Пиотровский)","Сладкий яблок краснеет, там на верхушке, вдали (Сапфо; Бальмонт)","Кузнечик (Анакреон; Гнедич)","Зачем я на жене богатой не женюсь? (Марциал; Ломоносов)","Смерть Клитемнестры (Еврипид)","Ты почиваешь, Титир, под листвием дуба широким (Вергилий; Муравьёв)","Видел во сне я тебя, что корабль, моя жизнь, потопило (Проперций; Шатерников)","Гимн Пану (Гомер; Мерзляков)","Пчёлы и трутни перед судом осы (Федр; Шатерников)","Алкивиад Второй (Платон)","Кто из богов мне возвратил (Гораций; Пушкин)","Фурий ласковый и Аврелий верный! (Катулл; Пиотровский)","Девственность, девственность, стой! Ты куда (Сапфо; Бальмонт)","Вафиллу (Анакреон; Мей)","Дивишься, что не дам тебе тебе стихов моих? (Марциал; Ломоносов)","Не спрашивай, мой сын, о горестной сей трате (Вергилий; Муравьёв)","Нет, Кинфия, ложью не силься готовой (Проперций; Корш)","Из гомеровских гимнов (Гомер)","Волк и журавль (Федр; Шатерников)","Лисий (Платон)","Гимн к Вакху (Гораций; Фет)","Игра (Катулл; Пиотровский)","С чем, о, любимый, тебя я, с чем я сравню (Сапфо; Бальмонт)","Молодая кобылица (Анакреон; Михайлов)","На Эсхила (Марциал; Брюсов)","Гимн Марсу (Гомер; Мерзляков)","Лягушки против Солнца (Федр; Артюшков)","Ион (Платон)","К дереву (Гораций; Фет)","Кто это видеть может, кто перенесёт (Катулл; Фет)","Вот, счастливый супруг (Сапфо; Бальмонт)","К восковому Эроту (Анакреон; Мей)","К Галле (Марциал; Брюсов)","Гимн Солнцу (Гомер; Мерзляков)","Олень у ручья (Федр; Шатерников)","Эвтидем (Платон)","Ода к Бландузскому ключу (Гораций; Бобров)","Забавы Флавия (Катулл; Пиотровский)","Зашла Луна (Сапфо; Бальмонт)","Сединой виски покрылись (Анакреон; Зелинский)","Лидия (Марциал; Брюсов)","Гимн Земле (Гомер; Мерзляков)","Лисица и виноград (Федр; Шатерников)","Феаг (Платон)","К Постумию (Гораций; Фет)","Мальчику (Катулл; Пушкин)","Звёзды быстро прячут светлые лики (Сапфо; Бальмонт)","Мне девы говорят (Анакреон; Водовозов)","На женитьбу Виктора (Марциал; Брюсов)","Собака, несущая мясо через реку (Федр; Шатерников)","Послезаконие (Платон)","К скупцам (Гораций; Фет)","Мой Вар, Суффена ты наверняка знаешь! (Катулл; Пиотровский)","К счастливой любовнице (Сапфо; Мерзляков)","Ты Фив дела поёшь (Анакреон; Водовозов)","На Лесбию (Марциал; Брюсов)","Лисица и аист (Федр; Шатерников)","Минос (Платон)","К больному Меценату (Гораций; Фет)","У многих Квинтия красавицей слывёт (Катулл; Корш)","К Дионису (Анакреон; Мей)","Старухе (Марциал; Брюсов)","Лопнувшая лягушка и бык (Федр; Шатерников)","Клитофон (Платон)","К Деллию (Гораций; Фет)","К Лесбии (Катулл; Пиотровский)","Ласточка (Анакреон; Баженов)","Какой я хочу любовницы (Марциал; Брюсов)","Лисица и ворон (Федр; Шатерников)","Платоновы разговоры о законах (Платон; Оболенский)","К Септимию (Гораций; Фет)","Плачь, Венера, и вы, Утехи, плачьте! (Катулл; Пиотровский)","Хоть и в цвете весенних ты дней (Анакреон; Водовозов)","На Лина (Марциал; Брюсов)"]},
  {id:'quest',t:'Приключения и фантастика',ic:'compass',pages:["Робинзон Крузо (Дефо; Шишмарёва)","Путешествия Гулливера (Свифт)","Айвенго (Скотт)","Последний из могикан (Купер)","Три мушкетёра (Дюма)","Граф Монте-Кристо (Дюма)","Дети капитана Гранта (Верн; Бекетова)","Двадцать тысяч лье под водой (Верн)","Остров сокровищ (Стивенсон)","Машина времени (Уэллс)","Война миров (Уэллс)","Затерянный мир (Дойль; 1912)","Аэлита (Толстой)","Человек-амфибия (Беляев)","Таинственный остров (Верн)","Пятнадцатилетний капитан (Верн; Петров)","Путешествие к центру Земли (Верн)","Михаил Строгов (Верн; Киселев)","Пять недель на воздушном шаре (Верн)","Похищенный (Стивенсон; Ротштейн)","Черная стрела (Стивенсон; Репина)","Остров доктора Моро (Уэллс)","Человек-невидимка (Уэллс; Вейс)","Первые люди на Луне (Уэллс; Лачинов)","Пища богов (Уэллс; Богораз)","Когда Спящий проснётся (Уэллс; Шишмарёва, Пименова)","Отверженные (Гюго; Виноградов)","Собор Парижской Богоматери (Гюго)","Королева Марго (Дюма; 1903)","Чёрный тюльпан (Дюма; Овсянникова)","Квентин Дорвард (Скотт; Шишмарёва)","Следопыт (Купер)","Прерия (Купер)","Белый вождь (Рид)","Копи царя Соломона (Хаггард)","Она (Хаггард)","Приключения Тома Сойера (Твен; Николаева)","Принц и нищий (Твен; Ясинский)","Янки из Коннектикута при дворе короля Артура (Твен)","Белый клык (Лондон; Кауфман)","Зов предков (Лондон; Вершинина)","Морской волк (Лондон; Андреева)","Мартин Иден (Лондон; Заяицкий)","Ким (Киплинг; Репина)","Мичман Изи (Марриет; Энгельгардт)","Корабль-призрак (Марриет; Энквист)","Остров сокровищ (Стивенсон; Е. К.)","Повесть о двух городах (Диккенс; Каменский)","Последний из могикан (Купер; Чистякова-Вэр, Репина)","Отравленный пояс (Дойль; Мандельштам)","Хижина дяди Тома (Бичер-Стоу; Анненская)","Айвенго (Скотт; Бекетова)","Тайна двух океанов (Адамов)","Плавающий город (Верн)","Вокруг света за восемьдесят дней (Жюль Верн)","Двадцать лет спустя (Дюма)","Зверобой (Купер)","Борьба за огонь (Рони; Петров)","Приключения капитана Гаттераса (Верн)","От Земли до Луны (Верн)","Вокруг Луны (Верн)","Два года каникул (Верн)","Южная звезда (Верн)","Маяк на краю света (Верн)","Золотой вулкан (Верн)","Чёрная Индия (Верн)","Оцеола вождь семинолов (Рид)","Охотники за скальпами (Рид)","Квартеронка (Рид)","Тропа войны (Рид)","Вольные стрелки (Рид)","Аллан Кватермэн (Хаггард)","Клеопатра (Хаггард)","Нада (Хаггард)","Оливер Твист (Диккенс)","Завещание чудака (Верн)","Жена-девочка (Рид)","Лейденская красавица (Хаггард)","Колония на кратере (Купер)","Тайна корабля (Стивенсон; Энгельгардт)","Женская война (Дюма; Строев)","Смирительная рубашка (Лондон)","Свет погас (Киплинг; Энквист)","Морской офицер Франк Мильдмей (Марриет; Скаловский)","Охотники за каучуком (Буссенар; Энквист)","Владыка морей (Сальгари)","Рыцари веры (Эмар)","Карл Смелый (Скотт)","Жанна д'Арк (Твен; Ясинский)","Война в воздухе (Уэллс; Пименова)","Девяносто третий год (Гюго; Киселёв)","Пожиратели огня (Жаколио)","Гобеленовая комната (Сабатини; Журавская)","Миссис Брэникен (Верн)","Отважная охотница (Рид)","Братья (Хаггард; Чистякова-Вэр)","Краснокожие (Купер)","Мастер Баллантрэ (Стивенсон; Манн)","Кавалер Красного замка (Дюма)","Джерри-островитянин (Лондон)","Наулака (Киплинг; Репина)","Приключение Питера Симпла (Марриет; Ясинский, Игнатова)","Путешествие парижанина вокруг света (Буссенар)","На Дальнем Западе (Сальгари)","Тунеядцы Нового Моста (Эмар)","Талисман (Скотт)","Похождения Гекльберри Финна (Твен; Энгельгардт)","Облик грядущего (Уэллс; Займовский)","Труженники моря (Гюго; Лесков)","Затерянные в океане (Жаколио)","Великолепное Ориноко (Верн)","Без пощады (Рид)","Джесс (Хаггард)","Пенитель моря (Купер; 1927)","Сент-Ив (Стивенсон)","Графиня Салисбюри (Дюма)","Неукротимый белый человек (Лондон)","Отважные мореплаватели (Киплинг; Гумберт)","Иафет в поисках отца (Марриет)","Приключения парижанина в Океании (Буссенар)","Капитан Темпеста (Сальгари; Мурахина-Аксенова)","Сурикэ (Эмар)","Ламмермурская невеста (Скотт; Тимирязев)","Рай или ад (Твен; Чехов)","Грядущие дни (Уэллс; Богораз)","Клод Ге (Гюго; А. К. Толстой)","Грабители морей (Жаколио; Киселёв)","Паровой дом (Верн; Седельников)","Смертельный выстрел (Рид)","Священный цветок (Хаггард)","Два адмирала (Купер)","Принц Отто (Стивенсон; Маркович)","Учитель фехтования (Дюма; Гордон)","Время-не-ждёт (Лондон)","Самая удивительная повесть в мире (Киплинг; Погодина)","Сто лет назад (Марриет; Энквист)","Из Парижа в Бразилию (Буссенар; Киселёв)","Человек огня (Сальгари)","Вольные стрелки (Эмар)","Легенда о Монтрозе (Скотт; Арбенева)","Великая революция в Питкерне (Твен; Займовский)","Рассказы каменного века (Уэллс; Морозов)","Берег Черного Дерева (Жаколио)","Малыш (Верн)","Гудзонов залив (Рид)","Жемчужина Востока (Хаггард; Энквист)","Землемер (Купер; Энквист)","Катриона (Стивенсон; Ротштейн)","Тысяча и один призрак (Дюма; Чудновский)","Путешествие на «Ослепительном» (Лондон)","В лесах Индии (Киплинг; Погодина)","Приключение собаки (Марриет; Энквист)","Монмартрская сирота (Буссенар; Киселев)","В дебрях Атласа (Сальгари)","Текучая Вода (Эмар)","Возлюбленная из Страны Снов (Твен; Львовский)","Игрок в крокет (Уэллс; Займовский)","Песчаный город (Жаколио)","Цезарь Каскабель (Верн)","Охотничий праздник (Рид)","Дитя бури (Хаггард)","Красный корсар (Купер)","Вечерние беседы на острове (Стивенсон)","Капитан Поль (Дюма)","Великий вопрос (Лондон)","История Бадалии Херодсфут (Киплинг; Погодина)","Служба на купеческом корабле (Марриет; Чистякова-Вэр)","Среди факиров (Буссенар)","Сокровище Голубых гор (Сальгари; Мурахина-Аксенова)","Меткая Пуля (Эмар)","Людоеды на железнодорожном поезде (Твен)","История Платтнера (Уэллс; Ирская)","Берег Слоновой Кости (Жаколио)","Путешествие в страну пушных зверей (Верн)","Дети лесов (Рид)"]},
  {id:'tales',t:'Сказки',ic:'castle',pages:["Сказка о царе Салтане (Пушкин)","Сказка о рыбаке и рыбке (Пушкин)","Сказка о мёртвой царевне и о семи богатырях (Пушкин)","Конёк-горбунок (Ершов)","Стрекоза и Муравей (Крылов)","Чёрная курица, или Подземные жители (Погорельский)","Городок в табакерке (Одоевский)","Аленький цветочек (Аксаков)","Огниво (Андерсен; Ганзен)","Русалочка (Андерсен; Ганзен)","Гадкий утёнок (Андерсен; Ганзен)","Снежная королева (Андерсен; Ганзен)","Сказка о попе и о работнике его Балде (Пушкин)","Сказка о золотом петушке (Пушкин)","Спящая царевна (Жуковский)","Сказка о царе Берендее (Жуковский)","Кот в сапогах (Жуковский)","Мороз Иванович (Одоевский)","Сказка о жабе и розе (Гаршин)","Лягушка-путешественница (Гаршин)","Серая шейка (Мамин-Сибиряк)","Алёнушкины сказки (Мамин-Сибиряк)","Сказка про храброго Зайца — длинные уши, косые глаза, короткий хвост (Мамин-Сибиряк)","Сказки об Италии (Горький)","Воробьишко (Горький)","Дикий помещик (Салтыков-Щедрин)","Самоотверженный заяц (Салтыков-Щедрин)","Карась-идеалист (Салтыков-Щедрин)","Три медведя (Толстой)","Волк и Ягнёнок (Крылов)","Ворона и Лисица (Крылов)","Квартет (Крылов)","Мартышка и очки (Крылов)","Слон и Моська (Крылов)","Кот и Повар (Крылов)","Демьянова уха (Крылов)","Дюймовочка (Андерсен; Ганзен)","Стойкий оловянный солдатик (Андерсен; Ганзен)","Новый наряд короля (Андерсен; Ганзен)","Принцесса на горошине (Андерсен; Ганзен)","Соловей (Андерсен; Ганзен)","Дикие лебеди (Андерсен; Ганзен)","Свинопас (Андерсен; Ганзен)","Оле-Лукойе (Андерсен)","Девочка со спичками (Андерсен; Ганзен)","Ель (Андерсен; Ганзен)","Белоснежка (Гримм; Снессорева)","Бременские музыканты (Гримм)","Гензель и Гретель (Гримм; Полевой)","Красная Шапочка (Гримм; Полевой)","Госпожа Метелица (Гримм; Полевой)","Храбрый портняжка (Гримм; Полевой)","Шиповничек (Гримм; Полевой)","Красная Шапочка (Перро)","Кот в сапогах (Перро; Тургенев)","Спящая красавица (Перро; Тургенев)","Синяя борода (Перро; Тургенев)","Карлик Нос (Гауф)","Маленький Мук (Гауф)","Холодное сердце (Гауф; Полевой)","Щелкунчик и Мышиный король (Гофман; Соколовский)","Золотой горшок (Гофман)","Счастливый Принц (Уайльд)","Соловей и роза (Уайльд; Сахаров)","Великан-эгоист (Уайльд)","Звездный Мальчик (Уайльд; Николаев)","Кентервильское привидение (Уайльд)","Алиса в стране чудес (Кэрролл)","Приключения Алисы в стране чудес (Кэрролл; Рождественская)","Приключения Пиноккио (Коллоди)","Тысяча и одна ночь (Гольдберг)","Сказки дядюшки Римуса (Харрис)","Народные русские сказки (Афанасьев)","Теремок (текст с ударениями)","Колобок (Бальмонт)","Репка (Чехов)","Курочка Ряба","Финист — ясный сокол","Пчела и Мухи (Крылов)","Золушка","Маленький Клаус и большой Клаус (Андерсен; Ганзен)","Король-лягушонок, или Железный Генрих (Гримм; Полевой)","Лесная сказка (Мамин-Сибиряк)","Истории, сценки, сказки (Ушинский)","Александрийский шейх и его невольники (Гауф)","Игоша (Одоевский)","Вторая книга джунглей (Киплинг; Чистякова-Вэр)","Преданный друг (Уайльд; Сахаров)","Сигрид Сторреда (Лагерлёф)","Цветы маленькой Иды (Андерсен; Ганзен)","Дружба кошки и мышки (Гримм; Полевой)","Сказки (Ушинский)","Еврей Абнер, который ничего не видал (Гауф)","Индийская сказка о четырёх глухих (Одоевский)","Сказки и легенды (Киплинг; Чистякова-Вэр)","Кичливая ракета (Уайльд; Сахаров)","Лизок с вершок (Андерсен; Ганзен)","Дитя Марии (Гримм; Полевой)","Жизнь Альмансора (Гауф)","Необойдённый дом (Одоевский)","Старая Англия (Киплинг; Энквист)","Молодой король (Уайльд; Сахаров)","Нехороший мальчик (Андерсен; Ганзен)","Сказка о том, кто ходил страху учиться (Гримм; Полевой)","Караван (Гауф)","Сказки дедушки Иринея (Одоевский)","День рождения Принцессы (Уайльд; Сахаров)","Дорожный товарищ (Андерсен; Ганзен)","Волк и семеро маленьких козлят (Гримм; Полевой)","Пещера Штинфолля (Гауф)","Пёстрые сказки с красным словцом (Одоевский)","Юный король (Уайльд)","Ромашка (Андерсен; Ганзен)","Верный Иоганн (Гримм; Полевой)","Предание о гульдене (Гауф)","Деревянный гость, или сказка об очнувшейся кукле и господине Кивакеле (Одоевский)","Эльф розового куста (Андерсен; Ганзен)","Удачная торговля (Гримм; Полевой)","Приключения Саида (Гауф)","Маленький фарисей, или Маленький лицемер (Одоевский)","Эльф (Андерсен; Ганзен)","Необыкновенный музыкант (Гримм; Полевой)","Рассказ Альмансора (Гауф)","Переносчица, или Хитрость против хитрости (Одоевский)","Райский сад (Андерсен; Ганзен)","Двенадцать братьев (Гримм; Полевой)","Рассказ о калифе аисте (Гауф)","Царь-Девица (Одоевский)","Сундук-самолёт (Андерсен; Ганзен)","Сброд оборванцев (Гримм; Полевой)","Рассказ о корабле привидений (Гауф)","Аисты (Андерсен; Ганзен)","Братец и сестрица (Гримм; Полевой)","Рассказ об отрубленной руке (Гауф)","Злой князь (Андерсен; Ганзен)","Колокольчик (Гримм; Полевой)","Сказка о мнимом принце (Гауф)","Гречиха (Андерсен; Ганзен)","Три человечка в лесу (Гримм; Полевой)","Спасение Фатьмы (Гауф)","Бронзовый кабан (быль) (Андерсен; Ганзен)","Три пряхи (Гримм; Полевой)","Харчевня в Шпессарте (Гауф)","Побратимы (Андерсен; Ганзен)","Три змеиных листика (Гримм; Полевой)","Человек-обезьяна (Гауф)","Роза с могилы Гомера (Андерсен; Ганзен)","Белая змея (Гримм; Полевой)","Ангел (Андерсен; Ганзен)","Соломинка, уголёк и боб (Гримм; Полевой)","Жених и невеста (Андерсен; Ганзен)","Замарашка (Гримм; Полевой)","Парочка (Андерсен; Ганзен)","Загадка (Гримм; Полевой)","Бузинная матушка (Андерсен; Ганзен)","Семь воронов (Гримм; Полевой)","Волшебный холм (Андерсен; Ганзен)","Бременские уличные музыканты (Гримм; Полевой)","Лесной холм (Андерсен; Ганзен)","Поющая косточка (Гримм; Полевой)","Красные башмаки (Андерсен; Ганзен)","Чёрт с тремя золотыми волосками (Гримм; Полевой)","Прыгуны (Андерсен; Ганзен)","Вошка и блошка (Гримм; Полевой)","Пастушка и трубочист (Андерсен; Ганзен)","Девушка без рук (Гримм; Полевой)","Хольгер Датчанин (Андерсен; Ганзен)","Разумный Ганс (Гримм; Полевой)","Гольгер-Данске (Андерсен; Ганзен)","Три языка (Гримм; Полевой)","Колокол (Андерсен; Ганзен)","Умная Эльза (Гримм; Полевой)","Бабушка (Андерсен; Ганзен)","Портной в раю (Гримм; Полевой)","Штопальная игла (Андерсен; Ганзен)","Мальчик-с-пальчик (Гримм; Полевой)","Из окна богадельни (Андерсен; Ганзен)","Свадьба госпожи лисицы (Гримм; Полевой)","С крепостного вала (Андерсен; Ганзен)","Домовые (Гримм; Полевой)"]},
  {id:'short',t:'Короткое на вечер',ic:'clock',pages:["Станционный смотритель (Пушкин)","Пиковая дама (Пушкин)","Шинель (Гоголь)","Нос (Гоголь)","Муму (Тургенев)","Бежин луг (Тургенев)","Ася (Тургенев)","Белые ночи (Достоевский)","После бала (Толстой)","Кавказский пленник (Толстой)","Каштанка (Чехов)","Хамелеон (Чехов)","Толстый и тонкий (Чехов)","Человек в футляре (Чехов)","Дама с собачкой (Чехов)","Повести покойного Ивана Петровича Белкина (Пушкин)","Коляска (Гоголь)","Старосветские помещики (Гоголь)","Записки сумасшедшего (Гоголь)","Портрет (Гоголь)","Хорь и Калиныч (Тургенев)","Певцы (Тургенев)","Свидание (Тургенев)","Бирюк (Тургенев)","Касьян с Красивой Мечи (Тургенев)","Первая любовь (Тургенев)","Вешние воды (Тургенев)","Стихотворения в прозе (Тургенев)","Мальчик у Христа на ёлке (Достоевский)","Кроткая (Достоевский)","Сон смешного человека (Достоевский)","Бобок (Достоевский)","Крокодил (Достоевский)","Чужая жена и муж под кроватью (Достоевский)","Хозяин и работник (Толстой)","Много ли человеку земли нужно (Толстой)","Чем люди живы (Толстой)","Три смерти (Толстой)","Холстомер (Толстой)","Альберт (Толстой)","Смерть чиновника (Чехов)","Тоска (Чехов)","Злоумышленник (Чехов)","Лошадиная фамилия (Чехов)","Попрыгунья (Чехов)","Душечка (Чехов)","Дом с мезонином (Чехов)","Спать хочется (Чехов)","Студент (Чехов)","Архиерей (Чехов)","Невеста (Чехов)","Скрипка Ротшильда (Чехов)","Анна на шее (Чехов)","Глупый француз (Чехов)","Жалобная книга (Чехов)","Дочь Альбиона (Чехов)","Пересолил (Чехов)","Мальчики (Чехов)","Белолобый (Чехов)","Тапёр (Куприн)","Слон (Куприн)","Изумруд (Куприн)","Куст сирени (Куприн)","Allez! (Куприн)","Макар Чудра (Горький)","Мальва (Горький)","Супруги Орловы (Горький)","Двадцать шесть и одна (Горький)","Сон Макара (Короленко)","«Лес шумит» (Короленко)","Огоньки (Короленко)","Четыре дня (Гаршин)","Attalea princeps (Гаршин)","Сигнал (Гаршин)","Кусака (Андреев)","Ангелочек (Андреев)","Баргамот и Гараська (Андреев)","Иуда Искариот (Андреев)","Рассказ о семи повешенных (Андреев)","Антоновские яблоки (Бунин)","Лёгкое дыхание (Бунин)","Вождь краснокожих (О. Генри)","Маска Красной Смерти (По; Шелгунов)","Колодец и маятник (По; Бальмонт)","Сердце-обличитель (По; Михаловский)","Чёрный кот (По; Михаловский)","Кармен (Мериме)","Тупейный художник (Лесков)","Человек на часах (Лесков)","Пугало (Лесков)","Зверь (Лесков)","Рип Ван Винкль (Ирвинг; Гершензон)","Падение дома Ашеров (По)","Бочонок амонтильядо (По)","Агафья (Чехов)","Последний дебют (Куприн)","На хуторе (Бунин)","Алёша-дурачок (Андреев)","Происшествие (Гаршин)","Правильные слова (Мамин-Сибиряк)","Разбойник (Лесков)","Плакальщицы (Мопассан; Рачинский)","На чердаке (О. Генри; Азов)","Жемчужина Толедо (Мериме; Кузмин)","Русская история (Аверченко)","Быт глубокого тыла (Тэффи)","Блестящий капитан (Станюкович)","Гость (Успенский)","Загадка (Вересаев)","Актёрская гибель (Чехов)","Психея (Куприн)","Туман (Бунин)","Бездна (Андреев)","Очень коротенький роман (Гаршин)","На заимке (Мамин-Сибиряк)","Язвительный (Лесков)","На реке (Мопассан; Рачинский)","Фараон и хорал (О. Генри; Горлин)","Голубая комната (Мериме)","Аполлон (Аверченко)","В кафе (Тэффи)","В шторм (Станюкович)","Мимоходом (Успенский)","Товарищи (Вересаев)","Антрепренёр под диваном (Чехов)","Лунной ночью (Куприн)","Танька (Бунин)","Бен-Товит (Андреев)","Встреча (Гаршин)","Хищная птица (Мамин-Сибиряк)","Бесстыдник (Лесков)","История одной батрачки (Мопассан; Рачинский)","Калиф, купидон и часы (О. Генри; Львовский)","Джуман (Мериме)","Проклятие (Аверченко)","День прошёл (Тэффи)","Вдали от берегов (Станюкович)","Народное гулянье в Всехвятском (Успенский)","К спеху (Вересаев)","Анюта (Чехов)","Славянская душа (Куприн)","Кастрюк (Бунин)","Большой шлем (Андреев)","Художники (Гаршин)","Аверко (Мамин-Сибиряк)","Чертогон (Лесков)","Папа Симона (Мопассан; Рачинский)","Алое платье (О. Генри; Азов)","Матео Фальконе (Мериме)","Золотой век (Аверченко)","Рубин принцессы (Тэффи)","Гибель «Ястреба» (Станюкович)","Лизар (Вересаев)","Аптекарша (Чехов)","Аль-Исса (Куприн)","На чужой стороне (Бунин)","В подвале (Андреев)","Денщик и офицер (Гаршин)","Савка (Мамин-Сибиряк)","Пламенная патриотка (Лесков)","Поездка за город (Мопассан; Рачинский)","Иностранная политика 99-й пожарной команды (О. Генри; Азов)","Партия в триктрак (Мериме)","Без почвы (Аверченко)","Остров (Тэффи)","Диковинный матросик (Станюкович)","Ванька (Вересаев)","Ах, зубы! (Чехов)","Негласная ревизия (Куприн)","На край света (Бунин)","В Сабурове (Андреев)","Ночь (Гаршин)","Последние клейма (Мамин-Сибиряк)","Справедливый человек (Лесков)","Весною (Мопассан; Рачинский)","Утерянный рецепт (О. Генри; Азов)","Федериго (Мериме)","Мозаика (Аверченко)","Сезоны (Тэффи)","Добрый (Станюкович)","На эстраде (Вересаев)","Бабы (Чехов)","На разъезде (Куприн)","В поле (Бунин)","В тёмную даль (Андреев)","То, чего не было (Гаршин)","Разбойник и преступник (Мамин-Сибиряк)","Повесть о богоугодном дровоколе (Лесков)","Подруга Поля (Мопассан; Рачинский)","Чёрное платье (О. Генри; Бродерсен)","Поэт (Аверченко)","Австралийка (Тэффи)","Ёлка (Станюкович)","Ребята (Вересаев)"]},
  /* 08.11 (Джессика: «ещё сотню … книг в каждый раздел»): up to 100 more books per collection from the Wikisource pages of the collection's authors, each title checked live 08.11 (one translation per work, no articles or letters); myths, detect and scifi got fewer: Wikisource has no more suitable texts */
/* 07.11 (Джессика: «хотя бы по 70 книг каждую»): every collection 73–100 books, titles checked live on ru.wikisource 07.11 (exist, no copyright marks); a book is in one collection only */
  /* 25.10 (Джессика, пункт 3): titles checked live on ru.wikisource 25.10, PD or free; a page of editions opens as a list */
  {id:'silver',t:'Серебряный век',ic:'moon',pages:["Двенадцать (Блок)","Скифы (Блок)","Облако в штанах (Маяковский)","Флейта-позвоночник (Маяковский)","Silentium (Мандельштам)","Бессонница. Гомер. Тугие паруса (Мандельштам)","Мне нравится, что Вы больны не мной (Цветаева)","Не жалею, не зову, не плачу (Есенин)","Бобэоби пелись губы (Хлебников)","Хочу (Бальмонт)","Незнакомка (По вечерам над ресторанами — Блок)","О доблестях, о подвигах, о славе (Блок)","Девушка пела в церковном хоре (Блок)","Россия (Блок)","На поле Куликовом (Блок)","Шаги Командора (Блок)","Соловьиный сад (Блок)","Балаганчик (Блок)","Послушайте! (Маяковский)","А вы могли бы? (Маяковский)","Хорошее отношение к лошадям (Маяковский)","Лиличка! (Маяковский)","Необычайное приключение, бывшее с Владимиром Маяковским летом на даче (Маяковский)","Война и мир (Маяковский)","Человек (Маяковский)","Левый марш (Маяковский)","Мистерия-буфф (Маяковский)","Клоп (Маяковский)","Баня (Маяковский)","Владимир Ильич Ленин (Маяковский)","Хорошо (Маяковский)","Во весь голос (Маяковский)","Жираф (Гумилёв)","Капитаны (Гумилёв)","Заблудившийся трамвай (Гумилёв)","Слово (Гумилёв)","Шестое чувство (Гумилёв)","Конквистадор (Гумилёв)","Озеро Чад (Гумилёв)","Моим стихам, написанным так рано (Цветаева)","Вечерний альбом (Цветаева)","Волшебный фонарь (Цветаева)","Вёрсты (Цветаева)","Гой ты, Русь, моя родная (Есенин)","Берёза (Есенин)","Песнь о собаке (Есенин)","Пугачёв (Есенин)","Анна Снегина (Есенин)","Отговорила роща золотая (Есенин)","Камень (Мандельштам)","Горящие здания (Бальмонт)","Чёлн томленья (Бальмонт)","Я мечтою ловил уходящие тени (Бальмонт)","Юному поэту (Брюсов)","Творчество (Брюсов)","Грядущие гунны (Брюсов)","Огненный ангел (Брюсов)","Мелкий бес (Сологуб)","Звезда Маир (Сологуб)","Петербург (Белый)","Серебряный голубь (Белый)","Котик Летаев (Белый)","Пепел (Белый)","Кузнечик (Хлебников)","Заклятие смехом (Хлебников)","Зангези (Хлебников)","Кипарисовый ларец (Анненский)","Крылья (Кузмин)","Увертюра (Ананасы в шампанском — Северянин)","Кармен (Блок)","Коктебель (Волошин)","Дом поэта (Волошин)","Демоны глухонемые (Волошин)","Песня (Окно мое высоко над землею — Зинаида Гиппиус)","Дюжина ножей в спину революции (Аверченко)","Сатиры (Черный)","Леонардо да Винчи (Мережковский)","Сосен перезвон (Клюев)","Ночь, улица, фонарь, аптека (Блок)","Возмездие (Блок)","Pro domo sua (Брюсов)","Струя (Бальмонт)","Мик (Гумилёв)","Чародей (Цветаева)","Песнь о Евпатии Коловрате (Есенин)","Ночь (Маяковский)","Птичка в клетке (Хлебников)","Первое свидание (Белый)","В смуте этих темных дней (Сологуб)","Тихие песни (Анненский)","Мои предки (Кузмин)","Лилии души (Северянин)","К древним тайнам мёртвой Атлантиды (Волошин)","Отрада (Зинаида Гиппиус)","Памяти Матери (Вяч. Иванов)","В моей стране. Цикл стихотворений (Ходасевич)","Душе очарованной снятся лазурные дали (Лохвицкая)","На распутье (Мережковский)","Деревня (Клюев)","Детская шарманочка (Гуро)","Отречение (Брюсов)","Хоровод времён (Бальмонт)","Открытие Америки (Гумилёв)","На Красном Коне (Цветаева)","Марфа Посадница (Есенин)","Утро (Маяковский)","И я свирел в свою свирель (Хлебников)","Душа мира (Белый)","Амфора (Сологуб)","У гроба (Анненский)","Любовь этого лета (Кузмин)","Маргаритки (Северянин)","Закат гранатовый (Волошин)","Никогда (Зинаида Гиппиус)","Виноградник Диониса (Вяч. Иванов)","В моей стране (Ходасевич)","Ни речи живые, ни огненный взгляд (Лохвицкая)","В борьбе на жизнь и смерть не сдамся я врагу (Мережковский)","Заозерье (Клюев)","Но в утро осеннее, час покорно-бледный (Гуро)","Моление царя (Брюсов)","Зарево зорь (Бальмонт)","Поэма начала (Гумилёв)","Поэма Горы (Цветаева)","Микола (Есенин)","Порт (Маяковский)","Россия забыла напитки (Хлебников)","Незнакомый друг (Белый)","Воды (Сологуб)","Двойник (Анненский)","Где слог найду, чтоб описать прогулку (Кузмин)","Солнце всегда вдохновенно (Северянин)","Пришла изночница; в постель (Волошин)","Бессилие (Зинаида Гиппиус)","На Крыльях Зари (Вяч. Иванов)","Нет, молодость, ты мне была верна (Ходасевич)","Элегия (Лохвицкая)","Кораллы (Мережковский)","Мать-суббота (Клюев)","Финляндия (Гуро)","Белый зодчий (Бальмонт)","Поэма Конца (Цветаева)","Русь (Есенин)","Уличное (Маяковский)","Немь лукает луком немным (Хлебников)","Могилу их украсили венками (Белый)","Какие слабые цветы (Сологуб)","Который? (Анненский)","Глаз змеи, змеи извивы (Кузмин)","Пасхальный гимн (Северянин)","Дубы нерослые подъемлют облак крон (Волошин)","Снежные хлопья (Зинаида Гиппиус)","Странник и Статуи (Вяч. Иванов)","Вокруг меня кольцо сжимается (Ходасевич)","Две красоты (Лохвицкая)","Все грезы юности и все мои желанья (Мережковский)","Плач о Есенине (Клюев)","Слова любви и тепла (Гуро)","Сонеты Солнца, мёда и Луны (Бальмонт)","Крысолов (Цветаева)","Ус (Есенин)","Вывескам (Маяковский)","Там, где жили свиристели (Хлебников)","Блоку (Белый)","Лампа моя равнодушно мне светит (Сологуб)","На пороге (Анненский)","Ах, уста, целованные столькими (Кузмин)","Очам твоей души (Северянин)","На пол пала лунная тень от рамы (Волошин)","Иди за мной (Зинаида Гиппиус)","Caveant Consules (Вяч. Иванов)","Один, среди речных излучин (Ходасевич)","Быть грозе! Я вижу это (Лохвицкая)","Порой, как образ Прометея (Мережковский)","Погорельщина (Клюев)","Ветрогон, сумасброд, летатель (Гуро)","Дар Земле (Бальмонт)","С моря (Цветаева)","Певущий зов (Есенин)"]},
  {id:'myths',t:'Мифы и легенды',ic:'scroll-text',pages:["Гильгамеш (Гумилёв)","Слово о полку Игореве (Жуковский)","Илья Муромец и Соловей-разбойник","Тристан и Изольда (Бедье; Веселовский)","Песнь о Гайавате (Лонгфелло; Бунин)","Рустем и Зораб (Жуковский)","Наль и Дамаянти (Жуковский)","Старшая Эдда","Песнь о Роланде","Калевала (Лённрот; Бельский)","Беовульф (Гербель)","Витязь в тигровой шкуре (Руставели; Петренко)","Кодзики","Садко (Бальмонт)","Древние Российские стихотворения, собранные Киршею Даниловым","Дюк Степанович (Не буря ли в поле подымается...)","Микула Селянинович (Бальмонт)","Сказание о Мамаевом побоище","Повесть о Петре и Февронии Муромских (Еразм)","Песнь о Гайавате (Лонгфелло)","Книга Иова","Песнь песней Соломона","Что рассказывали древние греки и римляне о своих богах и героях (Кун)","Персей (Гумилёв)","Прометей (Готье; Чюмина)","Нарцисс (Пентадий; Брюсов)","Дедал и Икар (Брюсов)","Фаэтон (Брюсов)","Летучий голландец (Булгаков)","Лорелея (Гейне; Блок)","Лесной царь (Гёте; Жуковский)","Ундина (Фуке; Жуковский)","Ивиковы журавли (Шиллер; Жуковский)","Кубок (Шиллер; Жуковский)","Перчатка (Шиллер; Жуковский)","Суд Божий над епископом (Саути; Жуковский)","Песнь о вещем Олеге (Пушкин)","Слово о погибели Русской земли","Слово Данила Заточеника, еже написа своему князю Ярославу Володимеровичю","Поучение Владимира Мономаха","Голем (Майринк; Выгодский)","Вечный жид (Полонский)","Король Лир (Шекспир)","Буря (Шекспир; Мей)","Повесть временных лет (Нестор)","Еруслан Лазаревич","Рождение богатыря","Соловей Будимирович","Катерина Микулична (Шергин)","Старина о князе Михаиле (Шергин)","Василий и Снафида (Шергин)","Онежские былины (Гильфердинг)","Песни, собранные П.Н. Рыбниковым","Баймаган (Мамин-Сибиряк)","Лебедь Хантыгая (Мамин-Сибиряк)","Майя (Мамин-Сибиряк)","Сказание о сибирском хане, старом Кучуме (Мамин-Сибиряк)","Слёзы царицы (Мамин-Сибиряк)","Ло-Крист (Балобанова)","Замок Корвеннек (Балобанова)","Красная принцесса (Балобанова)","Кровавый барон (Балобанова)","Царица бурь (Балобанова)","Таинственный замок (Балобанова)","Голубой цветок надежды (Балобанова)","Видение Моисея (Дорошевич)","Легенда об изобретении пороха (Дорошевич)","Звездочёт (Дорошевич)","Происхождение глупости (Дорошевич)","Хан и мудрец (Дорошевич)","Железное Сердце (Дорошевич)","Закон Бальдера (Хирьяков)","Японская башня (Хирьяков)","Джин-Падишах (Желиховская)","Чёрный рыцарь (Немирович-Данченко)","Легенда о птицах (Лухманова)","Житие протопопа Аввакума","Повесть о Савве Грудцыне","Хождение за три моря Афанасия Никитина","Житие Константина (Кирилла) Философа","Книга Еноха","Сказание о построении града Ярославля","Предание тобольских татар о грозном царе Тамерлане","Бхагавадгита","Агасфер (Жуковский)","Сказки и легенды (Дорошевич)","Легенды о старинных замках Бретани (Балобанова)","Евангелина (Лонгфелло; Петерсон)","Сказка о Иване-царевиче и Сером Волке (Жуковский)","Слёзы (Дорошевич)","Поэмы Оссиана (Балобанова)","Камоэнс (Жуковский)","Приключения Юн-Хо-Зана (Дорошевич)","Сид (Жуковский)","Вильгельм Телль (Дорошевич)","Кузнец Базим (Жуковский)","Не те пятки (Дорошевич)","Война мышей и лягушек (Жуковский)","Три бездельника (Дорошевич)","Тюльпанное дерево (Жуковский)","Приключение принцессы (Дорошевич)","Халиф и грешница (Дорошевич)","Парии (Дорошевич)","Злоумышленник (Дорошевич)","Ибрагим Алач (Дорошевич)","Правда и ложь (Дорошевич)","Зелёная птица (Дорошевич)","Суд над сановником (Дорошевич)","Призраки пустыни (Дорошевич)","Сон индуса (Дорошевич)","Человек правды (Дорошевич)","Поцелуй (Дорошевич)","Сказка о сказке (Дорошевич)","Визирь (Дорошевич)","Неудачник Пепе (Дорошевич)","Добро и зло (Дорошевич)","Ученье и жизнь (Дорошевич)","Искусство управлять (Дорошевич)","Кротость (Дорошевич)","Жемчуг (Дорошевич)","Чауш Бисла (Дорошевич)","Совесть (Дорошевич)","Человек и его подобие (Дорошевич)","Мудрец (Дорошевич)","Сотворение Брамы (Дорошевич)","Халиф Омэр и султан Керим (Дорошевич)"]},
  {id:'detect',t:'Детективы',ic:'footprints',pages:["Пёстрая лента (Дойль; 1896)","Этюд в багровых тонах (Дойль)","Убийство на улице Морг (По; Бальмонт)","Золотой жук (По; Бальмонт)","Похищенное письмо (По)","Шведская спичка (Чехов)","Драма на охоте (Чехов)","Собака Баскервилей (Дойль; Ломиковская)","Жёлтое лицо (Дойль; д'Андре)","Последнее дело Холмса (Дойль; Туфанов)","Шесть Наполеонов (Дойль; 1925)","Человек, который знал слишком много (Честертон)","Одинокая велосипедистка (Дойль; 1904)","Золотой жук (По)","Что побудило к убийству? (Шкляревский)","История голубого алмаза (Дойль; Латернер)","Сильвер Блэз (Дойль; Туфанов)","В пустом доме (Дойль; 1903)","Норвудский архитектор (Дойль; 1904)","Вампир из Суссекса (Дойль; 1927)","Загадка Торского моста (Дойль; 1928)","Жилица под вуалью (Дойль; 1927)","Приключение в усадьбе Шоском (Дойль; 1927)","Неведение отца Брауна (Честертон)","Мудрость отца Брауна (Честертон)","Недоверчивость отца Брауна (Честертон)","Тайна отца Брауна (сборник — Честертон)","Скандальное происшествие с отцом Брауном (сборник — Честертон)","Клуб удивительных промыслов (Честертон)","Парадоксы мистера Понда (Честертон)","Четыре праведных преступника (Честертон)","Армадэль. Том 1 (Коллинз)","Тайна (Коллинз)","Новая Магдалина (Коллинз)","Закон и жена (Коллинз; Пиге)","Рассказ судебного следователя (Шкляревский)","Секретное следствие (Шкляревский)","Русский Тичборн (Шкляревский)","«Золотая Ручка» (Антропов)","Клуб червонных валетов (Антропов)","Петербургский Джек-Потрошитель (Антропов)","Тайна Сухаревой башни (Антропов)","Тайны Охтенского кладбища (Антропов)","Гроб с двойным дном (Антропов)","Отравление миллионерши-наследницы (Антропов)","Пропавшее завещание (Антропов)","Поцелуй Бронзовой Девы (Антропов)","Калиостро XIX века (Антропов)","Ограбленная почта (Антропов)","Хрустальная пробка (Леблан)","Восемь ударов стенных часов (Леблан)","40 лет среди грабителей и убийц (Путилин)","Рабы Парижа (Габорио)","Морской договор (Дойль; Репина)","Союз рыжеволосых (Дойль)","Аристократ-холостяк (Дойль; Репина)","Берилловая корона (Дойль; Репина)","Усадьба «Под буками» (Дойль; Репина)","Мёсгрэвский обряд (Дойль; Репина)","Грек-переводчик (Дойль; Репина)","Случай в школе (Дойль; Облеухов)","Чёрный Пётр (Дойль; Облеухов)","Шесть Наполеонов (Дойль; 1907)","Кто из трёх? (Дойль; Облеухов)","Золотое пенсне (Дойль; 1907)","Исчезновение чемпиона (Дойль; 1907)","Красный шнурок (Дойль; 1907)","Кровавое пятно (Дойль; 1907)","Лунный камень (Коллинз)","Белые голуби и сизые горлицы (Антропов)","В когтях одесских демонов (Антропов)","Квазимодо церкви Спаса на Сенной (Антропов)","Мельница в Гусевом переулке (Антропов)","Огненный крест (Антропов)","Одиннадцать трупов без головы (Антропов)","Похитители невест (Антропов)","Преступление в Иверской часовне (Антропов)","Тьма египетская (Антропов)","Красное по белому (Дойль; Облеухов)","Тайна Мари Роже (По; Энгельгардт)","Герцогиня и «конюх» (Антропов)","Бедная мисс Финч (Коллинз)","Белая ворона (Честертон)","Канатная плясунья (Леблан)","Лицо во мраке (Уоллес)","Око Озириса (Фримен; Левицкая, Строганова)","Корреспондент газеты (Дойль; Облеухов)","Вильям Вильсон (По; Бальмонт)","Контрабандисты (Антропов)","Закон и женщина (Коллинз)","Душа старика Вивандье (Леблан)","Зеленый Стрелок (Уоллес)","Скандальная история в княжестве О... (Дойль; Латернер)","Падение дома Эшер (По; Бальмонт)","Ключ поволжских сектантов (Антропов)","Опавшие листья (Коллинз)","Тайна желтых нарциссов (Уоллес)","Калека (Дойль; д`Андре)","Нисхождение в Мальстрём (По; Бальмонт)","В руках палачей (Антропов)","Тайный брак (Коллинз)","Таинственный двойник (Уоллес)","Человек с шестью часами (Дойль; Ильина)","Несколько слов с мумией (По; Бальмонт)","Петербургские вампиры-кровопийцы (Антропов)","Чёрная ряса (Коллинз)","Дверь с семью замками (Уоллес)","Новое дело Шерлока Холмса (Дойль; Журавская)","Лигейя (По; Бальмонт)","Претендент на болгарский престол (Антропов)","Две судьбы (Коллинз)","Фальшивомонетчик (Уоллес)","Новая катакомба (Дойль; Облеухов)","Преждевременные похороны (По; Бальмонт)","Ужасы больничной мертвецкой (Антропов)","Таинственное происшествие в современной Венеции (Коллинз)","Ворота измены (Уоллес)","Бочонок с икрой (Дойль; 1908)","Система доктора Дегот и профессора Перье (По; Энгельгардт)","Зонтик (Коллинз)","Мститель (Уоллес)","Владелец Чёрного замка (Дойль; Облеухов)","Колодезь и маятник (По; Лачинова)","Секрет Гамона (Уоллес)","Ужасы воздуха (Дойль; Журавская)","Король Чума (По; Бальмонт)","Тайна булавки (Уоллес)","Заколдованный остров (Дойль; 1899)","Продолговатый ящик (По; Бальмонт)","В сетях аферистки (Уоллес)","Воронка из кожи (Дойль; Ильина)","Ты убийца (По; Живописное обозрение)","Джентльмен в черной маске (Уоллес)","Серебряное зеркало (Дойль; 1909)","Манускрипт, найденный в бутылке (По; Бальмонт)","У трех дубов (Уоллес)","Остров привидений (Дойль; 1912)","Береника (По; Бальмонт)","Шестое чувство Ридера (Уоллес)","Хоп-Фрог (По; Бальмонт)","Шутник (Уоллес)","Метценгерштейн (По; Бальмонт)","Сын палача (Уоллес)","Что случилось с г-н Вальдемаром? (По; Энгельгардт)","Дюссельдорфский убийца (Уоллес)","Чёрная кошка (По; Шелгунов)","Доносчик (Уоллес)","Человек толпы (По; Библиотека для чтения)","Потерянный миллион (Уоллес)","Мистификация (По; Уманец)","Кэтти (Уоллес)","Демон Извращённости (По; Бальмонт)","Пернатая змея (Уоллес)","Красная смерть (По; Лачинова)","Бандит (Уоллес)","Сердце-изобличитель (По; Бальмонт)","Вождь террористов (Уоллес)","Сфинкс (По; Бальмонт)","Овальный портрет (По; Бальмонт)","Бочка амонтильядо (По; Бальмонт)"]},
  {id:'scifi',t:'Русская фантастика',ic:'sparkles',pages:["Гиперболоид инженера Гарина (Толстой)","Властелин мира (Беляев)","Борьба в эфире (Беляев)","Остров погибших кораблей (Беляев)","Голова профессора Доуэля (Беляев)","Красная звезда (Богданов)","4338-й год (Одоевский)","Республика Южного Креста (Брюсов)","Жидкое солнце (Куприн)","На Луне (Циолковский)","Вне Земли (Циолковский)","Звезда КЭЦ (Беляев)","Чудесное око (Беляев)","Последний человек из Атлантиды (Беляев)","Лаборатория Дубльвэ (Беляев)","Человек, потерявший лицо (Беляев)","Человек, нашедший свое лицо (Беляев)","Подводные земледельцы (Беляев)","Небесный гость (Беляев)","Вечный хлеб (Беляев)","Воздушный корабль (Беляев)","Изобретения профессора Вагнера (Беляев)","Ни жизнь, ни смерть (Беляев)","Хойти-Тойти (Беляев)","Невидимый свет (Беляев)","Белый дикарь (Беляев)","Анатомический жених (Беляев)","Мёртвая голова (Беляев)","Слепой полёт (Беляев)","Человек, который не спит (Александр Беляев)","Инженер Мэнни (Богданов)","Грёзы о Земле и небе (Циолковский)","Союз пяти (Толстой)","Пятый Интернационал (Маяковский)","Сильфида (Одоевский)","Косморама (Одоевский)","Живой мертвец (Одоевский)","Восстание машин (Брюсов)","Мятеж машин (Брюсов)","В подземной тюрьме (Брюсов)","Последние мученики (Брюсов)","Летающие острова (Чехов)","Тост (Куприн)","Звезда Соломона (Куприн)","Река жизни (Куприн)","Путешествие в землю Офирскую (Щербатов)","Утопия (Мор; Малеин)","Мы (Замятин)","Роковые яйца (Булгаков)","Дьяволиада (Булгаков)","Прыжок в ничто (Беляев)","Продавец воздуха (Беляев)","Ариэль (Беляев)","Борьба миров (Уэллс; 1945)","Сон Попова (А. К. Толстой)","Вечер в 2217 году (Федоров)","Через тысячу лет (Никольский)","Под небом Арктики (Беляев)","Идеофон (Беляев)","Мёртвая зона (Беляев)","Необычайные приключения профессора Небывалова (Беляев)","Пропавший остров (Беляев)","Подземный город (Беляев)","Сильнее бога (Беляев)","Солнечные лошади (Беляев)","Охота на Большую Медведицу (Беляев)","Рекордный полет (Беляев)","Гость из книжного шкафа (Беляев)","Замок ведьм (Беляев)","Путешественник в мировые пространства (Циолковский)","Живые существа в Космосе (Циолковский)","Будущее Земли и человечества (Циолковский)","Праздник бессмертия (Богданов)","Микроруки (Житков)","На другой планете (Инфантьев)","Повесть о мамонте и ледниковом человеке (Драверт)","Правдоподобные небылицы, или Странствование по свету в двадцать девятом веке (Булгарин)","Пылающие бездны (Муханов)","В киргизских степях (Беляев)","Гора Звезды (Брюсов)","Город без имени (Одоевский)","Блистающий мир (Грин)","Голубые города (Толстой)","Синяя звезда (Куприн)","Невероятные небылицы или Путешествие к средоточию Земли (Булгарин)","Антар (Сенковский)","Воздушный змей (Беляев)","Земля (Брюсов)","Привидение (Одоевский)","Золотая цепь (Грин)","Граф Калиостро (Толстой)","Дух века (Куприн)","Большой выход у Сатаны (Сенковский)","Заочный инженер (Беляев)","Семь земных соблазнов (Брюсов)","Саламандра (Одоевский)","Бегущая по волнам (Грин)","Учёное путешествие на Медвежий остров (Сенковский)","На воздушных столбах (Беляев)","Остров Рено (Грин)","Превращение голов в книги и книг в головы (Сенковский)","Необычайные происшествия (Беляев)","Крысолов (Грин)","Пики (Беляев)","Серый автомобиль (Грин)","Рами (Беляев)","Страх (Беляев)","Чертово болото (Беляев)","Шторм (Беляев)","Амба (Беляев)","В трубе (Беляев)","Верхом на ветре (Беляев)","Веселый Таи (Беляев)","Встреча Нового 1954 года (Беляев)","ВЦБИД (Беляев)","Город Победителя (Беляев)","Держи на запад! (Беляев)","Дорогой Чандана (Беляев)","Земля горит (Беляев)","Золотая гора (Беляев)","Инстинкт предков (Беляев)","Каменное сердце (Беляев)","Ковёр-самолёт (Беляев)","Когда погаснет свет (Беляев)","Легко ли быть раком? (Беляев)","Мистер Смех (Беляев)","Над бездной (Беляев)","Нетленный мир (Беляев)","Освобожденные рабы (Беляев)","Отворотное средство (Беляев)","Рогатый мамонт (Беляев)","Светопреставление (Беляев)","Сезам, откройся!!! (Беляев)","Творимые легенды и апокрифы (Беляев)","Чёртова мельница (Беляев)"]},
  {id:'gut',t:'Популярное на Гутенберге',ic:'flame',src:'gutenberg'},
  {id:'se',t:'Standard Ebooks: по-английски',ic:'languages',src:'se'},
  {id:'ia',t:'Старые издания из Интернет-архива',ic:'archive',src:'ia',sub:'сканы книг до 1930 года'}];
/* authors for the suggestions under the search field; the Latin spelling is how Gutenberg writes them; the third name is the Wikisource author page
   («Автор:…», checked live 19.10 for Пушкин, Чехов, Гомер, Шекспир, Жюль Верн, Андерсен, Толстой; the rest fall back to a search) */
const ADV_AUTHORS=[['Пушкин','Pushkin','Александр Сергеевич Пушкин'],['Лермонтов','Lermontov','Михаил Юрьевич Лермонтов'],['Гоголь','Gogol','Николай Васильевич Гоголь'],['Тургенев','Turgenev','Иван Сергеевич Тургенев'],['Достоевский','Dostoyevsky','Фёдор Михайлович Достоевский'],['Толстой','Tolstoy','Лев Николаевич Толстой'],
  ['Чехов','Chekhov','Антон Павлович Чехов'],['Гончаров','Goncharov','Иван Александрович Гончаров'],['Островский','Ostrovsky','Александр Николаевич Островский'],['Грибоедов','Griboyedov','Александр Сергеевич Грибоедов'],['Крылов','Krylov','Иван Андреевич Крылов'],['Карамзин','Karamzin','Николай Михайлович Карамзин'],['Горький','Gorky'],['Куприн','Kuprin','Александр Иванович Куприн'],['Бунин','Bunin'],
  ['Гомер','Homer'],['Софокл','Sophocles'],['Эсхил','Aeschylus'],['Еврипид','Euripides'],['Аристофан','Aristophanes'],['Платон','Plato'],['Вергилий','Virgil'],['Овидий','Ovid'],
  ['Данте','Dante','Данте Алигьери'],['Шекспир','Shakespeare','Уильям Шекспир'],['Сервантес','Cervantes','Мигель де Сервантес Сааведра'],['Гёте','Goethe','Иоганн Вольфганг фон Гёте'],['Шиллер','Schiller'],['Байрон','Byron'],['Диккенс','Dickens','Чарльз Диккенс'],['Остин','Austen'],['Бронте','Bronte'],
  ['Жюль Верн','Verne','Жюль Верн'],['Дюма','Dumas'],['Гюго','Hugo'],['Бальзак','Balzac'],['Флобер','Flaubert'],['Мопассан','Maupassant'],['Стендаль','Stendhal'],['Вольтер','Voltaire'],
  ['Марк Твен','Twain'],['Эдгар По','Poe'],['Джек Лондон','London'],['Купер','Cooper'],['Конан Дойл','Doyle'],['Стивенсон','Stevenson'],['Киплинг','Kipling'],['Уайльд','Wilde'],
  ['Свифт','Swift'],['Дефо','Defoe'],['Вальтер Скотт','Scott'],['Уэллс','Wells'],['Кэрролл','Carroll'],['Андерсен','Andersen','Ганс Христиан Андерсен'],['Братья Гримм','Grimm'],['Эзоп','Aesop']];

function advOnShelf(sid){return (S.userBooks||[]).find(function(b){return b&&b.srcId===sid;})||null;}
function advDone(sid){const b=advOnShelf(sid);return !!(b&&(S.finished||[]).indexOf(b.id)>=0);}
/* a collection is read when every book of it is on the shelf and finished (S.finished, the 70 % rule); nothing is stored */
function advSetProg(x){return x&&x.pages?x.pages.filter(function(p){return advDone(advWsItem(p).sid);}).length:0;}
function advSetsDone(){return ADV_SETS.filter(function(x){return x.pages&&x.pages.length&&advSetProg(x)===x.pages.length;}).length;}
function advBar(n,m){return '<span class="advbar"><i style="width:'+Math.round(n*100/Math.max(1,m))+'%"></i></span>';}
/* Wikisource answers 429 when a long book is fetched page by page: wait and retry instead of failing the whole download */
async function advJson(url){
  for(let i=0;;i++){
    let r;try{r=await fetch(url,{cache:'no-store'});}
    catch(e){if(i<2&&navigator.onLine!==false){await new Promise(function(f){setTimeout(f,1500*(i+1));});continue;}throw e;} /* a dropped connection on a long download: two more tries */
    if(r.ok)return r.json();
    if((r.status===429||r.status===503)&&i<4){await new Promise(function(f){setTimeout(f,(+r.headers.get('Retry-After')||0)*1000||800*(i+1)*(i+1));});continue;}
    throw new Error('HTTP '+r.status);}}
async function advXml(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return new DOMParser().parseFromString(await r.text(),'application/xml');}
function advNetErr(e){return navigator.onLine===false?'Нет сети. Каталог открывается только с интернетом, скачанные книги читаются без него':'Библиотека не ответила. Попробуйте ещё раз';}

/* «gecrby» typed with the English layout → «пушкин»; Cyrillic for Gutenberg → its Latin spelling («Достоевский» → «Dostoyevsky») */
const ADV_KB_EN="qwertyuiop[]asdfghjkl;'zxcvbnm,.`",ADV_KB_RU='йцукенгшщзхъфывапролджэячсмитьбюё';
function advLayout(s){return String(s).toLowerCase().replace(/./g,function(c){const i=ADV_KB_EN.indexOf(c);return i<0?c:ADV_KB_RU[i];});}
function advIsLayout(s){return /[a-z]/i.test(s)&&!/[а-яё]/i.test(s)&&advLayout(s)!==s.toLowerCase()&&/^[a-z\s\[\];',.`]+$/i.test(s);}
const ADV_TR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
function advLatin(s){
  const low=String(s).trim().toLowerCase(),a=ADV_AUTHORS.find(function(x){return x[0].toLowerCase()===low;});if(a)return a[1];
  return low.split(/\s+/).map(function(w){const k=ADV_AUTHORS.find(function(x){return x[0].toLowerCase()===w;});if(k)return k[1];
    return w.replace(/[а-яё]/g,function(c){return ADV_TR[c];}).replace(/iy$/,'y');}).join(' ');}
/* «Leo Tolstoy» (Gutenberg) → «Толстой», when the author is one we know */
function advRuAuthor(lat){const w=String(lat||'').toLowerCase().split(/[\s,]+/).filter(Boolean);
  const a=ADV_AUTHORS.find(function(x){return w.indexOf(x[1].toLowerCase())>=0||w.indexOf(x[0].split(' ').pop().toLowerCase())>=0;});return a?a[0]:'';} /* «Пушкин, Александр Сергеевич» (Internet Archive) too */
function advAuthorHits(q){const l=q.toLowerCase(),r=advLayout(q);
  return ADV_AUTHORS.filter(function(x){const ru=x[0].toLowerCase(),la=x[1].toLowerCase();
    return [l,r].some(function(v){return v.length>=2&&(ru.indexOf(v)===0||ru.split(' ').pop().indexOf(v)===0||la.indexOf(v)===0);});}).slice(0,3);}
/* reading time before the download: ~2400 bytes of Russian UTF-8 a minute (as js/path.js), ~1300 Russian letters, ~1500 Latin ones */
function advMins(n,perMin){return Math.max(1,Math.round(n/perMin));}
function advTime(m){
  if(m<60){if(m>10)m=Math.round(m/5)*5;return 'около '+m+' '+(m%10===1&&m%100!==11?'минуты':'минут');}
  const h=Math.round(m/60);return 'около '+h+' '+(h%10===1&&h%100!==11?'часа':'часов');}
function advParts(n){const k=n%10,c=n%100;return n+' '+(k===1&&c!==11?'часть':k>=2&&k<=4&&(c<12||c>14)?'части':'частей');}
function advPreview(t){t=String(t).replace(/\s+/g,' ').trim();if(t.length<=420)return t;const c=t.slice(0,420),i=c.lastIndexOf(' ');return (i>300?c.slice(0,i):c)+'…';}

/* ---------- Викитека ---------- */
/* «Гамлет (Шекспир; Кронеберг)» → title «Гамлет», author «Шекспир», translator «Кронеберг» */
function advWsName(page){const root=String(page).split('/')[0],m=root.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if(!m)return {t:root,a:'',tr:''};const p=m[2].split(';').map(function(s){return s.trim();});return {t:m[1],a:p[0]||'',tr:p[1]&&!/^\d{4}$/.test(p[1])?p[1]:''};} /* «Пёстрая лента (Дойль; 1896)»: a year of the edition, not a translator */
/* categories come as {title:'Категория:PD-old-70'} from action=query and as {category:'PD-old-70'} from action=parse */
function advWords(q){return String(q||'').trim().split(/\s+/).filter(Boolean).length;}
/* kind and size for the filters: one batch request for the found pages (and the chapter the search hit), arch.md 19.10 — nothing stored */
function advKind(cats){const s=cats.join('|');return /драматург|пьес|комеди|трагеди|водевил/i.test(s)?'drama':/поэзи|стихотворени|басни|поэм|баллад/i.test(s)?'poem':/проза|повест|рассказ|роман|очерк|сказк/i.test(s)?'prose':'';}
async function advWsMeta(items){
  const want=[];items.forEach(function(it){[it.page,it.hit].forEach(function(t){if(t&&want.indexOf(t)<0)want.push(t);});});
  const got={};
  for(let i=0;i<want.length;i+=50){
    const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&prop=categories|info&cllimit=max&titles='+encodeURIComponent(want.slice(i,i+50).join('|')));
    ((d.query&&d.query.pages)||[]).forEach(function(p){if(!p.missing)got[p.title]={cats:(p.categories||[]).map(advWsCat),len:p.length||0};});}
  items.forEach(function(it){const r=got[it.page],h=it.hit&&got[it.hit];if(!r&&!h)return;
    it.kind=advKind((r?r.cats:[]).concat(h?h.cats:[]));
    if(!r||/^Списки редакций$/m.test(r.cats.join('\n')))return;
    it.size=r.len<6000&&it.kind!=='poem'?'long':r.len<120000?'short':'long';}); /* a few KB of a prose book is its table of contents: a long book in parts */
}
function advFilter(it){return (!ADV.fk||it.kind===ADV.fk)&&(!ADV.fl||it.size===ADV.fl);}
/* the found line from the search snippet: matches in bold, everything else escaped */
function advSnip(h){return esc(decodeEntities(String(h||'').replace(/<span class="searchmatch">([\s\S]*?)<\/span>/g,'\u0001$1\u0002').replace(/<[^>]+>/g,''))).replace(/\u0001/g,'<em>').replace(/\u0002/g,'</em>').replace(/^[«»"\s]+|[«»"\s]+$/g,'');}
function advWsCat(c){return String(c&&(c.title||c.category)||c||'').replace(/^Категория:/,'').replace(/_/g,' ');}
function advWsFree(cats){return (cats||[]).some(function(c){return /^PD[- ]|^CC[- ]|^GFDL|Общественное достояние|Свободн/i.test(advWsCat(c));});}
/* Wikisource keeps only free texts and marks the doubtful ones; many old poems carry no licence template at all */
function advWsBad(cats){return (cats||[]).some(function(c){return /нарушени|копивио|copyvio|к удалению|удаляем|несвобод|не свобод|авторск/i.test(advWsCat(c));});}
/* a list of editions or translations, a disambiguation page, a service list, an author page: not a book, the reader picks one of its links */
function advWsList(cats,props){return !!(props&&props.disambiguation!==undefined)||(cats||[]).some(function(c){return /^Списки |Служебные списки|Неоднозначн|Многозначн|^Авторы|^Персоналии/i.test(advWsCat(c));});}
function advWsItem(page){const n=advWsName(page);return {sid:'wikisource:'+page,page:page,t:n.t,a:n.a,tr:n.tr,lang:'ru'};}
function advWsOld(sub){return /(^|\/|\(|\s)ДО(\)|\/|$|\s)/.test(sub);} /* «/ДО», «(ДО)» = pre-1918 spelling: the modern one is preferred */
const ADV_SRC={
  /* Джессика 19.10: one search over both libraries; Russian translations first, the Gutenberg part in Latin and in every language */
  all:{t:'Везде',kind:'meta',
    async search(q,more){
      const m=more||{w:0,g:null,s:null,a:null,first:true},gq=/[а-яё]/i.test(q)?advLatin(q):q;
      const none={items:[],more:null},safe=function(p){return p.catch(function(e){console.warn('[rq] adv all',e);return {items:[],more:null,err:e};});};
      const r=await Promise.all([m.first||m.w?safe(ADV_SRC.wikisource.search(q,m.w||0)):none,m.first||m.g?safe(ADV_SRC.gutenberg.search(gq,m.g||null,'')):none,
        (m.first||m.s)&&gq.trim()?safe(ADV_SRC.se.search(gq,m.s||null)):none,
        (m.first||m.a)&&q.trim()?safe(ADV_SRC.ia.search(q,m.a||null,/[а-яё]/i.test(q)?'ru':'')):none]); /* the archive keeps Russian titles in Cyrillic */
      const w=r[0],g=r[1],se=r[2],ia=r[3];if(w.err&&g.err&&(se.err||!gq.trim())&&(ia.err||!q.trim()))throw w.err||ia.err;
      const ru={};w.items.forEach(function(x){if(x.a)ru[x.a.split(/\s+/).pop().toLowerCase()]=1;}); /* «(Толстой)», «(Лев Толстой)»: by surname */
      se.items.concat(g.items).forEach(function(x){const a=advRuAuthor(x.a);if(a&&ru[a.split(' ').pop().toLowerCase()])x.ru=1;});
      return {items:w.items.concat(se.items,g.items,ia.items),more:w.more||g.more||se.more||ia.more?{w:w.more,g:g.more,s:se.more,a:ia.more}:null};}},
  wikisource:{t:'Викитека',kind:'text',
    async search(q,more){
      const off=more&&typeof more==='object'?more.o:more||0,ph=more&&typeof more==='object'?more.p:advWords(q)>=4&&q.indexOf('"')<0; /* a remembered line: as a phrase first */
      const ask=function(v){return advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&list=search&srnamespace=0&srlimit=40&srprop=snippet&srsearch='+encodeURIComponent(v)+'&sroffset='+off);};
      let d=await ask(ph?'"'+q+'"':q),usedPh=ph;
      if(ph&&!off&&!((d.query&&d.query.search)||[]).length){d=await ask(q);usedPh=false;}
      const seen={},out=[];
      ((d.query&&d.query.search)||[]).forEach(function(h){const root=String(h.title).split('/')[0];if(seen[root])return;
        if(root!==h.title&&root.indexOf('(')<0)return; /* «ЭСБЕ/Гомер», «РБС/…»: an article of an encyclopedia or journal, not a book */
        seen[root]=1;
        out.push(Object.assign(advWsItem(root),{hit:String(h.title),snip:h.snippet||''}));});
      await advWsMeta(out).catch(function(e){console.warn('[rq] adv meta',e);});
      return {items:out,more:d.continue&&d.continue.sroffset?{o:d.continue.sroffset,p:usedPh}:null};},
    async info(it){
      const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=categories|info|pageprops&ppprop=disambiguation&cllimit=max&titles='+encodeURIComponent(it.page));
      const p=(d.query&&d.query.pages||[])[0]||{};
      if(p.missing)return {missing:true};
      const lic=advWsFree(p.categories),bad=advWsBad(p.categories);
      if(advWsList(p.categories,p.pageprops))return {list:await advWsLinks(p.title||it.page)};
      const peek=await advWsPeek(p.title||it.page).catch(function(e){console.warn('[rq] adv peek',e);return {};});
      return Object.assign({free:lic||!bad,lic:lic,size:p.length||0},peek);},
    rows(it,inf){return [['Источник','Викитека'],['Автор',it.a||'не указан'],it.tr?['Перевод',it.tr]:null,['Язык','русский'],
      inf.mins||inf.parts?['Объём',[inf.parts?advParts(inf.parts):'',inf.mins?advTime(inf.mins)+' чтения':''].filter(Boolean).join(' · ')]:null,
      ['Права',inf.lic?'Общественное достояние':inf.free?'Свободный текст Викитеки':'Викитека отметила, что права на текст под вопросом']];},
    note(inf){return inf.free?'Книга бесплатная. Скачивается один раз и дальше читается без интернета. Минуты, опыт и серия считаются как у любой книги.':
      'Скачать нельзя: так мы не берём книги, на которые ещё может действовать авторское право.';},
    canGet(inf){return !!inf.free;},
    async get(it,prog){return advWsBook(it,prog);}},
  gutenberg:{t:'Гутенберг',kind:'text',
    async search(q,more,lng){
      const L=lng===undefined?ADV.lang:lng,qs=(q?q:'')+(L?(q?' ':'')+'l.'+L:'');
      const x=await advXml(more||(ADV_GUT+'/ebooks/search.opds/?sort_order=downloads&query='+encodeURIComponent(qs)));
      const out=[];
      Array.from(x.getElementsByTagName('entry')).forEach(function(e){
        const id=(e.getElementsByTagName('id')[0]||{}).textContent||'',m=id.match(/\/ebooks\/(\d+)\.opds/);if(!m)return;
        let t=((e.getElementsByTagName('title')[0]||{}).textContent||'').trim();
        if(L)t=t.replace(/\s*\([A-Z][a-z]+\)$/,''); /* «Детство (Russian)»: the language is already the filter */
        const a=((e.getElementsByTagName('content')[0]||{}).textContent||'').trim().replace(/^(graf|count|sir|baron)\s+/i,''); /* «graf Leo Tolstoy» */
        out.push({sid:'gutenberg:'+m[1],n:m[1],t:t,a:a,lang:L||'',cover:ADV_GUT+'/cache/epub/'+m[1]+'/pg'+m[1]+'.cover.small.jpg'});});
      const nx=Array.from(x.getElementsByTagName('link')).find(function(l){return l.getAttribute('rel')==='next';});
      return {items:out,more:nx?new URL(nx.getAttribute('href'),ADV_GUT).href:null};},
    async info(it){
      const x=await advXml(ADV_GUT+'/ebooks/'+it.n+'.opds');
      const e=x.getElementsByTagName('entry')[0];if(!e)return {missing:true};
      const ps=Array.from(e.getElementsByTagName('p')).map(function(p){return p.textContent.replace(/\s+/g,' ').trim();});
      const field=function(k){const p=ps.find(function(s){return s.indexOf(k+':')===0;});return p?p.slice(k.length+1).trim():'';};
      const lang=((e.getElementsByTagNameNS('http://purl.org/dc/terms/','language')[0]||{}).textContent||it.lang||'').trim();
      const an=((e.getElementsByTagName('author')[0]||{}).textContent||'').trim();
      const links=Array.from(e.getElementsByTagName('link')),epub=links.find(function(l){return l.getAttribute('type')==='application/epub+zip';});
      /* the catalogue gives no text size, only the files' sizes: the plain text is taken as ~1.3 × the no-images EPUB (a rough estimate) */
      const ep=links.find(function(l){return l.getAttribute('type')==='application/epub+zip'&&/\.noimages$/.test(l.getAttribute('href')||'')&&+l.getAttribute('length');});
      return {lang:lang,author:advGutAuthor(an)||it.a,downloads:field('Downloads'),rights:field('Rights'),summary:field('Summary').replace(/\s*\(This is an automatically generated summary\.\)$/,''),
        epub:epub?epub.getAttribute('href'):ADV_GUT+'/ebooks/'+it.n+'.epub.noimages',size:epub?Number(epub.getAttribute('length'))||0:0,
        mins:ep?advMins(+ep.getAttribute('length')*1.3,lang==='ru'?2400:1500):0};},
    rows(it,inf){return [['Источник','Project Gutenberg'],['Автор',inf.author||it.a||'не указан'],['Язык',advLangName(inf.lang)],
      inf.mins?['Объём',advTime(inf.mins)+' чтения']:null,inf.downloads?['Скачиваний за месяц',inf.downloads]:null,['Права','Общественное достояние в США']];},
    note(inf){return 'Книга бесплатная. Скачивается один раз и дальше читается без интернета. Минуты, опыт и серия считаются как у любой книги.';},
    canGet(){return true;},
    async get(it,prog,inf){return advGutBook(it,prog,inf);}},
  /* Standard Ebooks (Джессика 19.10): its catalogue pages, book pages and EPUB files send Access-Control-Allow-Origin: * (checked 19.10 from GitHub Actions); English only */
  se:{t:'Standard Ebooks',kind:'text',
    async search(q,more){
      const u=more||(ADV_SE+'/ebooks?view=list&per-page=24'+(q.trim()?'&query='+encodeURIComponent(q.trim()):'&sort=popularity'));
      const d=await advHtml(u),out=[];
      d.querySelectorAll('ol.ebooks-list > li[about]').forEach(function(li){
        const path=li.getAttribute('about')||'';if(!/^\/ebooks\/[^/]+\/[^/]+/.test(path))return;
        const nm=li.querySelector('[property="schema:name"]'),au=Array.from(li.querySelectorAll('.author a')).map(function(a){return a.textContent.trim();}).filter(Boolean).join(', ');
        const img=li.querySelector('img'),w=((li.querySelector('.details p')||{}).textContent||'').match(/([\d,]+)\s+words/);
        out.push({sid:'se:'+path.slice(8),se:path,t:nm?nm.textContent.trim():path.split('/')[3],a:au,lang:'en',words:w?+w[1].replace(/,/g,''):0,cover:img&&img.getAttribute('src')?new URL(img.getAttribute('src'),ADV_SE).href:''});});
      const nx=d.querySelector('a[rel="next"]');
      return {items:out,more:nx&&nx.getAttribute('href')?new URL(nx.getAttribute('href'),ADV_SE).href:null};},
    async info(it){
      const d=await advHtml(ADV_SE+(it.se||'/ebooks/'+it.sid.slice(3)));
      const h1=d.querySelector('h1[property="schema:name"]');if(!h1)return {missing:true};
      const wc=d.querySelector('meta[property="schema:wordCount"]'),words=wc?+wc.getAttribute('content'):it.words||0;
      const ds=d.querySelector('[property="schema:description"]'),lm=d.querySelector('meta[property="schema:inLanguage"]'),lang=(lm&&lm.getAttribute('content'))||'en';
      const ep=Array.from(d.querySelectorAll('a[property="schema:contentUrl"]')).map(function(a){return a.getAttribute('href')||'';}).find(function(h){return /\.epub$/.test(h)&&!/advanced|kepub/.test(h);});
      const au=Array.from(d.querySelectorAll('[property="schema:author"] > [property="schema:name"]')).map(function(x){return x.textContent.trim();}).join(', ');
      return {lang:lang.split('-')[0],author:au||it.a,summary:ds?ds.textContent.replace(/\s+/g,' ').trim().slice(0,600):'',words:words,mins:words?Math.max(1,Math.round(words/250)):0,
        epub:ep?new URL(ep,ADV_SE).href+'?source=download':''};},
    rows(it,inf){return [['Источник','Standard Ebooks'],['Автор',inf.author||it.a||'не указан'],['Язык',advLangName(inf.lang)],inf.mins?['Объём',advTime(inf.mins)+' чтения']:null,['Права','Общественное достояние']];},
    note(inf){return 'Книга бесплатная, на английском, в аккуратной вёрстке Standard Ebooks. Скачивается один раз и дальше читается без интернета.';},
    canGet(inf){return !!inf.epub;},
    async get(it,prog,inf){
      prog('Скачиваю…');const r=await fetch(inf.epub,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
      const blob=await r.blob();prog('Распаковываю…');
      const p=await parseEpub(new File([blob],it.sid.slice(3).replace(/\//g,'_')+'.epub',{type:'application/epub+zip'}),{images:false}); /* 28.10: Standard Ebooks pictures are not kept */
      return {title:p.title||it.t,author:inf.author||p.author||it.a,text:p.text,toc:p.toc,lang:inf.lang||'en'};}},
  /* Internet Archive (Джессика 21.10, «Только свободные»): advancedsearch and /metadata send Access-Control-Allow-Origin: *, and so does the recognised
     text of a scan (_djvu.txt); its EPUB files do not (checked 21.10 from GitHub Actions). Only items marked public domain or published before 1930,
     not lending-library, with a text file; the text comes from OCR, so the card says it may have misprints */
  ia:{t:'Интернет-архив',kind:'text',
    async search(q,more,lng){
      const L=lng===undefined?ADV.lang:lng,page=more||1,w=advIaTerms(q);if(!w)return {items:[],more:null};
      const qs=['(title:('+w+') OR creator:('+w+'))','mediatype:texts','format:DjVuTXT',ADV_IA_FREE,ADV_IA_NOT];
      if(L&&ADV_IA_LANG[L])qs.push('language:('+ADV_IA_LANG[L]+')');
      const d=await advJson(ADV_IA+'/advancedsearch.php?q='+encodeURIComponent(qs.join(' AND '))+'&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&fl[]=year&fl[]=language&rows=30&page='+page+'&sort[]=downloads+desc&output=json');
      const r=d.response||{},out=[];
      (r.docs||[]).forEach(function(x){if(!x.identifier||!x.title)return;
        const y=advIaYear(x);
        out.push({sid:'ia:'+x.identifier,ia:x.identifier,t:advModernIf(String(x.title).trim()),old:advHasOld(x.title)||undefined,a:advIaAuthor(x.creator),lang:advIaLang(x.language),y:y||undefined,cover:ADV_IA+'/services/img/'+encodeURIComponent(x.identifier)});});
      return {items:out,more:page*30<(r.numFound||0)?page+1:null};},
    async info(it){
      const ref=advIaRef(it);it.ia=ref.id;if(ref.f)it.f=ref.f; /* a card from «Хочу прочитать» keeps only the sid */
      const m=await advIaMeta(it.ia);if(!m||!m.metadata)return {missing:true};
      const md=m.metadata,y=advIaYear(md),lic=/publicdomain/i.test(String(md.licenseurl||''))||String(md['possible-copyright-status']||'')==='NOT_IN_COPYRIGHT',lend=advIaArr(md.collection).some(function(c){return ADV_IA_LEND.indexOf(c)>=0;});
      const restricted=String(md['access-restricted-item']||'')==='true'||lend;
      const txt=(m.files||[]).filter(function(f){return f.format==='DjVuTXT'&&f.name&&f.private!=='true';});
      /* «… - OCR_djvu.txt» next to «…_djvu.txt» is the same volume recognised twice: one of them */
      const seen={},files=txt.filter(function(f){const k=f.name.replace(/(\s*-\s*OCR)?_djvu\.txt$/i,'');if(seen[k])return false;seen[k]=1;return true;});
      if(!it.f&&files.length>1)return {list:files.slice(0,200).map(function(f){return Object.assign({},it,{sid:'ia:'+it.ia+'/'+f.name,f:f.name,ed:advIaVol(f.name)});})};
      const f=it.f?files.find(function(x){return x.name===it.f;}):files[0];
      const lang=advIaLang(md.language)||it.lang||'';
      const ds=String(md.description||'');
      return {free:(y?y<1930:lic)&&!restricted,lic:lic,year:y,lang:lang,author:advIaAuthor(md.creator)||it.a,file:f?f.name:'',size:f?+f.size||0:0,
        mins:f&&+f.size?advMins(+f.size,lang==='ru'?2400:1500):0,summary:ds?decodeEntities(ds.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim().slice(0,600):''};},
    rows(it,inf){return [['Источник','Internet Archive'],['Автор',inf.author||it.a||'не указан'],['Язык',advLangName(inf.lang)],inf.year?['Издание',inf.year+' год']:null,it.ed?['Том',it.ed]:null,
      inf.mins?['Объём',advTime(inf.mins)+' чтения']:null,['Права',inf.free?(inf.lic?'Общественное достояние':'Издано до 1930 года'):'Издано после 1929 года']];},
    note(inf){return inf.free?(inf.file?'Книга бесплатная. Текст распознан со скана, поэтому в нём бывают опечатки. Скачивается один раз и дальше читается без интернета.':'У этой книги в архиве нет текста, только скан.'):
      'Скачать нельзя: мы берём из архива только книги, отмеченные как общественное достояние или изданные до 1930 года.';},
    canGet(inf){return !!(inf.free&&inf.file);},
    async get(it,prog,inf){
      prog('Скачиваю…');const r=await fetch(ADV_IA+'/download/'+encodeURIComponent(it.ia)+'/'+inf.file.split('/').map(encodeURIComponent).join('/'),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const text=advIaClean(await r.text());if(text.length<2000)throw new Error('в этом скане почти нет текста, одни картинки');
      return {title:it.t+(it.ed?' · '+it.ed:''),author:inf.author||it.a||'Internet Archive',text:text,lang:inf.lang||undefined};}}
};
async function advHtml(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return new DOMParser().parseFromString(await r.text(),'text/html');}
/* Gutenberg and Standard Ebooks: English catalogues, searched in Latin letters and listed straight away */
function advLat(){return ADV.src==='gutenberg'||ADV.src==='se';}
/* catalogues searched only by title and author (no Wikisource titles in the suggestions): the English ones and Internet Archive */
function advByName(){return advLat()||ADV.src==='ia';}
function advSrcOf(it){return ADV_SRC[String(it&&it.sid||'').split(':')[0]];}
function advLangName(c){const m={ru:'русский',en:'английский',de:'немецкий',fr:'французский',es:'испанский',it:'итальянский',fi:'финский',nl:'нидерландский',pt:'португальский',la:'латынь',el:'греческий',zh:'китайский'};return m[c]||c||'не указан';}
function advGutAuthor(s){s=String(s||'').replace(/,?\s*\d{3,4}\??-\d{0,4}\??$/,'').trim();const p=s.split(/,\s*/).filter(function(x){return !/^(graf|count|sir|baron)$/i.test(x);});return p.length>=2?(p[1]+' '+p[0]):s;} /* «Austen, Jane» → «Jane Austen» */

/* ---------- старая орфография (Джессика 25.10, пункт 2) ----------
   Scans of the archive and some Wikisource texts are in the pre-1918 spelling («Война и миръ»). On download the text is brought to the modern one:
   ѣ і ѳ ѵ, the hard sign at the end of a word, «-аго/-яго», «-ыя», «ея/онѣ/однѣ», «без-/из-/раз-…» before a voiceless consonant. A rule set, not a
   dictionary: rare words can stay old (the reader sees an old form, never a broken one) */
const ADV_OLD_RE=/[ѣѢіІѳѲѵѴ]|[бвгджзклмнпрстфхцчшщБВГДЖЗКЛМНПРСТФХЦЧШЩ][ъЪ](?![а-яёА-ЯЁ])/g;
function advOldSpell(t){const s=String(t||'').slice(0,200000),n=(s.match(ADV_OLD_RE)||[]).length,w=(s.match(/[а-яёѣі]+/gi)||[]).length;return n>=3&&n>=w*0.02;}
function advHasOld(s){return new RegExp(ADV_OLD_RE.source).test(String(s||''));}
function advModernIf(s){return advHasOld(s)?advModern(s):s;}
/* the text and its table of contents together: chapter offsets move with the shorter words, so each chapter is converted on its own */
function advModernBook(r){
  const toc=(r.toc||[]).filter(function(x){return typeof x.off==='number';}).sort(function(a,b){return a.off-b.off;}),cuts=[0].concat(toc.map(function(x){return x.off;}),[r.text.length]);
  let out='';const at=[];
  for(let i=0;i+1<cuts.length;i++){at.push(out.length);out+=advModern(r.text.slice(cuts[i],cuts[i+1]));}
  toc.forEach(function(x,i){x.off=at[i+1];x.t=advModern(x.t||'');});
  r.text=out;r.title=advModernIf(r.title||'');r.author=advModernIf(r.author||'');r.modern=true;
}
const ADV_OLD_KEEP={благо:1,наго:1,драго:1,мого:1};
function advModern(t){
  const C='бвгджзклмнпрстфхцчшщ',up=function(src,dst){return src===src.toUpperCase()&&src!==src.toLowerCase()?dst.toUpperCase():src[0]===src[0].toUpperCase()?dst[0].toUpperCase()+dst.slice(1):dst;};
  t=String(t).replace(/ѣ/g,'е').replace(/Ѣ/g,'Е').replace(/і/g,'и').replace(/І/g,'И').replace(/ѳ/g,'ф').replace(/Ѳ/g,'Ф').replace(/ѵ/g,'и').replace(/Ѵ/g,'И');
  t=t.replace(new RegExp('(['+C+C.toUpperCase()+'])[ъЪ](?![а-яёА-ЯЁ])','g'),'$1');
  return t.replace(/[а-яёА-ЯЁ]+/g,function(w){
    const l=w.toLowerCase();let r=l;
    if(l==='ея')r='её';else if(l==='нея')r='неё';else if(l==='оне')r='они';
    else if(/^одне(х|м|ми)?$/.test(l))r=l.replace(/^одне/,'одни');
    else{
      if(l.length>=5&&!ADV_OLD_KEEP[l]){r=r.replace(/аго$/,'ого').replace(/([бвгджзклмнпрстфхцчшщ])яго$/,'$1его');}
      if(l.length>=5)r=r.replace(/([^и])ыя$/,'$1ые');
      r=r.replace(/^(без|из|раз|роз|воз|чрез|через)(?=[кпстфхцчшщ])/,function(p){return p.slice(0,-1)+'с';});
    }
    return r===l?w:up(w,r);});
}
/* ---------- Internet Archive ---------- */
const ADV_IA='https://archive.org';
const ADV_IA_LANG={ru:'rus OR Russian',en:'eng OR English',de:'ger OR German',fr:'fre OR French'};
/* published before 1930, or marked public domain when the archive knows no year (an uploader's mark on a 1991 book is not enough) */
const ADV_IA_FREE='(date:[1000-01-01 TO 1929-12-31] OR year:[1000 TO 1929] OR (licenseurl:*publicdomain* AND NOT date:[1930-01-01 TO 2100-12-31] AND NOT year:[1930 TO 2100]))';
const ADV_IA_LEND=['inlibrary','printdisabled','lendinglibrary','internetarchivebooks'];
const ADV_IA_NOT='NOT collection:('+ADV_IA_LEND.join(' OR ')+') NOT access-restricted-item:true';
/* «ia:<identifier>» or «ia:<identifier>/<file>» (one volume of an item with several text files); identifiers have no «/» */
function advIaRef(it){const r=String(it.sid||'').slice(3),i=r.indexOf('/');return i<0?{id:it.ia||r,f:it.f||''}:{id:r.slice(0,i),f:r.slice(i+1)};}
function advIaArr(v){return Array.isArray(v)?v:v==null?[]:[v];}
/* words of the query for title:/creator:, Lucene's own characters dropped */
function advIaTerms(q){const w=String(q||'').replace(/[+\-&|!(){}\[\]^"~*?:\\\/]/g,' ').split(/\s+/).filter(Boolean).slice(0,8);return w.length?'('+w.join(' AND ')+')':'';}
function advIaYear(x){const v=x.year||String(advIaArr(x.date)[0]||'').slice(0,4);const y=parseInt(v,10);return y>0&&y<3000?y:0;}
/* «Пушкин, Александр Сергеевич, 1799-1837» → «Александр Сергеевич Пушкин»; an illustrator after the author is left out */
function advIaAuthor(c){const ps=String(advIaArr(c)[0]||'').split(/\s*;\s*/),cy=ps.find(function(x){return /[а-яё]/i.test(x);}); /* «Leo Tolstoy (1828-1910); Толстой, Лев Николаевич (1828-1910)» */
  const a=String(cy||ps[0]||'').replace(/\s*\([^()]*\)\s*/g,' ').replace(/,?\s*\d{3,4}\??-\d{0,4}\??\s*$/,'').trim();return /^BMK BRZ$/i.test(a)?'':advGutAuthor(a);}
function advIaLang(l){const v=String(advIaArr(l)[0]||'').toLowerCase();return /^(rus|russian)/.test(v)?'ru':/^(eng|english)/.test(v)?'en':/^(ger|deu|german)/.test(v)?'de':/^(fre|fra|french)/.test(v)?'fr':/^(lat|latin)/.test(v)?'la':v.slice(0,2);}
/* «Деятели …, том 1.1 (От конца XVIII в.)_djvu.txt» → «том 1.1 (От конца XVIII в.)» when the volumes share the start, else the whole name */
function advIaVol(n){n=String(n).replace(/(\s*-\s*OCR)?_djvu\.txt$/i,'');const m=n.match(/(?:,\s*|\s)((?:том|т\.|вып\.?|выпуск|часть|ч\.|книга|кн\.|vol\.?|volume|part|№)\s*\S.*)$/i);return m?m[1]:n;}
const advIaCache=new Map();
function advIaMeta(id){if(advIaCache.has(id))return advIaCache.get(id);
  const p=advJson(ADV_IA+'/metadata/'+encodeURIComponent(id));advIaCache.set(id,p);p.catch(function(){advIaCache.delete(id);});
  if(advIaCache.size>20)advIaCache.delete(advIaCache.keys().next().value);return p;}
/* OCR text of a scan: lines are cut where the page line ended and words broken with «¬» or «-»; paragraphs are blank-line separated.
   Prose lines join into one paragraph; a block of short lines (verse, a list) keeps its line breaks. Bare page numbers go */
function advIaNoise(b){const ch=b.replace(/\s+/g,''),lt=(ch.match(/[\p{L}]/gu)||[]).length,ws=b.split(/\s+/).filter(Boolean);
  if(!ch.length)return true;if(lt<ch.length*0.6)return true;
  const words=ws.filter(function(w){return (w.match(/[\p{L}]/gu)||[]).length>=3;}).length;return ws.length>=3&&words<ws.length*0.4;}
function advIaClean(t){
  t=String(t).replace(/^﻿/,'').replace(/\r\n?/g,'\n').replace(/\f/g,'\n\n').replace(/[ \t ]+\n/g,'\n').replace(/[ \t]{2,}/g,' ');
  return t.split(/\n\s*\n+/).map(function(b){
    const ls=b.split('\n').map(function(l){return l.trim();}).filter(Boolean);
    if(!ls.length||(ls.length===1&&/^[\divxlcm\s.\-—–]{1,8}$/i.test(ls[0])))return '';
    if(advIaNoise(ls.join(' ')))return ''; /* a picture or an ornament read as letters */
    if(ls.length===1&&/\s\d{1,4}$|^\d{1,4}\s/.test(ls[0])&&ls[0].split(/\s+/).length<=9&&!/[.!?…»"]\s*\d+$/.test(ls[0]))return ''; /* the running head with the page number */
    const long=ls.filter(function(l){return l.length>=45;}).length;
    if(ls.length>1&&long<ls.length/2)return ls.join('\n');
    return ls.reduce(function(a,l){if(!a)return l;
      if(/[¬]$/.test(a))return a.slice(0,-1)+l;
      if(/[a-zа-яё]-$/i.test(a)&&/^[a-zа-яё]/.test(l))return a.slice(0,-1)+l;
      return a+' '+l;},'').replace(/ ([,.;:!?])(?=\s|$)/g,'$1');}).filter(Boolean).reduce(function(out,b){
    /* a paragraph cut by the page end goes on in lower case on the next page */
    const p=out.length?out[out.length-1]:'';
    if(p&&p.indexOf('\n')<0&&b.indexOf('\n')<0&&/[\p{L},;¬-]$/u.test(p)&&/^[a-zа-яё]/.test(b))out[out.length-1]=/[¬]$|[a-zа-яё]-$/i.test(p)?p.slice(0,-1)+b:p+' '+b;
    else out.push(b);return out;},[]).join('\n\n');
}

/* page text: the header, licence, page numbers, notes and pictures go; paragraphs are blank-line separated (reader splits on \n\n) */
function advWsDoc(html){return new DOMParser().parseFromString('<div id="advroot">'+html+'</div>','text/html');}
function advWsText(doc){
  const root=doc.getElementById('advroot');
  root.querySelectorAll('.ws-noexport,#headertemplate,.headertemplate,.header_notes,.licenseContainer,.ws-license,.navbox,.metadata,.noprint,.mw-editsection,sup.reference,.reference,.references,.mw-references-wrap,.pagenum,.ws-pagenum,style,script,img,figure,.thumb,.mw-empty-elt,[style*="visibility:hidden"],[style*="display:none"]').forEach(function(n){n.remove();});
  return htmlToText(root.innerHTML);
}
function advWsSubs(doc,page){
  const pre=page+'/',out=[],seen={};
  doc.getElementById('advroot').querySelectorAll('a[title]').forEach(function(a){
    if(a.classList.contains('new')||a.closest('#headertemplate,.ws-noexport'))return;
    const t=a.getAttribute('title');if(t.indexOf(pre)!==0||seen[t])return;seen[t]=1;out.push(t);});
  const cur=out.filter(function(t){return !advWsOld(t.slice(pre.length));});
  return cur.length?cur:out;
}
/* the card's peek and the download that follows ask for the same pages: keep the last ones */
const advWsCache=new Map();
function advWsParse(page){
  if(advWsCache.has(page))return advWsCache.get(page);
  const pr=advWsParseNet(page);advWsCache.set(page,pr);pr.catch(function(){advWsCache.delete(page);});
  if(advWsCache.size>40)advWsCache.delete(advWsCache.keys().next().value);
  return pr;
}
/* the card shows the length and the opening lines: the page itself, or for a book in parts its first part times the number of parts */
async function advWsPeek(page){
  const p=await advWsParse(page),doc=advWsDoc(p.html),subs=advWsSubs(doc,p.title);
  if(!subs.length){const t=advWsText(doc);return t.length<200?{}:{mins:advMins(t.length,1300),preview:advPreview(t)};}
  const f=await advWsParse(subs[0]),d2=advWsDoc(f.html);
  if(advWsSubs(d2,f.title).length)return {parts:subs.length};
  const t=advWsText(d2);return {parts:subs.length,mins:advMins(t.length*subs.length,1300),preview:advPreview(t)};
}
async function advWsParseNet(page){
  const d=await advJson(ADV_WS+'?action=parse&format=json&formatversion=2&origin=*&redirects=1&prop=text|categories&page='+encodeURIComponent(page));
  if(d.error)throw new Error(d.error.info||d.error.code);
  return {html:d.parse.text||'',cats:d.parse.categories||[],title:d.parse.title||page};
}
/* the texts a list page links to, in page order: «Евгений Онегин (Пушкин)» → its editions, «Шекспир» → the works */
async function advWsLinks(page){
  const p=await advWsParse(page),doc=advWsDoc(p.html),out=[],seen={};
  doc.getElementById('advroot').querySelectorAll('a[title]').forEach(function(a){
    if(out.length>=60||a.classList.contains('new')||a.closest('#headertemplate,.ws-noexport,.navbox'))return;
    const href=a.getAttribute('href')||'',t=a.getAttribute('title');
    if(href.indexOf('/wiki/')!==0||/^[^:]+:/.test(t)&&!/^[^:]+: /.test(t)||t===p.title||seen[t])return;
    seen[t]=1;out.push(Object.assign(advWsItem(t),{ed:t.indexOf('/')>0?t.slice(t.indexOf('/')+1):''}));});
  return out;
}
/* ---------- каталог без интернета (Джессика 25.10, пункт 7) ----------
   The last found lists, author pages and opened cards stay in IDB (advcat, arch.md 25.10): without the network they are shown with
   «Нет сети: показано сохранённое». Only the first page of a list; downloads still need the network */
const ADV_CAT_KEY='advcat',ADV_CAT_CAP={lists:30,cards:60};
let advCat=null;
async function advCatLoad(){
  if(advCat)return advCat;
  try{const v=await __rq.idb.get(ADV_CAT_KEY);if(v&&v.v===1&&Array.isArray(v.lists)&&Array.isArray(v.cards))advCat=v;}catch(e){}
  return advCat||(advCat={v:1,lists:[],cards:[]});}
async function advCatPut(kind,k,val){
  const c=await advCatLoad(),a=c[kind],i=a.findIndex(function(x){return x.k===k;});
  if(i>=0)a.splice(i,1);
  a.unshift(Object.assign({k:k,ts:Date.now()},val));if(a.length>ADV_CAT_CAP[kind])a.length=ADV_CAT_CAP[kind];
  try{await __rq.idb.put(ADV_CAT_KEY,c);}catch(e){}}
async function advCatGet(kind,k){const c=await advCatLoad();return c[kind].find(function(x){return x.k===k;})||null;}
function advCatKey(q){return ADV.src+'|'+(ADV.lang||'')+'|'+q;}
function advCatDate(ts){try{return new Date(ts).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});}catch(e){return '';}}
function advOfflNote(ts){return 'Нет сети: показано сохранённое '+advCatDate(ts);}

/* a long book is hundreds of pages: what is fetched is kept in IDB (advdl:<srcId>, arch.md 19.10), a broken download goes on from there */
function advDlKey(sid){return 'advdl:'+sid;}
async function advDlLoad(sid){try{const v=await __rq.idb.get(advDlKey(sid));return v&&v.v===1&&v.done&&typeof v.done==='object'?v:null;}catch(e){return null;}}
function advDlSave(st){try{return Promise.resolve(__rq.idb.put(advDlKey(st.sid),{v:1,sid:st.sid,done:st.done,ts:Date.now()})).catch(function(){});}catch(e){return Promise.resolve();}}
function advDlDrop(sid){try{return Promise.resolve(__rq.idb.del(advDlKey(sid))).catch(function(){});}catch(e){return Promise.resolve();}}
/* share of the book already here: fetched chapters against fetched + still unknown pages, read from the saved map only */
function advDlPct(st,root){let got=0,todo=0;const seen={};
  (function walk(pg,depth){if(seen[pg]||depth>4)return;seen[pg]=1;const d=st.done[pg];if(!d){todo++;return;}if(d.s)d.s.forEach(function(x){walk(x,depth+1);});else got++;})(root,0);
  return Math.min(99,Math.floor(got*100/Math.max(1,got+todo)));}
function advWsLabel(it,page){return page.slice(it.page.length+1).split('/').filter(function(x){return !/^(ВТ|ДО)$|\((ВТ|ДО)\)$/.test(x);}).pop()||'';}
/* a book is the page itself, or (when it links to its own subpages: volumes, chapters) the subpages in their order, depth ≤ 4 */
async function advWsBook(it,prog){
  const st=(await advDlLoad(it.sid))||{sid:it.sid,done:{}},done=st.done,parts=[];
  let n=0,fresh=0,got=0,todo=1;
  const pct=function(){return Math.min(99,Math.floor(got*100/Math.max(1,got+todo)));};
  async function walk(page,depth,label){
    if(n>=ADV_WS_MAX)return;
    let d=done[page];
    if(!d){const p=await advWsParse(page),doc=advWsDoc(p.html),subs=depth<4?advWsSubs(doc,p.title):[];
      d=subs.length?{s:subs}:{t:label,x:advWsText(doc)};done[page]=d;fresh++;if(fresh%10===0)advDlSave(st);}
    n++;todo--;
    if(d.s){todo+=d.s.length;prog('Скачиваю… '+pct()+' %');for(const x of d.s){if(n>=ADV_WS_MAX)break;await walk(x,depth+1,advWsLabel(it,x)||label);}return;}
    got++;prog('Скачиваю… '+pct()+' %');
    if(d.x)parts.push({t:label,text:d.x});
  }
  try{await walk(it.page,0,'');}
  catch(e){if(fresh)await advDlSave(st);if(e&&typeof e==='object')e.pct=advDlPct(st,it.page);throw e;}
  let text='';const toc=[];
  parts.forEach(function(p){if(parts.length>1&&p.t){toc.push({t:p.t.slice(0,80),off:text.length});if(p.text.indexOf(p.t)!==0)text+=p.t+'\n\n';}text+=p.text+'\n\n';});
  text=text.trim();
  if(text.length<200){advDlDrop(it.sid);throw new Error('на странице нет текста книги');}
  return {title:it.t,author:it.a||'Викитека',text:text,toc:toc.length>1?toc:undefined,lang:'ru',done:function(){return advDlDrop(it.sid);}};
}
async function advGutBook(it,prog,inf){
  const urls=[ADV_GUT+'/cache/epub/'+it.n+'/pg'+it.n+'.txt'];
  if(ADV_PROXY)urls.push(ADV_PROXY+encodeURIComponent(urls[0]));
  let txt='';
  for(const u of urls){try{prog('Скачиваю…');const r=await fetch(u,{cache:'no-store'});if(r.ok){txt=await r.text();break;}}catch(e){}}
  if(!txt){const e=new Error('nocors');e.nocors=true;throw e;}
  txt=txt.replace(/^﻿/,'').replace(/\r\n?/g,'\n');
  return {title:it.t,author:inf.author||it.a||'Project Gutenberg',text:txt,lang:inf.lang||it.lang||undefined};
}

/* ---------- страница автора (Джессика 19.10): «Автор:Имя Фамилия» на Викитеке, годы из категорий, все тексты по порядку страницы ---------- */
async function advAuthorFind(name){
  if(/^Автор:/.test(name))return [name];
  const d=await advJson(ADV_WS+'?action=query&format=json&formatversion=2&origin=*&list=search&srnamespace=102&srlimit=10&srsearch='+encodeURIComponent(name.split(/\s+/).filter(function(w){return !/\.$/.test(w);}).join(' ')||name));
  const ws=name.toLowerCase().replace(/ё/g,'е').split(/\s+/).filter(Boolean);
  return ((d.query&&d.query.search)||[]).map(function(h){return String(h.title);}).filter(function(t){
    const tw=t.replace(/^Автор:/,'').toLowerCase().replace(/ё/g,'е').split(/\s+/);
    return ws.every(function(w){return /\.$/.test(w)?tw.some(function(x){return x[0]===w[0];}):tw.indexOf(w)>=0;});});
}
async function advAuthorLoad(page){
  const p=await advWsParse(page),doc=advWsDoc(p.html),cats=(p.cats||[]).map(advWsCat);
  const yr=function(re){const c=cats.find(function(x){return re.test(x);});const m=c&&c.match(/(\d{1,4})( год| году)?( до н\. э\.)?/);return m?m[1]+(m[3]?' до н. э.':''):'';};
  const b=yr(/^Родившиеся в /),e=yr(/^Умершие в /),out=[],seen={};
  doc.getElementById('advroot').querySelectorAll('a[title]').forEach(function(a){
    if(out.length>=300||a.classList.contains('new')||a.closest('.navbox,.ws-noexport'))return;
    const t=a.getAttribute('title'),root=t.split('/')[0];
    if(/^[^:]+:\S/.test(t)||root.indexOf('(')<0||/\/ДО$|\(ДО\)|в старой орфографии/.test(t)||seen[root])return;
    seen[root]=1;out.push(advWsItem(root));});
  return {name:p.title.replace(/^Автор:/,''),years:b||e?(b||'?')+' — '+(e||'?'):'',items:out};
}
/* 05.11 (Джессика: «у многих писателей не высвечиваются никакие книги»): the author's books are looked for in every library, not only on Wikisource.
   Wikisource keeps Russian texts and has no page for many foreign authors; Gutenberg and Standard Ebooks know them by the Latin name, Internet Archive
   by either. Only books whose author field carries the surname are kept: a search by name also finds books about the author */
function advFold(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ё/g,'е');}
function advAuthorLat(name){
  const n=String(name||'').replace(/^Автор:/,'');
  const f=advFaces().find(function(x){return x[2]===n||x[0]===n;});if(f&&ADV_FACE_LAT[f[1]])return ADV_FACE_LAT[f[1]];
  const a=ADV_AUTHORS.find(function(x){return x[0]===n||x[2]===n;});if(a)return a[1];
  return /[а-яё]/i.test(n)?advLatin(n):n;}
function advAuthorIs(it,ru,lat){
  const a=advFold(it.a),r=advFold(ru).split(/[\s-]+/).filter(function(w){return w.length>2;}).pop()||'',l=advFold(lat).split(/[\s-]+/).filter(function(w){return w.length>2;}).pop()||'',noy=function(x){return x.replace(/[yj]/g,'');};
  return !!a&&((r&&a.indexOf(r)>=0)||(l&&noy(a).indexOf(noy(l))>=0));} /* «Dostoevsky» and Gutenberg's «Dostoyevsky» */
async function advAuthorElse(ru,lat,more){
  const m=more||{first:true},safe=function(p){return p.catch(function(e){console.warn('[rq] adv author else',e);return {items:[],more:null,err:e};});},none={items:[],more:null};
  const ruN=String(ru||'').replace(/^Автор:/,'').split(/\s+/).filter(function(w){return !/\.$/.test(w);}).join(' ');
  const r=await Promise.all([lat&&(m.first||m.g)?safe(ADV_SRC.gutenberg.search(lat,m.g||null,'')):none,lat&&(m.first||m.s)?safe(ADV_SRC.se.search(lat,m.s||null)):none,
    m.first||m.a?safe(advIaAuthorSearch(ruN,lat,m.a||1)):none]);
  const keep=function(x){return x.items.filter(function(it){return advAuthorIs(it,ruN,lat);});};
  const ia=keep(r[2]),iaRu=ia.filter(function(it){return it.lang==='ru';});
  return {items:iaRu.concat(keep(r[1]),keep(r[0]),ia.filter(function(it){return it.lang!=='ru';})),
    more:r[0].more||r[1].more||r[2].more?{g:r[0].more,s:r[1].more,a:r[2].more}:null,err:r[0].err&&r[1].err&&r[2].err?r[0].err:null};}
/* Internet Archive by the author field only, in Russian or in Latin letters */
async function advIaAuthorSearch(ru,lat,page){
  const t=[advIaTerms(ru),advIaTerms(lat)].filter(Boolean);if(!t.length)return {items:[],more:null};
  const qs=['('+t.map(function(w){return 'creator:'+w;}).join(' OR ')+')','mediatype:texts','format:DjVuTXT',ADV_IA_FREE,ADV_IA_NOT];
  const d=await advJson(ADV_IA+'/advancedsearch.php?q='+encodeURIComponent(qs.join(' AND '))+'&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&fl[]=year&fl[]=language&rows=30&page='+page+'&sort[]=downloads+desc&output=json');
  const r=d.response||{},out=[];
  (r.docs||[]).forEach(function(x){if(!x.identifier||!x.title)return;const y=advIaYear(x);
    out.push({sid:'ia:'+x.identifier,ia:x.identifier,t:advModernIf(String(x.title).trim()),old:advHasOld(x.title)||undefined,a:advIaAuthor(x.creator),lang:advIaLang(x.language),y:y||undefined,cover:ADV_IA+'/services/img/'+encodeURIComponent(x.identifier)});});
  return {items:out,more:page*30<(r.numFound||0)?page+1:null};}
function advAuthorAdd(items){const seen={};ADV.items.forEach(function(x){seen[x.sid]=1;});
  ADV.items=ADV.items.concat(items.filter(function(x){if(seen[x.sid])return false;seen[x.sid]=1;return true;}));}
async function advAuthorMore(){
  const au=ADV.author,seq=ADV.seq;if(!au||!ADV.more)return;ADV.busy=true;advRenderList();
  try{const r=await advAuthorElse(au.ru,au.lat,ADV.more);if(seq!==ADV.seq)return;advAuthorAdd(r.items);ADV.more=r.more;}
  catch(e){if(seq!==ADV.seq)return;console.warn('[rq] adv author more',e);ADV.more=null;}
  ADV.busy=false;advRenderList();}
/* opened from the card, the author chips, a suggestion or a search for a known name; one match = the page, several = pick one */
async function advAuthor(name,lat){
  if(!name)return;el('bookSheet').classList.add('hidden');advSugHide();
  lat=lat||advAuthorLat(name);const ru=ADV.author&&ADV.author.ru&&/^Автор:/.test(name)?ADV.author.ru:name; /* a page picked from the list keeps the name it was asked by */
  const seq=++ADV.seq;ADV.set='author';ADV.author={name:name.replace(/^Автор:/,''),years:'',pick:null,ru:ru,lat:lat,ws:0};ADV.items=[];ADV.more=null;ADV.err='';ADV.alt='';ADV.busy=true;advRenderList();
  const sc=el('adv');if(sc&&sc.scrollTo)sc.scrollTo(0,0);
  const other=advAuthorElse(ru,lat).catch(function(e){return {items:[],more:null,err:e};}); /* the other libraries load while Wikisource answers */
  let wsErr=null;
  try{
    const kn=ADV_AUTHORS.find(function(x){return x[0]===name&&x[2];});
    let page=kn?'Автор:'+kn[2]:null;
    if(!page){const found=await advAuthorFind(name);if(seq!==ADV.seq)return;
      if(found.length>1)ADV.author.pick=found.slice(0,8);else if(found.length)page=found[0];}
    if(page){const a=await advAuthorLoad(page);if(seq!==ADV.seq)return;
      ADV.author.name=a.name;ADV.author.years=a.years;ADV.author.ws=a.items.length;ADV.items=a.items;}
  }catch(e){if(seq!==ADV.seq)return;console.warn('[rq] adv author',e);wsErr=e;}
  const o=await other;if(seq!==ADV.seq)return;
  advAuthorAdd(o.items);ADV.more=o.more;
  if(ADV.items.length){if(!wsErr&&!o.err)advCatPut('lists','author|'+name,{author:ADV.author,items:ADV.items});}
  else if(!ADV.author.pick&&!wsErr&&!o.err){ADV.busy=false;ADV.set=null;ADV.author=null;ADV.q=name.replace(/^Автор:/,'');el('advQ').value=ADV.q;advSearch();return;} /* nothing anywhere: the name as a plain search */
  else if(!ADV.author.pick){const c=await advCatGet('lists','author|'+name);if(seq!==ADV.seq)return;
    if(c){ADV.author=c.author;ADV.items=c.items;ADV.offl={seq:seq,ts:c.ts};}else ADV.err=advNetErr(wsErr||o.err);}
  ADV.busy=false;advRenderList();
}
function advPickHtml(au){return '<div class="advalt">На Викитеке несколько авторов с таким именем:</div>'+au.pick.map(function(t){return '<button type="button" class="advrow advauthrow" data-author="'+esc(t)+'" data-lat="'+esc(au.lat||'')+'">'+rqIcon('user-round',22)+'<span class="advmeta"><b>'+esc(t.replace(/^Автор:/,''))+'</b></span>'+rqIcon('chevron-right',18)+'</button>';}).join('');}
function advAuthorLine(au){const n=ADV.items.length,w=au.ws||0,o=n-w;
  return [w?w+' '+advWorks(w)+' на Викитеке':'',o?o+(ADV.more?'+':'')+' в других библиотеках':''].filter(Boolean).join(', ');}

/* ---------- «Хочу прочитать», последние поиски, книга дня (arch.md 19.10) ---------- */
function advWantGet(){return Array.isArray(S.advWant)?S.advWant.filter(function(x){return x&&typeof x.sid==='string'&&/^(wikisource|gutenberg|se|ia):./.test(x.sid);}):[];}
function advWantHas(sid){return advWantGet().some(function(x){return x.sid===sid;});}
function advWantToggle(){
  if(!advCur)return;const it=advCur.it;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  const list=advWantGet(),i=list.findIndex(function(x){return x.sid===it.sid;});
  if(i>=0)list.splice(i,1);
  else{const keep={};['sid','page','n','t','a','tr','ed','lang','cover'].forEach(function(k){if(it[k]!==undefined&&it[k]!=='')keep[k]=it[k];});list.unshift(keep);}
  S.advWant=list.slice(0,200);save();
  advSheet(it,ADV_SRC[it.sid.split(':')[0]],advCur.inf);if(!ADV.q)advRenderList();
}
function advRecentGet(){return Array.isArray(S.advRecent)?S.advRecent.filter(function(x){return typeof x==='string'&&x.trim();}):[];}
function advRecentAdd(q){q=String(q||'').trim().slice(0,60);if(!q)return;const l=advRecentGet().filter(function(x){return x.toLowerCase()!==q.toLowerCase();});
  if(l[0]===q)return;if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;l.unshift(q);S.advRecent=l.slice(0,8);save();}
function advRecentClear(){if(window.__rqWriter&&!window.__rqWriter.mayWrite())return;S.advRecent=[];save();advRenderList();}
/* a different short classic every day: the same one all day, from the short reads and fairy tales */
function advDayItem(){const pool=[].concat.apply([],ADV_SETS.filter(function(x){return x.id==='short'||x.id==='tales';}).map(function(x){return x.pages;}));
  const d=new Date(),k=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);return advWsItem(pool[k%pool.length]);}

/* ---------- экран ---------- */
function openAdv(){advFacesShuffle();renderAdv();show('adv');if(!ADV.items.length&&!ADV.busy&&(advLat()||ADV.q))advSearch();}
function advSwitch(k){ADV.src=k;ADV.q='';ADV.fk='';ADV.fl='';ADV.seq++;ADV.busy=false;ADV.items=[];ADV.more=null;ADV.err='';ADV.set=null;ADV.alt='';advSugHide();renderAdv();if(advLat())advSearch();}
function renderAdv(){
  const src=ADV_SRC[ADV.src];
  const bar=el('advSrc');bar.innerHTML=Object.keys(ADV_SRC).map(function(k){return '<button type="button" class="fchip'+(k===ADV.src?' on':'')+'" data-src="'+k+'">'+esc(ADV_SRC[k].t)+'</button>';}).join('');
  bar.querySelectorAll('.fchip').forEach(function(b){b.onclick=function(){if(ADV.src===b.dataset.src)return;advSwitch(b.dataset.src);};});
  const on=bar.querySelector('.fchip.on');if(on&&on.offsetLeft+on.offsetWidth>bar.clientWidth+bar.scrollLeft)bar.scrollLeft=on.offsetLeft+on.offsetWidth-bar.clientWidth+16; /* the chosen source stays in sight in the scrolling row */
  const lb=el('advLang');lb.hidden=ADV.src!=='gutenberg'&&ADV.src!=='ia';
  lb.innerHTML=ADV_LANGS.map(function(l){return '<button type="button" class="fchip'+(l[0]===ADV.lang?' on':'')+'" data-l="'+l[0]+'">'+esc(l[1])+'</button>';}).join('');
  lb.querySelectorAll('.fchip').forEach(function(b){b.onclick=function(){ADV.lang=b.dataset.l;ADV.items=[];ADV.more=null;renderAdv();advSearch();};});
  const inp=el('advQ');if(document.activeElement!==inp)inp.value=ADV.q;
  inp.placeholder=advLat()?'Название или автор, лучше латиницей':'Название или автор';
  advRenderList();
}
function advRenderList(){
  const box=el('advList');let h='';const au=ADV.set==='author'?ADV.author||{}:null;
  const set=au?{t:au.name}:ADV.set==='want'?{t:'Хочу прочитать'}:ADV.set&&ADV_SETS.find(function(x){return x.id===ADV.set;});
  if(set)h='<button type="button" class="advback" id="advBack">'+rqIcon('chevron-left',18)+(au?' Назад':' Все подборки')+'</button><h2 class="advseth">'+esc(set.t)+'</h2>'+
    (au&&au.years?'<div class="advalt">'+esc(au.years)+'</div>':'')+(set.pages?'<div class="advalt advsetprog">'+advSetLine(set)+'</div>'+advBar(advSetProg(set),set.pages.length):'')+(ADV.set==='want'?advWantDlHtml():'')+(au&&ADV.items.length?'<div class="advalt">'+esc(advAuthorLine(au))+'</div>':'');
  else{if(ADV.alt&&ADV.items.length)h+='<div class="advalt">Показано по запросу «'+esc(ADV.alt)+'»</div>';
    const aq=(ADV.alt||ADV.q).trim().toLowerCase(),k=aq&&!advByName()&&!ADV.busy&&ADV_AUTHORS.find(function(x){return x[0].toLowerCase()===aq||x[0].split(' ').pop().toLowerCase()===aq;});
    if(k)h+='<button type="button" class="advrow advauthrow" data-author="'+esc(k[0])+'">'+rqIcon('user-round',22)+'<span class="advmeta"><b>'+esc(k[0])+'</b><span class="advauth">Все книги автора на Викитеке</span></span>'+rqIcon('chevron-right',18)+'</button>';}
  if(au&&au.pick&&ADV.items.length)h+=advPickHtml(au);
  if(ADV.offl&&ADV.offl.seq===ADV.seq&&ADV.items.length)h+='<div class="advalt advoffl">'+rqIcon('info',14)+' '+esc(advOfflNote(ADV.offl.ts))+'</div>';
  if(!ADV.items.length){
    if(ADV.busy)h+='<div class="advempty">Ищу в библиотеке…</div>';
    else if(au&&au.pick)h+=advPickHtml(au);
    else if(ADV.err)h+='<div class="advempty">'+esc(ADV.err)+'</div>';
    else if(ADV.set==='want')h+='<div class="advempty">Список пуст. Откройте книгу и нажмите «Хочу прочитать»</div>';
    else if(ADV.src==='ia'&&!ADV.q)h+='<div class="advempty">Напишите название или автора. В Интернет-архиве сканы старых изданий, мы показываем только изданные до 1930 года</div><div class="chips advrecent">'+
      ADV_WS_HINTS.slice(0,8).map(function(s){return '<button type="button" class="fchip" data-q="'+esc(s)+'">'+esc(s)+'</button>';}).join('')+'</div>';
    else if(!advLat()&&!ADV.q)h+=advHome()+'<div class="bk-h">Подборки</div><div class="advsets">'+ADV_SETS.map(function(x){ /* audit 19.10 ADV-01: English collections off for the RU people test */
        return '<button type="button" class="advset" data-set="'+x.id+'">'+rqIcon(x.ic,22)+'<b>'+esc(x.t)+'</b><span>'+(x.pages?advSetLine(x):x.sub||'мировая классика')+'</span>'+(x.pages&&advSetProg(x)?advBar(advSetProg(x),x.pages.length):'')+'</button>';}).join('')+'</div>'+
      '<div class="bk-h advauth-h">Авторы</div><div class="advfaces advhints">'+advFaces().map(advFace).join('')+'</div>';
    else h+='<div class="advempty">Ничего не нашлось. Попробуйте другое название или автора</div>';
  }else{
    const flt=!ADV.set&&!advLat()&&ADV.items.some(function(x){return x.kind||x.size;});
    if(flt)h+='<div class="chips advflt" id="advFlt">'+[['','Всё'],['poem','Стихи'],['prose','Проза'],['drama','Пьесы']].map(function(f){return '<button type="button" class="fchip'+(ADV.fk===f[0]?' on':'')+'" data-fk="'+f[0]+'">'+f[1]+'</button>';}).join('')+
      '<span class="advfsep"></span>'+[['short','До часа'],['long','Длинное']].map(function(f){return '<button type="button" class="fchip'+(ADV.fl===f[0]?' on':'')+'" data-fl="'+f[0]+'">'+f[1]+'</button>';}).join('')+'</div>';
    const quote=!ADV.set&&advWords(ADV.q)>=3;let shown=0;
    h+=ADV.items.map(function(it,i){if(flt&&!advFilter(it))return '';shown++;const own=advOnShelf(it.sid);
      return '<button type="button" class="advrow" data-i="'+i+'"><span class="cover">'+advCover(it)+'</span><span class="advmeta"><b>'+esc(it.t)+'</b>'+
        '<span class="advauth">'+esc(it.a||'')+(it.tr?' · пер. '+esc(it.tr):'')+(it.y?(it.a?' · ':'')+it.y:'')+'</span>'+(own?'<span class="advown">'+rqIcon('check',14)+(advDone(it.sid)?' Прочитано':' На полке')+'</span>':'')+
        (quote&&it.snip&&advSnip(it.snip)?'<span class="advsnip">«…'+advSnip(it.snip)+'…»</span>':'')+
        (ADV.src==='all'&&!ADV.set||ADV.set==='author'?'<span class="advtags"><span class="chip">'+esc(advSrcOf(it)?advSrcOf(it).t:'')+'</span>'+(it.ru?'<span class="chip advru">есть по-русски</span>':'')+'</span>':'')+'</span>'+rqIcon('chevron-right',18)+'</button>';}).join('');
    if(flt&&!shown)h+='<div class="advempty">Под фильтр ничего не подошло. Нажмите «Показать ещё» или снимите фильтр</div>';
    if(ADV.more)h+='<button type="button" class="buy advmore" id="advMore"'+(ADV.busy?' disabled':'')+'>'+(ADV.busy?'Загружаю…':'Показать ещё')+'</button>';
  }
  box.innerHTML=h;
  box.querySelectorAll('#advList > .advrow').forEach(function(b){b.onclick=function(){if(ADV.q.trim()&&!ADV.set)advRecentAdd(ADV.alt||ADV.q);advOpen(ADV.items[+b.dataset.i]);};});
  box.querySelectorAll('.advhome [data-w]').forEach(function(b){b.onclick=function(){advOpen(advWantGet()[+b.dataset.w]);};});
  const dy=el('advDay');if(dy)dy.onclick=function(){advOpen(advDayItem());};
  box.querySelectorAll('.advrec').forEach(function(b){b.onclick=function(){const r=advRecs()[+b.dataset.r];if(r)advOpen(r.it);};});
  box.querySelectorAll('.advqget').forEach(function(b){b.onclick=function(){advQuestClaim(b.dataset.q);};});
  const wa=el('advWantAll');if(wa)wa.onclick=function(){advSet('want');};
  const rc=el('advRecentClear');if(rc)rc.onclick=advRecentClear;
  box.querySelectorAll('.advrecent .fchip').forEach(function(b){b.onclick=function(){ADV.q=b.dataset.q;el('advQ').value=ADV.q;advSugHide();advSearch();};});
  box.querySelectorAll('.advhints .advface').forEach(function(b){b.onclick=function(){advAuthor(b.dataset.q,b.dataset.lat);};});
  box.querySelectorAll('.advset').forEach(function(b){b.onclick=function(){advSet(b.dataset.set);};});
  const bb=el('advBack');if(bb)bb.onclick=function(){const wasAu=ADV.set==='author';ADV.seq++;ADV.busy=false;ADV.err='';ADV.set=null;ADV.author=null;ADV.items=[];if(wasAu&&ADV.q.trim())advSearch();else advRenderList();};
  box.querySelectorAll('[data-author]').forEach(function(b){b.onclick=function(){advAuthor(b.dataset.author,b.dataset.lat);};});
  const mb=el('advMore');if(mb)mb.onclick=function(){if(ADV.set==='author')advAuthorMore();else advSearch(true);};
  const wd=el('advWantDl');if(wd)wd.onclick=advWantAll;
  box.querySelectorAll('#advFlt .fchip').forEach(function(b){b.onclick=function(){if(b.dataset.fk!==undefined)ADV.fk=b.dataset.fk;else ADV.fl=ADV.fl===b.dataset.fl?'':b.dataset.fl;advRenderList();};});
}
function advWantDlHtml(){const n=advWantGettable().length,g=advWantGet().some(function(x){return x.sid.indexOf('gutenberg:')===0&&!advOnShelf(x.sid);});
  return (n?'<button type="button" class="cta advwantdl" id="advWantDl"'+(ADV.dl?' disabled':'')+'>'+rqIcon('download',18)+' Скачать все ('+n+')</button>':'')+
    (g?'<div class="advalt">Книги Гутенберга скачиваются по одной: откройте книгу и скачайте файл</div>':'');}
function advSetLine(x){const n=advSetProg(x),m=x.pages.length;return n===m?'Прочитана вся подборка':n?'Прочитано '+n+' из '+m:m+' '+advBooks(m);}
function advWorks(n){const k=n%10,c=n%100;return k===1&&c!==11?'текст':k>=2&&k<=4&&(c<12||c>14)?'текста':'текстов';}
function advBooks(n){const k=n%10,c=n%100;return k===1&&c!==11?'книга':k>=2&&k<=4&&(c<12||c>14)?'книги':'книг';}
/* a collection is a fixed list: no search request, the cards ask the library when opened */
/* ---------- испытания месяца (Джессика 25.10, пункт 5) ----------
   Three challenges a month from a fixed pool, the same for everyone in that month. Progress is counted from books of «Приключений» finished this
   month (S.finishDates, local days); the reward is taken by a button and remembered in the existing S.claimed as 'advq-<id>:<YYYY-MM>' (arch.md 25.10).
   Coins are paid in MVP too: Джессика chose «с монетами и значком» */
function advFinBooks(m){const fin=S.finished||[],fd=S.finishDates||{};
  return (S.userBooks||[]).filter(function(b){return b&&b.srcId&&fin.indexOf(b.id)>=0&&(!m||String(fd[b.id]||'').slice(0,7)===m);});}
function advSetOf(b){const sid=String(b&&b.srcId||'');if(sid.indexOf('wikisource:')!==0)return [];const pg=sid.slice(11);return ADV_SETS.filter(function(x){return x.pages&&x.pages.indexOf(pg)>=0;}).map(function(x){return x.id;});}
function advSurname(a){return String(a||'').replace(/[(),;].*$/,'').trim().split(/\s+/).pop().toLowerCase();}
const ADV_QUESTS=[
  {id:'lib2',t:'Дочитать 2 книги из «Приключений»',n:2,gold:60,f:function(l){return l.length;}},
  {id:'set1',t:'Дочитать книгу из любой подборки',n:1,gold:40,f:function(l){return l.filter(function(b){return advSetOf(b).length;}).length;}},
  {id:'short3',t:'Дочитать 3 книги из «Короткого на вечер» или «Сказок»',n:3,gold:80,f:function(l){return l.filter(function(b){const s=advSetOf(b);return s.indexOf('short')>=0||s.indexOf('tales')>=0;}).length;}},
  {id:'abroad',t:'Дочитать книгу не из Викитеки: Гутенберг, Standard Ebooks или Интернет-архив',n:1,gold:80,f:function(l){return l.filter(function(b){return b.srcId.indexOf('wikisource:')!==0;}).length;}},
  {id:'antiq',t:'Дочитать книгу из «Античности»',n:1,gold:60,f:function(l){return l.filter(function(b){return advSetOf(b).indexOf('antiq')>=0;}).length;}},
  {id:'newauth',t:'Дочитать книги двух новых для вас авторов',n:2,gold:80,f:function(l,m){
    const fd=S.finishDates||{},old={};(S.userBooks||[]).forEach(function(b){const d=String(fd[b&&b.id]||'');if(d&&d.slice(0,7)<m&&(S.finished||[]).indexOf(b.id)>=0)old[advSurname(b.author)]=1;});
    const nw={};l.forEach(function(b){const a=advSurname(b.author);if(a&&!old[a])nw[a]=1;});return Object.keys(nw).length;}}];
function advMonth(){return today().slice(0,7);}
function advQuestsNow(m){m=m||advMonth();const k=(+m.slice(0,4))*12+(+m.slice(5,7)),P=ADV_QUESTS.length;return [0,2,4].map(function(i){return ADV_QUESTS[(k+i)%P];});}
function advQuestKey(q,m){return 'advq-'+q.id+':'+(m||advMonth());}
function advQuestProg(q,m){m=m||advMonth();return Math.min(q.n,q.f(advFinBooks(m),m));}
function advQuestsClaimed(){const c=S.claimed||{};return Object.keys(c).filter(function(k){return c[k]&&/^advq-[a-z0-9]+:\d{4}-\d{2}$/.test(k);}).length;}
function advQuestClaim(id){
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  const q=advQuestsNow().find(function(x){return x.id===id;});if(!q)return;const key=advQuestKey(q);
  S.claimed=S.claimed||{};if(S.claimed[key]||advQuestProg(q)<q.n)return;
  S.claimed[key]=true;S.gold=(S.gold||0)+q.gold;S.goldAllTime=(S.goldAllTime||0)+q.gold;save();
  try{confetti();}catch(e){}flashMsg('Испытание выполнено: +'+q.gold+' монет','info');
  try{if(typeof renderLibrary==='function')renderLibrary();}catch(e){}advRenderList();}
function advQuestsHtml(){const m=advMonth(),c=S.claimed||{};
  return '<div class="bk-h">Испытания месяца</div><div class="advquests">'+advQuestsNow(m).map(function(q){const n=advQuestProg(q,m),got=!!c[advQuestKey(q,m)];
    return '<div class="advq'+(got?' done':'')+'"><span class="advmeta"><b>'+esc(q.t)+'</b>'+advBar(got?q.n:n,q.n)+'</span>'+
      (got?'<span class="chip advqok">'+rqIcon('check',14)+' Получено</span>':n>=q.n?'<button type="button" class="buy advqget" data-q="'+q.id+'">Забрать +'+q.gold+' монет</button>':'<span class="chip">'+n+' из '+q.n+'</span>')+'</div>';}).join('')+'</div>';}

/* ---------- «Вам может понравиться» (Джессика 25.10, пункт 4) ----------
   From the reader's own shelf, without the network: books of the collections by authors they read (any book on the shelf, imported ones too),
   then the rest of a collection they started. Nothing stored */
function advRecs(){
  const shelf=S.userBooks||[],auth={},sets={};
  shelf.forEach(function(b){if(!b)return;const a=advSurname(bookAuthor?bookAuthor(b):b.author);if(a&&a.length>2)auth[a]=b.author;advSetOf(b).forEach(function(id){sets[id]=1;});});
  const out=[],seen={};
  ADV_SETS.forEach(function(x){(x.pages||[]).forEach(function(pg){const it=advWsItem(pg);if(seen[it.sid]||advOnShelf(it.sid))return;seen[it.sid]=1;
    const a=advSurname(it.a);let sc=0,why='';
    if(a&&auth[a]){sc=2;why='Вы читали: '+it.a;}else if(sets[x.id]){sc=1;why='Из подборки «'+x.t+'»';}
    if(sc)out.push({it:it,sc:sc,why:why});});});
  const d=+today().replace(/-/g,'');
  out.sort(function(p,q){return q.sc-p.sc||((p.it.sid.length*31+d)%97)-((q.it.sid.length*31+d)%97);});
  return out.slice(0,3);}
function advRecsHtml(){const r=advRecs();if(!r.length)return '';
  return '<div class="bk-h">Вам может понравиться</div>'+r.map(function(x,i){
    return '<button type="button" class="advrow advrec" data-r="'+i+'"><span class="cover">'+advCover(x.it)+'</span><span class="advmeta"><b>'+esc(x.it.t)+'</b><span class="advauth">'+esc(x.it.a||'')+(x.it.tr?' · пер. '+esc(x.it.tr):'')+'</span><span class="advauth advwhy">'+esc(x.why)+'</span></span>'+rqIcon('chevron-right',18)+'</button>';}).join('');}

/* first screen above the collections: book of the day, «Хочу прочитать» (three, then «all»), recent searches */
function advHome(){
  const d=advDayItem(),own=advOnShelf(d.sid),w=advWantGet(),rc=advRecentGet();
  let h='<div class="advhome"><div class="bk-h">Книга дня</div><button type="button" class="advrow advday" id="advDay"><span class="cover">'+advCover(d)+'</span><span class="advmeta"><b>'+esc(d.t)+'</b><span class="advauth">'+esc(d.a)+(d.tr?' · пер. '+esc(d.tr):'')+'</span>'+
    (own?'<span class="advown">'+rqIcon('check',14)+' На полке</span>':'<span class="advauth">Короткая классика на сегодня</span>')+'</span>'+rqIcon('chevron-right',18)+'</button>'+advRecsHtml()+advQuestsHtml();
  if(w.length){h+='<div class="bk-h">Хочу прочитать</div>'+w.slice(0,3).map(function(it,i){
      return '<button type="button" class="advrow" data-w="'+i+'"><span class="cover">'+advCover(it)+'</span><span class="advmeta"><b>'+esc(it.t+(it.ed?' · '+it.ed:''))+'</b><span class="advauth">'+esc(it.a||'')+'</span></span>'+rqIcon('chevron-right',18)+'</button>';}).join('');
    if(w.length>3)h+='<button type="button" class="advback" id="advWantAll">Все '+w.length+' '+advBooks(w.length)+' '+rqIcon('chevron-right',16)+'</button>';}
  if(rc.length)h+='<div class="bk-h advrech">Вы искали <button type="button" class="advclear" id="advRecentClear">Очистить</button></div><div class="chips advrecent">'+
    rc.map(function(q){return '<button type="button" class="fchip" data-q="'+esc(q)+'">'+esc(q)+'</button>';}).join('')+'</div>';
  return h+'</div>';
}
function advSet(id){
  if(id==='want'){ADV.seq++;ADV.busy=false;ADV.err='';ADV.alt='';ADV.more=null;ADV.set='want';ADV.items=advWantGet();advRenderList();return;}
  const x=ADV_SETS.find(function(s){return s.id===id;});if(!x)return;
  if(x.src){advSwitch(x.src);return;}
  ADV.seq++;ADV.busy=false;ADV.err='';ADV.alt='';ADV.more=null;ADV.set=id;ADV.items=x.pages.map(advWsItem);advRenderList();
  const sc=el('adv');if(sc&&sc.scrollTo)sc.scrollTo(0,0);}
function advCover(it){const c=coverHtml({id:it.sid,title:it.t,author:it.a||''});
  return it.cover?'<img src="'+esc(it.cover)+'" alt="" loading="lazy" onerror="this.remove()">'+c:c;} /* real Gutenberg cover over the drawn one; no cover → the drawn one stays */
async function advSearch(more){
  const src=ADV_SRC[ADV.src],seq=++ADV.seq,q=ADV.q.trim();
  if(!more){ADV.items=[];ADV.more=null;ADV.alt='';}
  ADV.err='';ADV.set=null;
  if(!q&&!advLat()){ADV.busy=false;advRenderList();return;}
  ADV.busy=true;advRenderList();
  try{let r=await src.search(q,more?ADV.more:null);if(seq!==ADV.seq)return;
    /* nothing found: the query was typed with the other layout, or in Cyrillic for an English catalogue */
    const alt=more?'':!advLat()?(advIsLayout(q)?advLayout(q):''):(/[а-яё]/i.test(q)?advLatin(q):'');
    if(!r.items.length&&alt&&alt!==q){r=await src.search(alt,null);if(seq!==ADV.seq)return;ADV.alt=alt;}
    ADV.items=more?ADV.items.concat(r.items.filter(function(x){return !ADV.items.some(function(y){return y.sid===x.sid;});})):r.items;ADV.more=r.more;
    if(!more&&r.items.length)advCatPut('lists',advCatKey(q),{items:r.items,alt:ADV.alt||''});}
  catch(e){if(seq!==ADV.seq)return;console.warn('[rq] adv search',e);
    const c=more?null:await advCatGet('lists',advCatKey(q));if(seq!==ADV.seq)return;
    if(c){ADV.items=c.items;ADV.alt=c.alt||'';ADV.more=null;ADV.offl={seq:seq,ts:c.ts};}else ADV.err=advNetErr(e);}
  ADV.busy=false;advRenderList();
}
let advT=0;
let advST=0;
function advInput(){ADV.q=el('advQ').value;clearTimeout(advT);clearTimeout(advST);advST=setTimeout(advSuggest,250);advT=setTimeout(function(){advSearch();},700);}
function advSugHide(){ADV.sseq++;clearTimeout(advST);const b=el('advSug');if(b){b.hidden=true;b.innerHTML='';}}
/* under the field while typing: matching authors, and on Wikisource the titles its own search box would offer */
async function advSuggest(){
  const q=ADV.q.trim(),seq=++ADV.sseq,box=el('advSug');if(!box)return;
  if(q.length<2){advSugHide();return;}
  const au=advAuthorHits(q);let ts=[];
  if(!advByName()){
    const os=async function(v){const d=await advJson(ADV_WS+'?action=opensearch&format=json&origin=*&namespace=0&limit=10&search='+encodeURIComponent(v));return (d&&d[1])||[];};
    try{ts=await os(q);if(!ts.length&&advIsLayout(q))ts=await os(advLayout(q));}catch(e){ts=[];}
    const seen={};ts=ts.map(function(t){return String(t);}).filter(function(t){const r=t.split('/')[0];if(seen[r]||(r!==t&&r.indexOf('(')<0))return false;seen[r]=1;return true;})
      .map(function(t){return t.split('/')[0];}).slice(0,6);
  }
  if(seq!==ADV.sseq||ADV.q.trim()!==q)return;
  if(!au.length&&!ts.length){advSugHide();return;}
  box.innerHTML=au.map(function(a,i){return '<button type="button" class="advsugrow" data-a="'+i+'">'+rqIcon('user-round',18)+'<span><b>'+esc(advLat()?a[1]:a[0])+'</b>'+(advLat()?' <i>'+esc(a[0])+'</i>':'')+'</span></button>';}).join('')+
    ts.map(function(t,i){const n=advWsName(t);return '<button type="button" class="advsugrow" data-t="'+i+'">'+rqIcon('book-open',18)+'<span><b>'+esc(n.t)+'</b>'+(n.a?' <i>'+esc(n.a+(n.tr?' · пер. '+n.tr:''))+'</i>':'')+'</span></button>';}).join('');
  box.hidden=false;
  box.querySelectorAll('.advsugrow').forEach(function(b){b.onclick=function(){
    if(b.dataset.a!==undefined){const a=au[+b.dataset.a];clearTimeout(advT);advSugHide();
      if(!advByName()){advRecentAdd(a[0]);advAuthor(a[0]);}else{ADV.q=advLat()||ADV.lang&&ADV.lang!=='ru'?a[1]:a[0];el('advQ').value=ADV.q;advSearch();}}
    else{advSugHide();clearTimeout(advT);advOpen(advWsItem(ts[+b.dataset.t]));}};});
}

/* ---------- карточка книги ---------- */
let advCur=null;
async function advOpen(it){
  if(!it)return;advCur={it:it,inf:null};
  const src=ADV_SRC[it.sid.split(':')[0]];
  advSheet(it,src,null);el('bookSheet').classList.remove('hidden');
  let inf;try{inf=await src.info(it);if(inf&&!inf.err&&!inf.missing)advCatPut('cards',it.sid,{inf:inf});}
  catch(e){console.warn('[rq] adv info',e);const c=await advCatGet('cards',it.sid);inf=c?Object.assign({},c.inf,{offl:c.ts}):{err:advNetErr(e)};}
  if(!inf.err&&!inf.list&&it.sid.indexOf('wikisource:')===0){const st=await advDlLoad(it.sid);if(st)inf.partial=advDlPct(st,it.page);}
  if(!advCur||advCur.it!==it)return;advCur.inf=inf;
  if(!el('bookSheet').classList.contains('hidden'))advSheet(it,src,inf);
  if(inf.err||inf.missing||inf.list||inf.offl)return;
  const sim=await advSimilar(it);
  if(advCur&&advCur.it===it&&sim.length){advCur.sim=sim;if(!el('bookSheet').classList.contains('hidden'))advSheet(it,src,advCur.inf);}
}
function advSheet(it,src,inf){
  if(inf&&inf.list){advListSheet(it,inf.list);return;}
  const own=advOnShelf(it.sid),rows=inf&&!inf.err&&!inf.missing?src.rows(it,inf).filter(Boolean):[];
  let act='';
  if(own)act='<button type="button" class="cta" onclick="advRead()">Читать</button>';
  else if(!inf)act='<button type="button" class="cta" disabled>Загружаю…</button>';
  else if(inf.err||inf.missing)act='<div class="bk-note">'+esc(inf.err||'Такой книги в библиотеке больше нет')+'</div>';
  else if(inf.nocors)act='<div class="bk-note">Гутенберг пока не отдаёт файлы приложению напрямую. Скачайте файл в браузере, потом нажмите «Добавить книгу» в библиотеке и выберите его. Книга ляжет на полку, как любая другая.</div>'+
    '<a class="cta" href="'+esc(inf.epub)+'" target="_blank" rel="noopener">'+rqIcon('download',18)+' Скачать файл'+(inf.size?' · '+advSize(inf.size):'')+'</a>';
  else if(src.canGet(inf)&&navigator.onLine===false)act='<button type="button" class="cta" id="advGet" disabled>'+rqIcon('download',18)+' Нет сети — скачать можно позже</button>'; /* audit 19.10 ADV-02 */
  else if(src.canGet(inf))act='<button type="button" class="cta" id="advGet" onclick="advGet()">'+rqIcon('download',18)+(inf.partial!==undefined?' Продолжить скачивание · '+inf.partial+' %':' Скачать на телефон и читать')+'</button>';
  if(inf&&inf.offl)act='<div class="bk-note advoffl">'+rqIcon('info',14)+' '+esc(advOfflNote(inf.offl))+'</div>'+act;
  if(inf&&!inf.err&&!inf.missing&&!inf.nocors&&src.canGet(inf)&&advBiLang(it,inf)){const bo=advOnShelf(advBiSid(it.sid));
    if(bo)act+='<button type="button" class="buy advwant" onclick="openBook(advOnShelf(advBiSid(advCur.it.sid)).id)">'+rqIcon('languages',18)+' Читать с переводом</button>';
    else if(navigator.onLine!==false)act+='<button type="button" class="buy advwant" id="advGetBi" onclick="advGetBi()">'+rqIcon('languages',18)+' Скачать с переводом по абзацам</button>'+
      '<div class="bk-note advbinote">Под каждым абзацем будет перевод на русский. Переводит сам телефон, без интернета, после скачивания пакета языка. В длинной книге переводятся первые '+(ADV_BI_MAX/1000)+' тысяч слов, дальше остаётся оригинал.</div>';}
  if(inf&&!inf.err&&!inf.missing){const ws=it.sid.indexOf('wikisource:')===0,ra=!ws?advRuAuthor(inf.author||it.a):(it.a||'');
    if(ra)act+='<button type="button" class="buy advwant" data-author="'+esc(ra)+'" onclick="advAuthor(this.dataset.author)">'+rqIcon('user-round',18)+(!ws?' Этот автор по-русски на Викитеке':' Все книги автора')+'</button>';}
  if(!own&&inf&&!inf.err&&!inf.missing)act+='<button type="button" class="buy advwant'+(advWantHas(it.sid)?' on':'')+'" id="advWant" onclick="advWantToggle()">'+rqIcon(advWantHas(it.sid)?'check':'bookmark',18)+(advWantHas(it.sid)?' В списке «Хочу прочитать»':' Хочу прочитать')+'</button>';
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+advCover(it)+'</div><div class="bk-ttl"><b>'+esc(it.t+(it.ed?' · '+it.ed:''))+'</b><div class="bk-sub">'+esc(it.a||'')+(it.tr?' · пер. '+esc(it.tr):'')+'</div></div></div>'+
    (inf&&inf.summary?'<div class="bk-note advsum" lang="en">'+esc(inf.summary)+'</div>':'')+
    (rows.length?'<div class="bk-h">О книге</div><div class="bk-list">'+rows.map(function(r){return '<div class="bk-row"><span class="bk-k">'+esc(r[0])+'</span><span class="bk-v">'+esc(r[1])+'</span></div>';}).join('')+'</div>':'')+
    (inf&&inf.preview?'<div class="bk-h">Начало</div><div class="bk-note advpre">'+esc(inf.preview)+'</div>':'')+
    (inf&&!inf.err&&!inf.missing&&!own&&!inf.nocors?'<div class="bk-note">'+esc(src.note(inf))+(it.old?' Книга в старой орфографии: при скачивании «ѣ», «і» и «ъ» на конце слов заменятся на современное письмо.':'')+'</div>':'')+act+advSimHtml(it);
  el('bookSheetBody').querySelectorAll('.advsim .advrow').forEach(function(b){b.onclick=function(){advOpen(advCur.sim[+b.dataset.s]);};});
}
function advSimHtml(it){const l=advCur&&advCur.it===it&&advCur.sim||[];if(!l.length)return '';
  return '<div class="bk-h">Похожие книги</div><div class="advlist advsim">'+l.map(function(x,i){const own=advOnShelf(x.sid);
    return '<button type="button" class="advrow" data-s="'+i+'"><span class="cover">'+advCover(x)+'</span><span class="advmeta"><b>'+esc(x.t+(x.ed?' · '+x.ed:''))+'</b><span class="advauth">'+esc(x.a||'')+'</span>'+
      (own?'<span class="advown">'+rqIcon('check',14)+(advDone(x.sid)?' Прочитано':' На полке')+'</span>':'')+'</span>'+rqIcon('chevron-right',18)+'</button>';}).join('')+'</div>';}
function advListSheet(it,list){
  el('bookSheetBody').innerHTML=
    '<div class="bk-head"><div class="cover">'+advCover(it)+'</div><div class="bk-ttl"><b>'+esc(it.t)+'</b><div class="bk-sub">'+esc(it.a||'')+'</div></div></div>'+
    (list.length?'<div class="bk-note">Здесь несколько изданий или произведений. Выберите нужное.</div><div class="advlist">'+list.map(function(x,i){
      return '<button type="button" class="advrow" data-i="'+i+'"><span class="advmeta"><b>'+esc(x.t+(x.ed?' · '+x.ed:''))+'</b>'+(x.a||x.tr?'<span class="advauth">'+esc(x.a+(x.tr?' · пер. '+x.tr:''))+'</span>':'')+'</span>'+rqIcon('chevron-right',18)+'</button>';}).join('')+'</div>'
    :'<div class="bk-note">На этой странице нет ссылок на тексты. Попробуйте уточнить поиск.</div>');
  el('bookSheetBody').querySelectorAll('.advrow').forEach(function(b){b.onclick=function(){advOpen(list[+b.dataset.i]);};});
}
function advSize(b){return b<1048576?Math.max(1,Math.round(b/1024))+' КБ':(b/1048576).toFixed(1).replace('.',',')+' МБ';}
function advRead(){const own=advCur&&advOnShelf(advCur.it.sid);if(!own)return;el('bookSheet').classList.add('hidden');openBook(own.id);}
/* a fetched book onto the shelf: one rqAddBook (text to IDB, card, save()); off the «Хочу прочитать» list in the same save() */
async function advAddBook(it,src,r){
  if(advOldSpell(r.text))advModernBook(r);
  const b={id:newBookId(),title:r.title,author:r.author,genre:src.t,stat:'Воображение',cover:'',text:r.text,toc:r.toc,lang:r.lang||undefined,srcId:it.sid,
    fname:it.sid.replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,80)+'.txt',size:r.text.length};
  const want=advWantGet(),wi=want.findIndex(function(x){return x.sid===it.sid;});if(wi>=0){want.splice(wi,1);S.advWant=want;}
  await rqAddBook(b);if(r.done)r.done();
  return b;
}
/* «Скачать все» on the «Хочу прочитать» screen: one book after another, each saved as it comes; a break keeps what is done (and the half-fetched book in advdl:) */
function advWantGettable(){return advWantGet().filter(function(x){return !advOnShelf(x.sid)&&x.sid.indexOf('gutenberg:')!==0;});}
async function advWantAll(){
  if(ADV.dl)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Приложение открыто в другом окне','info');return;}
  const list=advWantGettable();if(!list.length)return;
  ADV.dl=true;let ok=0,i=0;
  const prog=function(t){const btn=el('advWantDl');if(btn){btn.disabled=true;btn.textContent='Книга '+(i+1)+' из '+list.length+' · '+t;}};
  try{
    for(;i<list.length;i++){const it=list[i],src=advSrcOf(it);prog('Загружаю…');
      const inf=await src.info(it);if(inf.missing||inf.list||!src.canGet(inf))continue;
      const r=await src.get(it,prog,inf);await advAddBook(it,src,r);ok++;}
    flashMsg(ok?'Скачано книг: '+ok+'. Они на полке и читаются без интернета':'Эти книги нельзя скачать сразу. Откройте каждую, чтобы узнать почему','info');
  }catch(e){console.warn('[rq] adv want all',e);flashMsg('Скачано '+ok+' из '+list.length+'. Связь прервалась: нажмите «Скачать все» ещё раз, скачанное сохранено','info');}
  finally{ADV.dl=false;if(ADV.set==='want'){ADV.items=advWantGet();advRenderList();}}
}
/* «Похожие книги» in the card: the same collection, the author's other texts (Wikisource page of a known author), or the author's books in the same catalogue */
async function advSimilar(it){
  const out=[],seen={};seen[it.sid]=1;const add=function(x){if(x&&x.sid&&!seen[x.sid]&&out.length<6){seen[x.sid]=1;out.push(x);}};
  const k=it.sid.split(':')[0];
  if(k==='wikisource'){
    ADV_SETS.forEach(function(x){const i=x.pages?x.pages.indexOf(it.page):-1;if(i<0)return;for(let j=1;j<x.pages.length&&out.length<3;j++)add(advWsItem(x.pages[(i+j)%x.pages.length]));});
    const sur=String(it.a||'').split(' ').pop(),kn=sur&&ADV_AUTHORS.find(function(x){return x[2]&&x[0].split(' ').pop()===sur;});
    if(kn){try{(await advAuthorLoad('Автор:'+kn[2])).items.forEach(function(x){if(x.page.split('/')[0]!==it.page.split('/')[0])add(x);});}catch(e){}}
  }else{const a=String(it.a||'').split(',')[0].trim();if(a&&ADV_SRC[k]){try{(await ADV_SRC[k].search(a,null,'')).items.forEach(add);}catch(e){}}}
  return out;
}
async function advGet(){
  if(!advCur||!advCur.inf||ADV.dl)return;
  const it=advCur.it,inf=advCur.inf,src=ADV_SRC[it.sid.split(':')[0]];
  if(advOnShelf(it.sid)){advRead();return;}
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  ADV.dl=true;
  const btn=el('advGet'),prog=function(t){if(btn){btn.disabled=true;btn.textContent=t;}};
  try{
    let r;
    try{r=await src.get(it,prog,inf);}
    catch(e){
      if(e&&e.nocors){inf.nocors=true;if(advCur&&advCur.it===it)advSheet(it,src,inf);return;}
      console.warn('[rq] adv get',e);
      if(e&&e.pct!==undefined){inf.partial=e.pct;flashMsg('Скачивание прервалось на '+e.pct+' %. Скачанное сохранено: нажмите «Продолжить скачивание», когда будет связь','info');}
      else flashMsg(navigator.onLine===false?'Нет сети. Книга скачается один раз, дальше читается без интернета':'Не удалось скачать книгу: '+(e&&e.message||e),'info');
      if(advCur&&advCur.it===it)advSheet(it,src,inf);return;}
    let b;try{b=await advAddBook(it,src,r);}catch(e){flashMsg('Не удалось добавить книгу: '+(e&&e.message||e),'info');if(advCur&&advCur.it===it)advSheet(it,src,inf);return;}
    el('bookSheet').classList.add('hidden');
    try{advRenderList();}catch(e){}
    openBook(b.id);
  }finally{ADV.dl=false;}
}
/* ---------- оригинал и перевод по абзацам (Джессика 25.10, пункт 6) ----------
   A separate book «<title> · с переводом» (srcId '<sid>#bi', arch.md 25.10): each paragraph, then its Russian translation by the
   phone's own engine (js/translate.js). A translated paragraph starts with U+2063, the reader paints it muted. Up to ADV_BI_MAX words */
const ADV_BI_MAX=25000,ADV_BI_MARK='\u2063';
function advBiLang(it,inf){const l=String(inf&&inf.lang||it.lang||'').slice(0,2).toLowerCase();
  return typeof TR_LANGS==='object'&&typeof trState==='function'&&TR_LANGS[l]&&l!=='ru'?l:'';}
function advBiSid(sid){return sid+'#bi';}
async function advBiPara(t,from,p){
  return String((await Promise.race([t.translate({from:from,to:'ru',text:p,html:false}),
    new Promise(function(a,b){setTimeout(function(){b(new Error('движок перевода не ответил за минуту'));},60000);})])).target.text||'').trim();}
async function advBilingual(r,from,onp){
  const t=await trEngine();
  const toc=(r.toc||[]).filter(function(x){return typeof x.off==='number';}).sort(function(a,b){return a.off-b.off;}),cuts=[0].concat(toc.map(function(x){return x.off;}),[r.text.length]);
  const total=Math.min(ADV_BI_MAX,(r.text.match(/\S+/g)||[]).length)||1;
  let out='',words=0,last=-1;const at=[];
  for(let i=0;i+1<cuts.length;i++){at.push(out.length);
    const ps=r.text.slice(cuts[i],cuts[i+1]).split(/(\n\n+)/);
    for(let j=0;j<ps.length;j++){const p=ps[j];out+=p;
      if(j%2||words>=ADV_BI_MAX||!/\p{L}{2}/u.test(p))continue;
      words+=(p.match(/\S+/g)||[]).length;
      const tr=await advBiPara(t,from,p.trim());
      if(tr)out+='\n\n'+ADV_BI_MARK+tr;
      const pc=Math.min(100,Math.round(words/total*100));if(pc!==last){last=pc;onp(pc);}}}
  toc.forEach(function(x,i){x.off=at[i+1];});
  r.text=out;r.lang=from;r.bi=words>=ADV_BI_MAX?'part':'all';
}
async function advGetBi(){
  if(!advCur||!advCur.inf||ADV.dl)return;
  const it=advCur.it,inf=advCur.inf,src=ADV_SRC[it.sid.split(':')[0]],from=advBiLang(it,inf);if(!from)return;
  if(window.__rqWriter&&!window.__rqWriter.mayWrite()){flashMsg('Книга открыта в другом окне','info');return;}
  ADV.dl=true;
  const prog=function(t){const btn=el('advGetBi');if(btn){btn.disabled=true;btn.textContent=t;}};
  try{
    prog('Проверяю пакет языка…');
    const st=await trState(from,'ru');
    if(!st.path){flashMsg('Для этого языка пока нет пакета перевода','info');return;}
    if(!st.have)await trDownload(st.path,function(x){prog('Пакет языка · '+Math.round(x*100)+' %');});
    const r=await src.get(it,prog,inf);
    prog('Перевожу…');
    await advBilingual(r,from,function(pc){prog('Перевожу · '+pc+' %');});
    r.title=(r.title||it.t)+' · с переводом';r.done=null;
    const b=await advAddBook(Object.assign({},it,{sid:advBiSid(it.sid)}),src,r);
    el('bookSheet').classList.add('hidden');
    try{advRenderList();}catch(e){}
    openBook(b.id);
    if(r.bi==='part')flashMsg('Переведены первые '+(ADV_BI_MAX/1000)+' тысяч слов, дальше книга в оригинале','info');
  }catch(e){console.warn('[rq] adv bilingual',e);
    flashMsg(navigator.onLine===false?'Нет сети. Книга и пакет языка скачиваются один раз, дальше всё работает без интернета':'Не получилось сделать книгу с переводом: '+(e&&e.message||e),'info');
    if(advCur&&advCur.it===it)advSheet(it,src,inf);}
  finally{ADV.dl=false;}
}
if(el('advQ')){el('advQ').addEventListener('input',advInput);el('advQ').addEventListener('keydown',function(e){if(e.key==='Enter'){clearTimeout(advT);ADV.q=el('advQ').value;advSugHide();advSearch();el('advQ').blur();}else if(e.key==='Escape')advSugHide();});}
