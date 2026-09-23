import {writeFileSync,mkdirSync} from 'node:fs';
const directory='public/datasets';mkdirSync(directory,{recursive:true});
const save=(name,value)=>writeFileSync(`${directory}/${name}`,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const date=(day)=>new Date(Date.UTC(2026,7,1+day)).toISOString().slice(0,10);
const cafe=['date,hour,item,quantity,unit_price_kzt,unit_cost_kzt,ingredients,allergens'];
const dishes=[['Latte',1200,400,'coffee;milk','milk'],['Americano',800,200,'coffee','none'],['Croissant',900,300,'wheat;butter;egg','gluten;milk;egg'],['Salad',1800,700,'tomato;cucumber;olive_oil','none'],['Sandwich',1600,600,'bread;cheese;tomato','gluten;milk']];
const shop=['date,product,category,city,quantity,unit_price_kzt,unit_cost_kzt'];
const products=[['Notebook','Stationery',650,250],['Pen','Stationery',200,70],['Backpack','Accessories',14000,7500],['Bottle','Accessories',3500,1700],['Planner','Stationery',2400,1000],['Pencil','Stationery',150,50],['Lamp','Electronics',7500,3900],['USB_drive','Electronics',4200,1900]];
const campus=['date,building,kwh,visitors,recycled_kg'];
for(let day=0;day<56;day++){
 for(let item=0;item<dishes.length;item++)for(const hour of [8,10,12,14,16,18]){const [name,price,cost,ingredients,allergens]=dishes[item];const qty=3+(day*7+item*3+hour)%12+(hour===12?10:0);cafe.push([date(day),hour,name,qty,price,cost,ingredients,allergens].join(','));}
 for(let item=0;item<products.length;item++){const [name,category,price,cost]=products[item];shop.push([date(day),name,category,['Almaty','Astana'][day%2],2+(day*3+item*7)%14,price,cost].join(','));}
 for(let b=0;b<3;b++)campus.push([date(day),['Library','Lab','Dormitory'][b],180+b*140+(day*19)%120+(day===35&&b===1?600:0),40+(day*13+b*23)%160,5+(day*3+b)%18].join(','));
}
save('cafe-sales.csv',cafe.join('\n')+'\n');save('shop-sales.csv',shop.join('\n')+'\n');save('campus.csv',campus.join('\n')+'\n');
save('courses.json',{isSynthetic:true,description:'Учебные курсы и обезличенные вымышленные события прохождения. Все идентификаторы синтетические.',courses:['Python с нуля','Основы SQL','Веб-интерфейсы','Аналитика данных','UX-исследования','Проектная практика'].map((title,i)=>({id:`course-${i+1}`,title,topics:['Введение','Основы','Практика','Самостоятельная работа','Проект'],estimatedHours:12+i*3,students:Array.from({length:24},(_,s)=>({id:`synthetic-student-${s+1}`,completedModules:(s+i)%6,daysSinceLastVisit:(s*3+i)%25,quizScore:40+(s*7+i*9)%61}))}))});
save('library.json',{isSynthetic:true,description:'Вымышленный каталог для учебных проектов; это не реальные сведения о книгах или читателях.',books:Array.from({length:30},(_,i)=>({id:`book-${i+1}`,title:`${['Основы Python','Математика в проектах','Дизайн интерфейсов','Понимание данных','Экология кампуса'][i%5]}: учебный пример ${Math.floor(i/5)+1}`,author:`Учебный автор ${i%7+1}`,subject:['Programming','Math','Design','Data','Ecology'][i%5],copies:2+i%4,available:i%3,loansLastMonth:5+(i*7)%60}))});
save('README.md',`# Учебные данные Alem Practice

Все записи синтетические. Они сгенерированы детерминированно и не описывают реальных людей, компании или продажи. Валюта в sales-файлах — KZT, энергия — kWh, масса — kg.

- cafe-sales.csv: 1680 продаж по дням, часам и блюдам; состав и аллергены — учебные метки, не рекомендации по питанию.
- shop-sales.csv: 448 наблюдений продаж 8 товаров за 56 дней, цены и себестоимость.
- campus.csv: 168 наблюдений потребления энергии, посещаемости и переработки; одна искусственная аномалия.
- courses.json: 6 вымышленных курсов и 144 записи о прохождении.
- library.json: 30 вымышленных книг с остатками и числом выдач.

Это стартовые наборы, а не доказательство качества ML-модели. Добавляйте граничные случаи, фиксируйте ограничения и разделяйте данные по времени для оценки прогнозов.

Повторная генерация: node scripts/generate-datasets.mjs.
`);
console.log('Созданы 5 синтетических наборов и описание полей.');
