// Страница для проверки «улучшений раскладчика» (web.test.mjs, раздел 16): жирный, курсив, ссылки, таблицы, формулы, сноски, продолжение на 2-й странице.
const L = (n) => 'Это длинный абзац статьи номер ' + n + ': в нём больше ста сорока знаков, чтобы раскладчик понял, что перед ним основной текст, а не подпись, меню или счётчик просмотров под заголовком.';
export const RICH = `<html lang="ru"><head><title>Как устроена память | Журнал «Полка»</title><meta property="og:site_name" content="Журнал «Полка»"></head><body>
<div class="top"><a href="/">Главная</a> <a href="/news">Новости</a> <a href="/blog">Блоги</a> <a href="/about">О нас</a></div>
<article><h1>Как устроена память</h1>
<p>Память делится на <b>кратковременную</b> и <i>долговременную</i>, об этом писал <a href="/people/ebbinghaus">Герман Эббингауз</a> ещё в 1885 году<sup><a href="#fn1">1</a></sup>. ${L(1)}</p>
<img src="https://img.example/nocors.png" width="900" height="480" alt="Схема">
<h2>Кривая забывания</h2>
<p>Доля запомненного падает по формуле <span class="katex"><span class="katex-mathml"><math><semantics><mrow></mrow><annotation encoding="application/x-tex">R=e^{-t/S}</annotation></semantics></math></span><span class="katex-html">R=e−t/S</span></span>, где t — время. ${L(2)}</p>
<span class="katex-display"><span class="katex"><span class="katex-mathml"><math display="block"><semantics><mrow></mrow><annotation encoding="application/x-tex">E=mc^{2}+\\frac{a}{b}</annotation></semantics></math></span><span class="katex-html">E=mc2</span></span></span>
<table><thead><tr><th>Срок</th><th>Помним</th><th>Забыли</th></tr></thead><tbody><tr><td>20 минут</td><td>58 %</td><td>42 %</td></tr><tr><td>1 день</td><td>33 %</td><td>67 %</td></tr><tr><td>1 месяц</td><td>21 %</td><td>79 %</td></tr></tbody></table>
<p>${L(3)} Подробнее в <a href="https://other.example/povtorenie">статье про интервальное повторение</a>.</p>
<h2>Сравнение приёмов</h2>
<table><tr><th>Приём</th><th>Время</th><th>Польза</th><th>Сложность</th><th>Кому</th><th>Когда</th></tr><tr><td>Пересказ</td><td>2 мин</td><td>высокая</td><td>низкая</td><td>всем</td><td>сразу</td></tr><tr><td>Карточки</td><td>10 мин</td><td>высокая</td><td>средняя</td><td>студентам</td><td>через день</td></tr></table>
<p>${L(4)}</p>
<ol class="footnotes"><li id="fn1">Эббингауз Г. О памяти. Лейпциг, 1885. <a href="#fnref1">↩</a></li></ol>
<div class="pager"><a href="/rich?page=2">Далее</a></div>
</article>
<h2>Читайте также</h2><ul><li><a href="/a">Как читать по 50 книг в год</a></li><li><a href="/b">Десять лучших романов осени</a></li></ul></body></html>`;
export const RICH2 = `<html lang="ru"><head><title>Как устроена память, страница 2 | Журнал «Полка»</title></head><body>
<div class="top"><a href="/">Главная</a> <a href="/news">Новости</a> <a href="/blog">Блоги</a> <a href="/about">О нас</a></div>
<article><h1>Как устроена память</h1>
<h2>Что делать читателю</h2>
<p>Вторая страница статьи: ${L(5)}</p><p>${L(6)} Конец второй страницы.</p>
<div class="pager"><a href="/rich">Назад</a></div></article></body></html>`;
export const RICH_MD = 'Title: Статья с таблицей\n\nURL Source: https://closed.example/rich\n\nMarkdown Content:\nСтатья с таблицей\n================\n\n' +
  'В этом абзаце есть **жирное слово**, *курсивное слово* и [ссылка на другую статью](https://closed.example/drugaya). ' + L(1) + '\n\n| Срок | Помним |\n| --- | --- |\n| 20 минут | 58 % |\n| 1 день | 33 % |\n\n' + L(2) + '\n\n$$\nE=mc^{2}\n$$\n\n' + L(3) + '\n\n[>>>](https://closed.example/rich?page=2 "Дальше")\n';
export const RICH_MD2 = 'Title: Статья с таблицей\n\nURL Source: https://closed.example/rich?page=2\n\nMarkdown Content:\nСтатья с таблицей\n================\n\nВторая страница из службы: ' + L(7) + '\n\n' + L(8) + '\n';
